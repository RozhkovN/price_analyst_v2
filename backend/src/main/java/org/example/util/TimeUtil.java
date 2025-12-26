package org.example.util;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Utility класс для работы со временем в московской TimeZone
 */
public class TimeUtil {
    private static final ZoneId MOSCOW_ZONE = ZoneId.of("Europe/Moscow");

    /**
     * Получить текущее время в московской TimeZone
     */
    public static LocalDateTime nowMoscow() {
        return LocalDateTime.now(MOSCOW_ZONE);
    }
}
