package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.entity.Client;
import org.example.entity.Subscription;
import org.example.repository.ClientRepository;
import org.example.repository.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final ClientRepository clientRepository;
    private final EmailService emailService;

    @Value("${subscription.trial.minutes}")
    private Integer trialMinutes;

    /**
     * Создает trial подписку при регистрации
     */
    @Transactional
    public Subscription createTrialSubscription(String email) {
        // Проверяем, не существует ли уже такая подписка
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
        log.info("Trial подписка создана для: {} до {}", email, expirationDate);
        return subscription;
    }

    /**
     * Проверяет статус подписки клиента
     */
    public SubscriptionStatusDto checkSubscriptionStatus(String email) {
        Subscription subscription = subscriptionRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Подписка не найдена для: " + email));

        LocalDateTime now = LocalDateTime.now();
        boolean isExpired = subscription.getExpirationDate().isBefore(now);

        if (isExpired && subscription.getStatus() == Subscription.SubscriptionStatus.ACTIVE) {
            subscription.setStatus(Subscription.SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(subscription);
        }

        return SubscriptionStatusDto.builder()
                .email(email)
                .status(subscription.getStatus().toString())
                .expirationDate(subscription.getExpirationDate())
                .isExpired(isExpired)
                .minutesRemaining(calculateMinutesRemaining(subscription.getExpirationDate()))
                .build();
    }

    /**
     * Выдает подписку на определенное время (для владельцев)
     */
    @Transactional
    public void grantSubscription(String email, Integer minutesToAdd) {
        Subscription subscription = subscriptionRepository.findByEmail(email)
                .orElseGet(() -> createNewSubscription(email));

        LocalDateTime newExpirationDate = LocalDateTime.now().plusMinutes(minutesToAdd);
        subscription.setExpirationDate(newExpirationDate);
        subscription.setStatus(Subscription.SubscriptionStatus.ACTIVE);
        subscription.setRenewalCount(subscription.getRenewalCount() + 1);
        subscription.setUpdatedAt(LocalDateTime.now());

        subscriptionRepository.save(subscription);

        // Обновляем клиента в системе
        var client = clientRepository.findByEmail(email);
        if (client.isPresent()) {
            Client c = client.get();
            c.setSubscriptionExpiredAt(newExpirationDate);
            c.setSubscriptionStatus(Client.SubscriptionStatus.ACTIVE);
            clientRepository.save(c);
        }

        emailService.sendSubscriptionGrantedNotification(email, newExpirationDate.toString());
        log.info("Подписка выдана для: {} до {}", email, newExpirationDate);
    }

    /**
     * Запрос подписки (отправляет документ владельцам)
     */
    public void requestSubscription(String email, String fileName, MultipartFile file) {
        emailService.sendSubscriptionRequestToOwners(email, fileName, file);
        log.info("Запрос подписки отправлен владельцам для: {}", email);
    }

    /**
     * Отзывает подписку (устанавливает статус EXPIRED, но не удаляет клиента)
     */
    @Transactional
    public void revokeSubscription(String email) {
        // Получаем подписку
        Subscription subscription = subscriptionRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Подписка не найдена для: " + email));

        // Устанавливаем статус EXPIRED и обнуляем дату истечения
        subscription.setStatus(Subscription.SubscriptionStatus.EXPIRED);
        subscription.setExpirationDate(LocalDateTime.now());
        subscription.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        // Получаем клиента и обновляем его статус подписки
        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Клиент не найден для: " + email));
        
        client.setSubscriptionStatus(Client.SubscriptionStatus.EXPIRED);
        client.setSubscriptionExpiredAt(LocalDateTime.now());
        clientRepository.save(client);

        emailService.sendSubscriptionRevokedNotification(email);

        log.info("Подписка отозвана для: {}", email);
    }

    /**
     * Проверяет, активна ли подписка пользователя
     */
    public boolean isSubscriptionActive(String email) {
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

    /**
     * Получить время жизни подписки (в минутах)
     */
    public Integer getTrialMinutes() {
        return trialMinutes;
    }

    // Вспомогательные методы

    private Subscription createNewSubscription(String email) {
        LocalDateTime expirationDate = LocalDateTime.now().plusDays(1);
        return Subscription.builder()
                .email(email)
                .expirationDate(expirationDate)
                .status(Subscription.SubscriptionStatus.PENDING)
                .build();
    }

    private Integer calculateMinutesRemaining(LocalDateTime expirationDate) {
        LocalDateTime now = LocalDateTime.now();
        if (expirationDate.isBefore(now)) {
            return 0;
        }
        return (int) java.time.temporal.ChronoUnit.MINUTES.between(now, expirationDate);
    }

    // DTOs

    public static class SubscriptionStatusDto {
        private String email;
        private String status;
        private LocalDateTime expirationDate;
        private Boolean isExpired;
        private Integer minutesRemaining;

        public SubscriptionStatusDto(String email, String status, LocalDateTime expirationDate, Boolean isExpired, Integer minutesRemaining) {
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
