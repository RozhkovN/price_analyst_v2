package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
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

    @Value("${support.email}")
    private String supportEmail;

    /**
     * Отправляет уведомление владельцам о запросе подписки с вложенным файлом
     */
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
                "POST /api/subscription/grant%n%n" +
                "С уважением,%n" +
                "Price Analyst Team",
                clientEmail, fileName
            );
            
            helper.setText(body);
            
            // Добавляем вложение файла
            if (file != null && !file.isEmpty()) {
                helper.addAttachment(
                    file.getOriginalFilename(),
                    new org.springframework.core.io.ByteArrayResource(file.getBytes())
                );
            }
            
            mailSender.send(message);
            
            log.info("Письмо о запросе подписки отправлено владельцам для клиента: {} с файлом: {}", clientEmail, fileName);
        } catch (MessagingException e) {
            log.error("Ошибка при отправке письма о запросе подписки: {}", clientEmail, e);
        } catch (Exception e) {
            log.error("Ошибка при обработке файла для отправки: {}", clientEmail, e);
        }
    }

    /**
     * Отправляет уведомление клиенту о выданной подписке
     */
    public void sendSubscriptionGrantedNotification(String clientEmail, String expirationDate) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(clientEmail);
            message.setSubject("Подписка активирована!");
            
            String body = String.format(
                "Здравствуйте!%n%n" +
                "Ваша подписка успешно активирована.%n" +
                "Дата истечения: %s%n%n" +
                "Спасибо за использование Price Analyst!%n%n" +
                "С уважением,%n" +
                "Price Analyst Team",
                expirationDate
            );
            
            message.setText(body);
            mailSender.send(message);
            
            log.info("Письмо об активации подписки отправлено: {}", clientEmail);
        } catch (Exception e) {
            log.error("Ошибка при отправке письма об активации подписки: {}", clientEmail, e);
        }
    }

    /**
     * Отправляет уведомление о скором истечении подписки
     */
    public void sendSubscriptionExpiringNotification(String clientEmail, String expirationDate) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(clientEmail);
            message.setSubject("Ваша подписка скоро истечет");
            
            String body = String.format(
                "Здравствуйте!%n%n" +
                "Ваша подписка скоро истечет: %s%n%n" +
                "Пожалуйста, обновите подписку, чтобы продолжить использование сервиса.%n" +
                "Свяжитесь с нами: %s%n%n" +
                "С уважением,%n" +
                "Price Analyst Team",
                expirationDate, supportEmail
            );
            
            message.setText(body);
            mailSender.send(message);
            
            log.info("Письмо о приближении истечения подписки отправлено: {}", clientEmail);
        } catch (Exception e) {
            log.error("Ошибка при отправке письма об истечении подписки: {}", clientEmail, e);
        }
    }

    /**
     * Отправляет уведомление о деактивации подписки
     */
    public void sendSubscriptionRevokedNotification(String clientEmail) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(clientEmail);
            message.setSubject("Подписка деактивирована");
            
            String body = String.format(
                "Здравствуйте!%n%n" +
                "Ваша подписка была деактивирована администратором.%n" +
                "Если у вас есть вопросы, свяжитесь с нами: %s%n%n" +
                "С уважением,%n" +
                "Price Analyst Team",
                supportEmail
            );
            
            message.setText(body);
            mailSender.send(message);
            
            log.info("Письмо о деактивации подписки отправлено: {}", clientEmail);
        } catch (Exception e) {
            log.error("Ошибка при отправке письма о деактивации подписки: {}", clientEmail, e);
        }
    }
}
