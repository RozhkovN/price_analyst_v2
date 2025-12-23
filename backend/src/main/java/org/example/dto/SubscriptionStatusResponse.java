package org.example.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionStatusResponse {
    private String email;
    private String status;
    private LocalDateTime expirationDate;
    private Boolean isExpired;
    private Integer minutesRemaining;
}
