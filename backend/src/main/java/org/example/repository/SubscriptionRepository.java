package org.example.repository;

import org.example.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByEmail(String email);

    @Query("SELECT s FROM Subscription s WHERE s.expirationDate <= :now AND s.status = 'ACTIVE'")
    List<Subscription> findExpiredSubscriptions(LocalDateTime now);

    @Query("SELECT s FROM Subscription s WHERE s.status = 'PENDING' AND s.createdAt < :cutoffTime")
    List<Subscription> findExpiredPendingSubscriptions(LocalDateTime cutoffTime);

    boolean existsByEmail(String email);
}
