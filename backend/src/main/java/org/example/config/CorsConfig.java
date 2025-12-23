// config/CorsConfig.java
package org.example.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${spring.mvc.cors.allowed-origins:*}")
    private String allowedOrigins;

    @Value("${spring.mvc.cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS,PATCH}")
    private String allowedMethods;

    @Value("${spring.mvc.cors.allowed-headers:*}")
    private String allowedHeaders;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = "*".equals(allowedOrigins) 
            ? Arrays.asList("*") 
            : Arrays.asList(allowedOrigins.split(","));
        
        List<String> methods = Arrays.asList(allowedMethods.split(","));
        List<String> headers = "*".equals(allowedHeaders) 
            ? Arrays.asList("*") 
            : Arrays.asList(allowedHeaders.split(","));

        registry.addMapping("/**")
                .allowedOrigins(origins.toArray(new String[0]))
                .allowedMethods(methods.toArray(new String[0]))
                .allowedHeaders(headers.toArray(new String[0]))
                .allowCredentials(false)
                .maxAge(3600);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = "*".equals(allowedOrigins) 
            ? Arrays.asList("*") 
            : Arrays.asList(allowedOrigins.split(","));
        
        List<String> methods = Arrays.asList(allowedMethods.split(","));
        List<String> headers = "*".equals(allowedHeaders) 
            ? Arrays.asList("*") 
            : Arrays.asList(allowedHeaders.split(","));
        
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(methods);
        configuration.setAllowedHeaders(headers);
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}