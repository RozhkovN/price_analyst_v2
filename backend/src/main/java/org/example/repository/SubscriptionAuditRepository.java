package org.example.repository;

import org.example.entity.SubscriptionAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SubscriptionAuditRepository extends JpaRepository<SubscriptionAudit, Long> {
    List<SubscriptionAudit> findByEmailOrderByTimestampDesc(String email);
    List<SubscriptionAudit> findByEmailAndActionOrderByTimestampDesc(String email, SubscriptionAudit.Action action);
    List<SubscriptionAudit> findByTimestampGreaterThanOrderByTimestampDesc(LocalDateTime timestamp);
}
