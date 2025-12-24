package org.example.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        // HTTPS сервер (production)
        Server httpsServer = new Server();
        httpsServer.setUrl("https://supplyx.ru");
        httpsServer.setDescription("Production HTTPS Server");

        // HTTP сервер (для локальной разработки)
        Server httpServer = new Server();
        httpServer.setUrl("http://localhost:8400");
        httpServer.setDescription("Local Development Server");

        return new OpenAPI()
                .servers(List.of(httpsServer, httpServer))
                .info(new Info()
                        .title("Price Analysis Service API")
                        .version("1.0")
                        .description("API для сервиса анализа лучших цен. CORS настроен для всех доменов.")
                        .contact(new Contact()
                                .name("Support Team")
                                .email("support@priceservice.com")))
                // Добавляем security scheme (Bearer JWT)
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                // Применяем схему глобально (кнопка Authorize появится для всех эндпоинтов)
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
