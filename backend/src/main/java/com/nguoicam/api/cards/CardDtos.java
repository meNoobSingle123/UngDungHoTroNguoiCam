package com.nguoicam.api.cards;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CardDtos {

  private CardDtos() {}

  public record CardDto(
      UUID id,
      String content,
      String topic,
      String icon,
      boolean pinned,
      Instant updatedAt,
      boolean deleted,
      long seq
  ) {
    public static CardDto from(CardEntity entity) {
      return new CardDto(
          entity.getId(),
          entity.getContent(),
          entity.getTopic(),
          entity.getIcon(),
          entity.isPinned(),
          entity.getUpdatedAt(),
          entity.isDeleted(),
          entity.getSeq()
      );
    }
  }

  public record CardPage(
      List<CardDto> items,
      long nextCursor
  ) {}

  public record CardOp(
      @NotNull UUID id,
      @NotNull @Size(max = 140) String content,
      String topic,
      String icon,
      Boolean pinned,
      @NotNull Instant updatedAt,
      @NotNull Boolean deleted,
      Long seq,
      @NotNull UUID opId
  ) {}

  public record SyncRequest(
      @NotNull @Size(max = 500) List<@Valid CardOp> ops
  ) {}

  public enum SyncStatus {
    APPLIED,
    DUPLICATE,
    SERVER_WINS
  }

  public record SyncResultItem(
      UUID opId,
      SyncStatus status,
      CardDto item
  ) {}

  public record SyncResponse(
      List<SyncResultItem> results
  ) {}
}

