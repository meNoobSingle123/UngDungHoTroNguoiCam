package com.nguoicam.api.cards;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedOpRepository extends JpaRepository<ProcessedOpEntity, UUID> {

  Optional<ProcessedOpEntity> findByOpIdAndUserId(UUID opId, UUID userId);

  boolean existsByOpIdAndUserIdNot(UUID opId, UUID userId);

  void deleteByUserId(UUID userId);
}

