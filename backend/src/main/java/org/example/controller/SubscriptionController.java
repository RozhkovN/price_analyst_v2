package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.GrantSubscriptionRequest;
import org.example.dto.SubscriptionStatusResponse;
import org.example.repository.ClientRepository;
import org.example.service.SubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final ClientRepository clientRepository;

    @GetMapping("/check")
    public ResponseEntity<SubscriptionStatusResponse> checkSubscription(
            @RequestParam(required = false) String email) {
        try {
            String targetEmail;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
            
            if (email != null) {
                if (!isAdmin) {
                    log.warn("User {} tried to check other user's subscription but is not ADMIN", auth.getName());
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
                targetEmail = email;
            } else {
                String phone = auth.getName();
                var client = clientRepository.findByPhone(phone);
                if (client.isEmpty()) {
                    log.error("Client not found for phone: {}", phone);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
                }
                targetEmail = client.get().getEmail();
            }

            var status = subscriptionService.checkSubscriptionStatus(targetEmail);
            
            SubscriptionStatusResponse response = SubscriptionStatusResponse.builder()
                    .email(status.getEmail())
                    .status(status.getStatus())
                    .expirationDate(status.getExpirationDate())
                    .isExpired(status.getIsExpired())
                    .minutesRemaining(status.getMinutesRemaining())
                    .build();

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Error checking subscription: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error in checkSubscription", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/grant")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> grantSubscription(
            @RequestBody GrantSubscriptionRequest request) {
        try {
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email не может быть пустым"));
            }
            if (request.getMinutesToAdd() == null || request.getMinutesToAdd() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Количество минут должно быть положительным"));
            }

            subscriptionService.grantSubscription(request.getEmail(), request.getMinutesToAdd());

            var status = subscriptionService.checkSubscriptionStatus(request.getEmail());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Подписка выдана успешно");
            response.put("email", request.getEmail());
            response.put("minutesAdded", request.getMinutesToAdd());
            response.put("expirationDate", status.getExpirationDate());
            response.put("minutesRemaining", status.getMinutesRemaining());

            log.info("Подписка выдана: {} на {} минут", request.getEmail(), request.getMinutesToAdd());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Ошибка при выдаче подписки: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/renew")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> renewSubscription(
            @RequestBody GrantSubscriptionRequest request) {
        try {
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email не может быть пустым"));
            }
            if (request.getMinutesToAdd() == null || request.getMinutesToAdd() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Количество минут должно быть положительным"));
            }

            subscriptionService.renewSubscription(request.getEmail(), request.getMinutesToAdd());
            var status = subscriptionService.checkSubscriptionStatus(request.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Подписка продлена успешно");
            response.put("email", request.getEmail());
            response.put("minutesAdded", request.getMinutesToAdd());
            response.put("expirationDate", status.getExpirationDate());
            response.put("minutesRemaining", status.getMinutesRemaining());

            log.info("Подписка продлена: {} на {} минут", request.getEmail(), request.getMinutesToAdd());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Ошибка при продлении подписки: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> revokeSubscription(
            @RequestParam String email) {
        try {
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email не может быть пустым"));
            }

            subscriptionService.revokeSubscription(email);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Подписка отозвана");
            response.put("email", email);

            log.info("Подписка отозвана: {}", email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Ошибка при отзыве подписки: {}", e.getMessage());
            
            // Специальная обработка для админа
            if (e.getMessage().contains("администратора")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/trial-info")
    public ResponseEntity<Map<String, Integer>> getTrialInfo() {
        Map<String, Integer> response = new HashMap<>();
        response.put("trialMinutes", subscriptionService.getTrialMinutes());
        return ResponseEntity.ok(response);
    }
}

