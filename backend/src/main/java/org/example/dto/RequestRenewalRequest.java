package org.example.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestRenewalRequest {
    private String email;
    private String documentFileName;
}
