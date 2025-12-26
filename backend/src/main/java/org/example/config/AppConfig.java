package org.example.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.text.SimpleDateFormat;
import java.util.TimeZone;

@Configuration
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        
        // Устанавливаем TimeZone для московского времени
        TimeZone moscowTimeZone = TimeZone.getTimeZone("Europe/Moscow");
        
        objectMapper.registerModule(new JavaTimeModule());
        
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd.MM.yyyy HH:mm:ss");
        dateFormat.setTimeZone(moscowTimeZone);
        objectMapper.setDateFormat(dateFormat);
        
        // Устанавливаем TimeZone по умолчанию для всех операций с датой/временем
        objectMapper.setTimeZone(moscowTimeZone);
        
        // Разрешаем обработку управляющих символов, автоматически экранируя их
        objectMapper.configure(JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true);
        return objectMapper;
    }
}