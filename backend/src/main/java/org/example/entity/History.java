package org.example.entity;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.example.util.TimeUtil;

@Entity
@Table(name = "history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class History {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(columnDefinition = "TEXT")
    private String requestDetails;

    @Column(columnDefinition = "TEXT")
    private String responseDetails;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = MapListConverter.class) // Применяем конвертер
    @JsonSerialize
    @JsonDeserialize
    private List<Map<String, Object>> fileContent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HistoryType historyType;

    @Builder.Default
    private LocalDateTime timestamp = TimeUtil.nowMoscow();

    public enum HistoryType {
        FILE_UPLOAD,
        PRICE_ANALYSIS
    }
}