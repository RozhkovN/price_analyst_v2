package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from}")
    private String mailFrom;

    @Value("${owner.emails}")
    private String ownerEmails;

    public void sendSubscriptionRequestToOwners(String clientEmail, String fileName, MultipartFile file) {
        try {
            String[] owners = ownerEmails.split(",");
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(owners);
            helper.setSubject("Новый запрос подписки - " + clientEmail);
            String body = String.format(
                "Клиент %s запросил подписку.%n%n" +
                "Файл для рассмотрения: %s%n%n" +
                "Пожалуйста, проверьте документ и предоставьте доступ через API endpoint:%n" +
                "POST /api/subscription/grant",
                clientEmail, fileName
            );
            helper.setText(body);

            if (file != null && !file.isEmpty()) {
                helper.addAttachment(
                    file.getOriginalFilename(),
                    new org.springframework.core.io.ByteArrayResource(file.getBytes())
                );
            }

            mailSender.send(message);
            log.info("Письмо о запросе подписки отправлено владельцам для клиента: {} с файлом: {}", clientEmail, fileName);
        } catch (Exception e) {
            log.error("Ошибка при отправке запроса подписки для клиента: {}", clientEmail, e);
        }
    }
}