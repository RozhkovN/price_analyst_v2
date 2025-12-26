// security/JwtFilter.java
package org.example.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.example.entity.Client;
import org.example.repository.ClientRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

@Slf4j
@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final ClientRepository clientRepository;

    public JwtFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService, ClientRepository clientRepository) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        this.clientRepository = clientRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authorizationHeader = request.getHeader("Authorization");
        String requestUri = request.getRequestURI();

        log.debug("REQUEST: {} | Auth header: {}", requestUri, authorizationHeader != null ? "present" : "missing");

        String token = null;
        String username = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            token = authorizationHeader.substring(7);
            try {
                username = jwtUtil.extractUsername(token);
                log.debug("Extracted username from token: {}", username);
            } catch (Exception e) {
                log.debug("Failed to extract username from token: {}", e.getMessage());
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                // 🔒 Валидируем что это access token
                if (!jwtUtil.validateAccessToken(token)) {
                    log.warn("Invalid or expired access token for: {}", username);
                    filterChain.doFilter(request, response);
                    return;
                }

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                log.debug("UserDetails loaded: {}", userDetails.getUsername());

                if (jwtUtil.validateToken(token, userDetails)) {
                    log.debug("Token validation SUCCESS for: {}", username);
                    
                    // Проверяем статус подписки перед установкой аутентификации
                    if (!isSubscriptionValid(username, request)) {
                        log.warn("Доступ запрещен для {}: подписка истекла", username);
                        response.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\": \"Ваша подписка истекла. Пожалуйста, обновите подписку\"}");
                        return;
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("Аутентификация установлена для: {}", username);
                } else {
                    log.warn("Token validation FAILED for: {}", username);
                }
            } catch (Exception e) {
                log.error("Exception in JwtFilter: {}", e.getMessage(), e);
            }
        } else {
            log.debug("No valid username or already authenticated. URI: {}", requestUri);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Проверяет валидность подписки пользователя
     * Пропускает некоторые endpoints (auth, subscription, swagger)
     */
    private boolean isSubscriptionValid(String username, HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        log.debug("isSubscriptionValid check for: {} | URI: {}", username, requestUri);

        // Пропускаем проверку для открытых endpoints
        if (requestUri.contains("/api/auth/") ||
            requestUri.contains("/api/subscription/") ||
            requestUri.contains("/swagger") ||
            requestUri.contains("/api-docs") ||
            requestUri.contains("/api/profile")) {
            log.debug("Subscription check SKIPPED - excluded endpoint: {}", requestUri);
            return true;
        }

        // Получаем клиента по phone (username = phone)
        var clientOpt = clientRepository.findByPhone(username);
        if (clientOpt.isEmpty()) {
            log.warn("Клиент не найден для username: {}", username);
            return false;
        }

        Client client = clientOpt.get();

        // Админ всегда проходит проверку
        if (client.getRole() == org.example.entity.Role.ADMIN) {
            log.debug("ADMIN access granted without subscription check");
            return true;
        }

        LocalDateTime now = LocalDateTime.now();
        if (client.getSubscriptionExpiredAt() != null && client.getSubscriptionExpiredAt().isBefore(now)) {
            client.setSubscriptionStatus(Client.SubscriptionStatus.EXPIRED);
            clientRepository.save(client);
            log.warn("Подписка истекла для клиента: {} (phone: {})", client.getEmail(), client.getPhone());
            return false;
        }

        log.debug("Subscription is VALID for: {}", username);
        return true;
    }
}