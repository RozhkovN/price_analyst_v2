package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.SubscriptionStatusResponse;
import org.example.repository.SubscriptionRepository;
import org.example.service.HistoryService;
import org.example.service.SubscriptionService;
import org.example.dto.AdminHistoryDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Админ", description = "API для административных функций")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final HistoryService historyService;
    private final SubscriptionService subscriptionService;
    private final SubscriptionRepository subscriptionRepository;

    @GetMapping("/file-upload-history")
    @Operation(summary = "Получить историю загрузок файлов", description = "Возвращает историю загрузок файлов всеми пользователями")
    public ResponseEntity<List<AdminHistoryDto>> getFileUploadHistory() {
        List<AdminHistoryDto> history = historyService.getAllFileUploadHistory();
        return ResponseEntity.ok(history);
    }

    @GetMapping("/subscriptions")
    @Operation(summary = "Получить все подписки", description = "Список всех подписок в системе с их статусами")
    public ResponseEntity<List<SubscriptionStatusResponse>> getAllSubscriptions() {
        try {
            List<SubscriptionStatusResponse> subscriptions = subscriptionRepository.findAll()
                    .stream()
                    .map(sub -> {
                        try {
                            var status = subscriptionService.checkSubscriptionStatus(sub.getEmail());
                            return SubscriptionStatusResponse.builder()
                                    .email(status.getEmail())
                                    .status(status.getStatus())
                                    .expirationDate(status.getExpirationDate())
                                    .isExpired(status.getIsExpired())
                                    .minutesRemaining(status.getMinutesRemaining())
                                    .build();
                        } catch (Exception e) {
                            log.error("Ошибка при получении статуса подписки для {}: {}", sub.getEmail(), e.getMessage());
                            return null;
                        }
                    })
                    .filter(s -> s != null)
                    .collect(Collectors.toList());

            log.info("Получен список всех подписок: {} записей", subscriptions.size());
            return ResponseEntity.ok(subscriptions);
        } catch (Exception e) {
            log.error("Ошибка при получении списка подписок: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}