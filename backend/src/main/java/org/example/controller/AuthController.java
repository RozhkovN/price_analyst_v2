package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.*;
import org.example.entity.Client;
import org.example.service.AuthService;
import org.example.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Аутентификация", description = "API для регистрации, авторизации и управления токенами")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    @Operation(summary = "Регистрация клиента", description = "Регистрация нового клиента в системе")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegistrationRequest request) {
        try {
            Client client = authService.registerClient(request);
            
            String accessToken = jwtUtil.generateAccessToken(client.getPhone());
            String refreshToken = jwtUtil.generateRefreshToken(client.getPhone());
            
            Map<String, Object> response = Map.of(
                "id", client.getId(),
                "fullName", client.getFullName(),
                "phone", client.getPhone(),
                "email", client.getEmail(),
                "role", client.getRole(),
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "expiresIn", jwtUtil.getAccessTokenExpiration()
            );
            
            log.info("User registered successfully: phone={}, email={}", client.getPhone(), client.getEmail());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Registration error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    @Operation(summary = "Авторизация клиента", description = "Авторизация по телефону и паролю")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse loginResponse = authService.login(request);
            
            Map<String, Object> response = Map.of(
                "accessToken", loginResponse.getAccessToken(),
                "refreshToken", loginResponse.getRefreshToken(),
                "role", loginResponse.getRole(),
                "expiresIn", loginResponse.getExpiresIn()
            );
            
            log.info("User logged in successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Login error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    @Operation(summary = "Обновить access token", description = "Получить новый access token используя refresh token")
    public ResponseEntity<Map<String, Object>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            LoginResponse response = authService.refreshAccessToken(request.getRefreshToken());
            
            Map<String, Object> result = Map.of(
                "accessToken", response.getAccessToken(),
                "refreshToken", response.getRefreshToken(),
                "role", response.getRole(),
                "expiresIn", response.getExpiresIn()
            );
            
            log.info("Token refreshed successfully");
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.error("Token refresh error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/validate-inn")
    @Operation(summary = "Проверка ИНН", description = "Проверка валидности ИНН")
    public ResponseEntity<Map<String, Boolean>> validateInn(@RequestBody Map<String, String> request) {
        String inn = request.get("inn");
        boolean isValid = authService.validateInn(inn);
        return ResponseEntity.ok(Map.of("valid", isValid));
    }
}