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
            throw new IllegalArgumentException("Неверный формат ИНН");
        }
        if (clientRepository.existsByInn(request.getInn())) {
            throw new IllegalArgumentException("Клиент с таким ИНН уже зарегистрирован");
        }

        String inn = request.getInn().replaceAll("[\\r\\n\\t]", "");
        String fullName = request.getFullName().replaceAll("[\\r\\n\\t]", "");
        String phone = normalizePhone(request.getPhone());
        String email = request.getEmail().replaceAll("[\\r\\n\\t]", "").toLowerCase();
        String password = request.getPassword().replaceAll("[\\r\\n\\t]", "");

        if (phone == null) {
            throw new IllegalArgumentException("Неверный формат телефона");
        }
        if (clientRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("Клиент с таким телефоном уже зарегистрирован");
        }
        if (clientRepository.findByEmail(email).isPresent()) {
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
            throw new IllegalArgumentException("Неверный формат телефона");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(phone, request.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String token = jwtUtil.generateToken(phone);

            // Получаем клиента по телефону и извлекаем роль
            Client client = clientRepository.findByPhone(phone)
                    .orElseThrow(() -> new IllegalArgumentException("Клиент не найден"));
            Role role = client.getRole();

            log.info("Успешная авторизация для телефона: {}, роль: {}", phone, role);
            return new LoginResponse(token, role);
        } catch (BadCredentialsException e) {
            log.warn("Неудачная попытка авторизации для телефона: {}, причина: неверный пароль", phone);
            throw new IllegalArgumentException("Неверный телефон или пароль");
        }
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