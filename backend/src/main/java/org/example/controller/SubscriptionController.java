package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.GrantSubscriptionRequest;
import org.example.dto.RequestRenewalRequest;
import org.example.dto.SubscriptionStatusResponse;
import org.example.repository.ClientRepository;
import org.example.service.SubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final ClientRepository clientRepository;

    /**
     * Проверить статус подписки текущего пользователя
     * GET /api/subscription/check
     */
    @GetMapping("/check")
    public ResponseEntity<SubscriptionStatusResponse> checkSubscription(
            @RequestParam(required = false) String email) {
        try {
            String targetEmail;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
            
            log.debug("checkSubscription called - auth: {}, isAdmin: {}, paramEmail: {}", auth.getName(), isAdmin, email);
            
            if (email != null) {
                // Параметр email может просматривать только ADMIN
                if (!isAdmin) {
                    log.warn("User {} tried to check other user's subscription but is not ADMIN", auth.getName());
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
                targetEmail = email;
            } else {
                // Получаем email из контекста
                // auth.getName() возвращает phone (это username в JWT)
                // Нужно найти email по phone
                String phone = auth.getName();
                log.debug("Looking for email by phone: {}", phone);
                
                var client = clientRepository.findByPhone(phone);
                if (client.isEmpty()) {
                    log.error("Client not found for phone: {}", phone);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
                }
                targetEmail = client.get().getEmail();
                log.debug("Found email: {} for phone: {}", targetEmail, phone);
            }

            var status = subscriptionService.checkSubscriptionStatus(targetEmail);
            
            SubscriptionStatusResponse response = SubscriptionStatusResponse.builder()
                    .email(status.getEmail())
                    .status(status.getStatus())
                    .expirationDate(status.getExpirationDate())
                    .isExpired(status.getIsExpired())
                    .minutesRemaining(status.getMinutesRemaining())
                    .build();

            log.debug("Subscription status returned: {}", response);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Error checking subscription: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error in checkSubscription", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Выдать подписку клиенту (только для ADMIN)
     * POST /api/subscription/grant
     */
    @PostMapping("/grant")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> grantSubscription(
            @RequestBody GrantSubscriptionRequest request) {
        try {
            if (request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            if (request.getMinutesToAdd() == null || request.getMinutesToAdd() <= 0) {
                return ResponseEntity.badRequest().build();
            }

            subscriptionService.grantSubscription(request.getEmail(), request.getMinutesToAdd());

            Map<String, String> response = new HashMap<>();
            response.put("message", "Подписка выдана успешно");
            response.put("email", request.getEmail());
            response.put("minutesAdded", request.getMinutesToAdd().toString());

            log.info("Подписка выдана: {} на {} минут", request.getEmail(), request.getMinutesToAdd());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Ошибка при выдаче подписки: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Запросить подписку (отправить документ владельцам)
     * POST /api/subscription/request-renewal
     */
    @PostMapping(value = "/request-renewal", consumes = "multipart/form-data")
    @Operation(summary = "Запрос подписки", description = "Отправить запрос на продление подписки с документом владельцам")
    public ResponseEntity<Map<String, String>> requestSubscription(
            @Parameter(description = "Email пользователя", required = true)
            @RequestParam("email") String email,
            @Parameter(description = "Word документ с запросом", required = true)
            @RequestParam("file") MultipartFile file) {
        try {
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email не может быть пустым"));
            }

            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Файл не должен быть пустым"));
            }

            // Проверяем расширение файла (Word документы)
            String filename = file.getOriginalFilename();
            if (!filename.endsWith(".docx") && !filename.endsWith(".doc") && !filename.endsWith(".pdf")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Поддерживаются только Word документы (.docx, .doc) или PDF"));
            }

            subscriptionService.requestSubscription(email, file.getOriginalFilename(), file);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Запрос подписки отправлен владельцам");
            response.put("email", email);
            response.put("fileName", file.getOriginalFilename());

            log.info("Запрос подписки отправлен для: {} с файлом: {}", email, file.getOriginalFilename());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Ошибка при отправке запроса подписки: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Ошибка обработки запроса: " + e.getMessage()));
        }
    }

    /**
     * Удалить подписку и клиента (только для ADMIN)
     * DELETE /api/subscription/revoke
     */
    @DeleteMapping("/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> revokeSubscription(
            @RequestParam String email) {
        try {
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            subscriptionService.revokeSubscription(email);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Подписка и клиент удалены");
            response.put("email", email);

            log.info("Подписка и клиент удалены: {}", email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Ошибка при удалении подписки: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Получить информацию о trial периоде
     * GET /api/subscription/trial-info
     */
    @GetMapping("/trial-info")
    public ResponseEntity<Map<String, Integer>> getTrialInfo() {
        Map<String, Integer> response = new HashMap<>();
        response.put("trialMinutes", subscriptionService.getTrialMinutes());
        return ResponseEntity.ok(response);
    }
}
