package com.nguoicam.api.cards;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CardRepository extends JpaRepository<CardEntity, UUID> {

  List<CardEntity> findByUserIdAndSeqGreaterThanOrderBySeqAsc(
      UUID userId,
      long seq,
      Pageable pageable
  );

  Optional<CardEntity> findByIdAndUserId(UUID id, UUID userId);

  boolean existsByIdAndUserIdNot(UUID id, UUID userId);

  @Query(value = "SELECT nextval('card_seq')", nativeQuery = true)
  long nextSeq();
}

