package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.dto.LoginRequest;
import org.example.dto.LoginResponse;
import org.example.dto.RegistrationRequest;
import org.example.entity.Client;
import org.example.entity.Role;
import org.example.repository.ClientRepository;
import org.example.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final SubscriptionService subscriptionService;

    public boolean validateInn(String inn) {
        if (inn == null) return false;
        int length = inn.length();
        if (length != 10 && length != 12) return false;
        return inn.matches("\\d+");
    }

    @Transactional
    public Client registerClient(RegistrationRequest request) {
        if (!validateInn(request.getInn())) {
            log.warn("Registration attempt with invalid INN format: {}", request.getInn());
            throw new IllegalArgumentException("Неверный формат ИНН");
        }
        if (clientRepository.existsByInn(request.getInn())) {
            log.warn("Registration attempt with existing INN: {}", request.getInn());
            throw new IllegalArgumentException("Клиент с таким ИНН уже зарегистрирован");
        }

        String inn = request.getInn().replaceAll("[\\r\\n\\t]", "");
        String fullName = request.getFullName().replaceAll("[\\r\\n\\t]", "");
        String phone = normalizePhone(request.getPhone());
        String email = request.getEmail().replaceAll("[\\r\\n\\t]", "").toLowerCase();
        String address = request.getAddress().replaceAll("[\\r\n\\t]", "").trim();
        String password = request.getPassword().replaceAll("[\\r\\n\\t]", "");

        if (phone == null) {
            log.warn("Registration attempt with invalid phone format: {}", request.getPhone());
            throw new IllegalArgumentException("Неверный формат телефона");
        }
        if (clientRepository.findByPhone(phone).isPresent()) {
            log.warn("Registration attempt with existing phone: {}", phone);
            throw new IllegalArgumentException("Клиент с таким телефоном уже зарегистрирован");
        }
        if (clientRepository.findByEmail(email).isPresent()) {
            log.warn("Registration attempt with existing email: {}", email);
            throw new IllegalArgumentException("Клиент с таким email уже зарегистрирован");
        }

        Role role = clientRepository.count() == 0 ? Role.ADMIN : Role.USER;

        // Создаем trial подписку
        subscriptionService.createTrialSubscription(email);

        // Получаем созданную подписку для установления даты истечения
        var subscription = subscriptionService.checkSubscriptionStatus(email);

        Client client = Client.builder()
                .inn(inn)
                .fullName(fullName)
                .phone(phone)
                .email(email)
                .address(address)
                .password(passwordEncoder.encode(password))
                .role(role)
                .subscriptionExpiredAt(subscription.getExpirationDate())
                .subscriptionStatus(Client.SubscriptionStatus.ACTIVE)
                .build();

        Client savedClient = clientRepository.save(client);
        log.info("Зарегистрирован новый клиент: phone={}, email={}, inn={}, role={}, подписка до: {}", 
                phone, email, inn, role, subscription.getExpirationDate());
        return savedClient;
    }

    public LoginResponse login(LoginRequest request) {
        String phone = normalizePhone(request.getPhone());
        if (phone == null) {
            log.warn("Login attempt with invalid phone format: {}", request.getPhone());
            throw new IllegalArgumentException("Неверный формат телефона");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(phone, request.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            String accessToken = jwtUtil.generateAccessToken(phone);
            String refreshToken = jwtUtil.generateRefreshToken(phone);

            // Получаем клиента по телефону и извлекаем роль
            Client client = clientRepository.findByPhone(phone)
                    .orElseThrow(() -> new IllegalArgumentException("Клиент не найден"));
            Role role = client.getRole();

            log.info("Успешная авторизация для телефона: {}, роль: {}", phone, role);
            return LoginResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .role(role)
                    .expiresIn(jwtUtil.getAccessTokenExpiration())
                    .build();
        } catch (BadCredentialsException e) {
            log.warn("Неудачная попытка авторизации для телефона: {}, причина: неверный пароль", phone);
            throw new IllegalArgumentException("Неверный телефон или пароль");
        }
    }

    /**
     * Обновляет access token используя refresh token
     */
    public LoginResponse refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            log.warn("Refresh token is empty");
            throw new IllegalArgumentException("Refresh token не может быть пустым");
        }

        if (!jwtUtil.validateRefreshToken(refreshToken)) {
            log.warn("Invalid refresh token");
            throw new IllegalArgumentException("Refresh token недействителен или истек");
        }

        String phone = jwtUtil.extractUsername(refreshToken);
        Client client = clientRepository.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("Клиент не найден"));

        String newAccessToken = jwtUtil.generateAccessToken(phone);
        
        log.info("Токен обновлен для пользователя: {}", phone);
        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken) // возвращаем старый refresh token, он еще валиден
                .role(client.getRole())
                .expiresIn(jwtUtil.getAccessTokenExpiration())
                .build();
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("[\\r\\n\\t\\D]", ""); // Удаляем все нецифровые символы и управляющие
        if (digits.length() == 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
            return "9" + digits.substring(1);
        } else if (digits.length() == 10 && digits.startsWith("9")) {
            return digits;
        }
        return null;
    }
}