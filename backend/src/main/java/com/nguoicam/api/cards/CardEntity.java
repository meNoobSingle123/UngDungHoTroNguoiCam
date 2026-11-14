package com.nguoicam.api.cards;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "cards")
public class CardEntity implements Persistable<UUID> {

  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "content", nullable = false, length = 140)
  private String content;

  @Column(name = "topic")
  private String topic;

  @Column(name = "icon")
  private String icon;

  @Column(name = "pinned", nullable = false)
  private boolean pinned;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(name = "deleted", nullable = false)
  private boolean deleted;

  @Column(name = "seq", nullable = false)
  private long seq;

  @Transient
  private boolean isNew = false;

  protected CardEntity() {}

  public CardEntity(
      UUID id,
      UUID userId,
      String content,
      String topic,
      String icon,
      boolean pinned,
      Instant updatedAt,
      boolean deleted,
      long seq
  ) {
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.topic = topic;
    this.icon = icon;
    this.pinned = pinned;
    this.updatedAt = updatedAt;
    this.deleted = deleted;
    this.seq = seq;
    this.isNew = true;
  }

  @Override
  public UUID getId() {
    return id;
  }

  @Override
  public boolean isNew() {
    return isNew;
  }

  @PostLoad
  @PostPersist
  void markNotNew() {
    this.isNew = false;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public String getTopic() {
    return topic;
  }

  public void setTopic(String topic) {
    this.topic = topic;
  }

  public String getIcon() {
    return icon;
  }

  public void setIcon(String icon) {
    this.icon = icon;
  }

  public boolean isPinned() {
    return pinned;
  }

  public void setPinned(boolean pinned) {
    this.pinned = pinned;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }

  public boolean isDeleted() {
    return deleted;
  }

  public void setDeleted(boolean deleted) {
    this.deleted = deleted;
  }

  public long getSeq() {
    return seq;
  }

  public void setSeq(long seq) {
    this.seq = seq;
  }
}

