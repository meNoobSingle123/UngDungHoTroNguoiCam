package com.nguoicam.api.cards;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_ops")
public class ProcessedOpEntity {

  @Id
  @Column(name = "op_id", nullable = false)
  private UUID opId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "applied_at", nullable = false, insertable = false, updatable = false)
  private Instant appliedAt;

  protected ProcessedOpEntity() {}

  public ProcessedOpEntity(UUID opId, UUID userId) {
    this.opId = opId;
    this.userId = userId;
  }

  public UUID getOpId() {
    return opId;
  }

  public UUID getUserId() {
    return userId;
  }

  public Instant getAppliedAt() {
    return appliedAt;
  }
}

