package org.example.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrantSubscriptionRequest {
    private String email;
    private Integer minutesToAdd;
}
