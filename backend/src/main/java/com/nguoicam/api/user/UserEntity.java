package com.nguoicam.api.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {

  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "firebase_uid", nullable = false, unique = true)
  private String firebaseUid;

  @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
  private Instant createdAt;

  protected UserEntity() {}

  public UserEntity(UUID id, String firebaseUid) {
    this.id = id;
    this.firebaseUid = firebaseUid;
  }

  public UUID getId() {
    return id;
  }

  public String getFirebaseUid() {
    return firebaseUid;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

