package com.nguoicam.api.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "settings")
public class SettingsEntity {

  @Id
  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "data", nullable = false, columnDefinition = "jsonb")
  private SettingsDto data;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected SettingsEntity() {}

  public SettingsEntity(UUID userId, SettingsDto data, Instant updatedAt) {
    this.userId = userId;
    this.data = data;
    this.updatedAt = updatedAt;
  }

  public UUID getUserId() {
    return userId;
  }

  public SettingsDto getData() {
    return data;
  }

  public void setData(SettingsDto data) {
    this.data = data;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}

