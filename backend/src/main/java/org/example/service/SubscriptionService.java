package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.entity.*;
import org.example.repository.ClientRepository;
import org.example.repository.SubscriptionAuditRepository;
import org.example.repository.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final ClientRepository clientRepository;
    private final SubscriptionAuditRepository auditRepository;

    @Value("${subscription.trial.minutes}")
    private Integer trialMinutes;

    @Transactional
    public Subscription createTrialSubscription(String email) {
        if (subscriptionRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Подписка для этой почты уже существует");
        }
        LocalDateTime expirationDate = LocalDateTime.now().plusMinutes(trialMinutes);
        Subscription subscription = Subscription.builder()
            .email(email)
            .expirationDate(expirationDate)
            .status(Subscription.SubscriptionStatus.ACTIVE)
            .renewalCount(0)
            .build();
        subscriptionRepository.save(subscription);
        logAudit(email, SubscriptionAudit.Action.CREATE_TRIAL, "Trial подписка на " + trialMinutes + " минут");
        log.info("Trial подписка создана для: {} до {}", email, expirationDate);
        return subscription;
    }

    public SubscriptionStatusDto checkSubscriptionStatus(String email) {
        Subscription subscription = subscriptionRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Подписка не найдена для: " + email));
        
        // 🔑 АДМИН имеет бесконечную подписку
        var client = clientRepository.findByEmail(email);
        if (client.isPresent() && client.get().getRole() == Role.ADMIN) {
            LocalDateTime futureDate = LocalDateTime.now().plusYears(100);
            logAudit(email, SubscriptionAudit.Action.CHECK, "Проверка статуса админа (бесконечная подписка)");
            return SubscriptionStatusDto.builder()
                .email(email)
                .status(Subscription.SubscriptionStatus.ACTIVE.toString())
                .expirationDate(futureDate)
                .isExpired(false)
                .minutesRemaining(Integer.MAX_VALUE)
                .build();
        }
        
        LocalDateTime now = LocalDateTime.now();
        boolean isExpired = subscription.getExpirationDate().isBefore(now);
        if (isExpired && subscription.getStatus() == Subscription.SubscriptionStatus.ACTIVE) {
            subscription.setStatus(Subscription.SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(subscription);
            logAudit(email, SubscriptionAudit.Action.EXPIRE, "Подписка автоматически истекла");
        }
        
        logAudit(email, SubscriptionAudit.Action.CHECK, "Проверка статуса. Статус: " + subscription.getStatus());
        return SubscriptionStatusDto.builder()
            .email(email)
            .status(subscription.getStatus().toString())
            .expirationDate(subscription.getExpirationDate())
            .isExpired(isExpired)
            .minutesRemaining(calculateMinutesRemaining(subscription.getExpirationDate()))
            .build();
    }

    @Transactional
    public void grantSubscription(String email, Integer minutesToAdd) {
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("Email не может быть пустым");
        }
        if (minutesToAdd == null || minutesToAdd <= 0) {
            throw new IllegalArgumentException("Количество минут должно быть положительным");
        }

        Subscription subscription = subscriptionRepository.findByEmail(email)
            .orElseGet(() -> {
                Subscription newSub = createNewSubscription(email);
                subscriptionRepository.save(newSub);
                return newSub;
            });

        LocalDateTime newExpirationDate = LocalDateTime.now().plusMinutes(minutesToAdd);
        subscription.setExpirationDate(newExpirationDate);
        subscription.setStatus(Subscription.SubscriptionStatus.ACTIVE);
        subscription.setRenewalCount(subscription.getRenewalCount() + 1);
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        var client = clientRepository.findByEmail(email);
        if (client.isPresent()) {
            Client c = client.get();
            c.setSubscriptionExpiredAt(newExpirationDate);
            c.setSubscriptionStatus(Client.SubscriptionStatus.ACTIVE);
            clientRepository.save(c);
        }

        logAudit(email, SubscriptionAudit.Action.GRANT, 
            "Выдано " + minutesToAdd + " минут. Истекает: " + newExpirationDate + ". Количество продлений: " + subscription.getRenewalCount());
        log.info("Подписка выдана для: {} на {} минут до {}", email, minutesToAdd, newExpirationDate);
    }

    @Transactional
    public void revokeSubscription(String email) {
        Subscription subscription = subscriptionRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Подписка не найдена для: " + email));

        Client client = clientRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Клиент не найден для: " + email));
        
        // 🔒 КРИТИЧНО: Защита от отзыва подписки админа
        if (client.getRole() == Role.ADMIN) {
            log.warn("⚠️  Попытка отозвать подписку администратора: {}", email);
            throw new IllegalArgumentException("Невозможно отозвать подписку администратора");
        }

        subscription.setStatus(Subscription.SubscriptionStatus.EXPIRED);
        subscription.setExpirationDate(LocalDateTime.now());
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        client.setSubscriptionStatus(Client.SubscriptionStatus.EXPIRED);
        client.setSubscriptionExpiredAt(LocalDateTime.now());
        clientRepository.save(client);

        logAudit(email, SubscriptionAudit.Action.REVOKE, "Подписка и клиент удалены администратором");
        log.info("Подписка отозвана для: {}", email);
    }

    @Transactional
    public void renewSubscription(String email, Integer minutesToAdd) {
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("Email не может быть пустым");
        }
        if (minutesToAdd == null || minutesToAdd <= 0) {
            throw new IllegalArgumentException("Количество минут должно быть положительным");
        }

        Subscription subscription = subscriptionRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Подписка не найдена для: " + email));

        LocalDateTime newExpirationDate;
        LocalDateTime now = LocalDateTime.now();
        
        // Если уже истекла - начинаем с нуля, иначе добавляем к оставшемуся времени
        if (subscription.getExpirationDate().isBefore(now)) {
            newExpirationDate = now.plusMinutes(minutesToAdd);
        } else {
            newExpirationDate = subscription.getExpirationDate().plusMinutes(minutesToAdd);
        }

        subscription.setExpirationDate(newExpirationDate);
        subscription.setStatus(Subscription.SubscriptionStatus.ACTIVE);
        subscription.setRenewalCount(subscription.getRenewalCount() + 1);
        subscription.setUpdatedAt(now);
        subscriptionRepository.save(subscription);

        var client = clientRepository.findByEmail(email);
        if (client.isPresent()) {
            Client c = client.get();
            c.setSubscriptionExpiredAt(newExpirationDate);
            c.setSubscriptionStatus(Client.SubscriptionStatus.ACTIVE);
            clientRepository.save(c);
        }

        logAudit(email, SubscriptionAudit.Action.RENEW, 
            "Продление на " + minutesToAdd + " минут. Истекает: " + newExpirationDate);
        log.info("Подписка продлена для: {} на {} минут до {}", email, minutesToAdd, newExpirationDate);
    }

    public boolean isSubscriptionActive(String email) {
        // 🔑 АДМИН всегда имеет активную подписку
        var client = clientRepository.findByEmail(email);
        if (client.isPresent() && client.get().getRole() == Role.ADMIN) {
            return true;
        }
        
        return subscriptionRepository.findByEmail(email)
            .map(subscription -> {
                boolean isActive = subscription.getStatus() == Subscription.SubscriptionStatus.ACTIVE
                    && subscription.getExpirationDate().isAfter(LocalDateTime.now());
                if (!isActive && subscription.getStatus() == Subscription.SubscriptionStatus.ACTIVE) {
                    subscription.setStatus(Subscription.SubscriptionStatus.EXPIRED);
                    subscriptionRepository.save(subscription);
                }
                return isActive;
            })
            .orElse(false);
    }

    public Integer getTrialMinutes() {
        return trialMinutes;
    }

    @Transactional
    private Subscription createNewSubscription(String email) {
        LocalDateTime expirationDate = LocalDateTime.now().plusMinutes(1);
        Subscription subscription = Subscription.builder()
            .email(email)
            .expirationDate(expirationDate)
            .status(Subscription.SubscriptionStatus.PENDING)
            .build();
        log.warn("⚠️  Создана новая подписка для email: {} через fallback (истекает через 1 минуту)", email);
        return subscription;
    }

    private void logAudit(String email, SubscriptionAudit.Action action, String details) {
        try {
            SubscriptionAudit audit = SubscriptionAudit.builder()
                .email(email)
                .action(action)
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();
            auditRepository.save(audit);
        } catch (Exception e) {
            log.error("Ошибка при сохранении аудита для {}: {}", email, e.getMessage());
        }
    }

    private Integer calculateMinutesRemaining(LocalDateTime expirationDate) {
        LocalDateTime now = LocalDateTime.now();
        if (expirationDate.isBefore(now)) return 0;
        return (int) java.time.temporal.ChronoUnit.MINUTES.between(now, expirationDate);
    }

    // DTO
    public static class SubscriptionStatusDto {
        private String email;
        private String status;
        private LocalDateTime expirationDate;
        private Boolean isExpired;
        private Integer minutesRemaining;

        private SubscriptionStatusDto(String email, String status, LocalDateTime expirationDate,
                                      Boolean isExpired, Integer minutesRemaining) {
            this.email = email;
            this.status = status;
            this.expirationDate = expirationDate;
            this.isExpired = isExpired;
            this.minutesRemaining = minutesRemaining;
        }

        public static Builder builder() {
            return new Builder();
        }

        public String getEmail() { return email; }
        public String getStatus() { return status; }
        public LocalDateTime getExpirationDate() { return expirationDate; }
        public Boolean getIsExpired() { return isExpired; }
        public Integer getMinutesRemaining() { return minutesRemaining; }

        public static class Builder {
            private String email;
            private String status;
            private LocalDateTime expirationDate;
            private Boolean isExpired;
            private Integer minutesRemaining;

            public Builder email(String email) { this.email = email; return this; }
            public Builder status(String status) { this.status = status; return this; }
            public Builder expirationDate(LocalDateTime expirationDate) { this.expirationDate = expirationDate; return this; }
            public Builder isExpired(Boolean isExpired) { this.isExpired = isExpired; return this; }
            public Builder minutesRemaining(Integer minutesRemaining) { this.minutesRemaining = minutesRemaining; return this; }

            public SubscriptionStatusDto build() {
                return new SubscriptionStatusDto(email, status, expirationDate, isExpired, minutesRemaining);
            }
        }
    }
}