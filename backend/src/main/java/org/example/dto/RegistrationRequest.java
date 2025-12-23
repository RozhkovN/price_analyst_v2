// dto/RegistrationRequest.java
package org.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegistrationRequest {

    @NotBlank(message = "ИНН не может быть пустым")
    @Pattern(regexp = "\\d{10}|\\d{12}", message = "ИНН должен содержать 10 или 12 цифр")
    private String inn;

    @NotBlank(message = "ФИО не может быть пустым")
    @Size(min = 5, max = 100, message = "ФИО должно быть от 5 до 100 символов")
    private String fullName;

    @NotBlank(message = "Телефон не может быть пустым")
    @Pattern(regexp = "^\\+?[78][-\\(]?\\d{3}\\)?-?\\d{3}-?\\d{2}-?\\d{2}$",
            message = "Неверный формат телефона")
    private String phone;

    @NotBlank(message = "Email не может быть пустым")
    @Pattern(regexp = "^[A-Za-z0-9+_.-]+@(.+)$", message = "Неверный формат email")
    private String email;

    @NotBlank(message = "Пароль не может быть пустым")
    @Size(min = 6, message = "Пароль должен быть не менее 6 символов")
    private String password;
}