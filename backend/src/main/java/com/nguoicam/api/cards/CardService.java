package com.nguoicam.api.cards;

import com.nguoicam.api.cards.CardDtos.CardDto;
import com.nguoicam.api.cards.CardDtos.CardOp;
import com.nguoicam.api.cards.CardDtos.CardPage;
import com.nguoicam.api.cards.CardDtos.SyncResponse;
import com.nguoicam.api.cards.CardDtos.SyncResultItem;
import com.nguoicam.api.cards.CardDtos.SyncStatus;
import com.nguoicam.api.user.UserEntity;
import com.nguoicam.api.user.UserService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CardService {

  private final UserService userService;
  private final CardRepository cardRepository;
  private final ProcessedOpRepository processedOpRepository;

  public CardService(
      UserService userService,
      CardRepository cardRepository,
      ProcessedOpRepository processedOpRepository
  ) {
    this.userService = userService;
    this.cardRepository = cardRepository;
    this.processedOpRepository = processedOpRepository;
  }

  @Transactional
  public CardPage pullCards(String firebaseUid, long since, int limit) {
    UserEntity user = userService.getOrCreateByFirebaseUid(firebaseUid);
    List<CardEntity> entities = cardRepository.findByUserIdAndSeqGreaterThanOrderBySeqAsc(
        user.getId(),
        since,
        PageRequest.of(0, limit)
    );
    List<CardDto> items = entities.stream().map(CardDto::from).toList();
    long nextCursor = items.isEmpty() ? since : items.getLast().seq();
    return new CardPage(items, nextCursor);
  }

  @Transactional
  public SyncResponse pushCards(String firebaseUid, List<CardOp> ops) {
    UserEntity user = userService.getOrCreateByFirebaseUid(firebaseUid);
    UUID userId = user.getId();
    List<SyncResultItem> results = new ArrayList<>(ops.size());

    for (CardOp op : ops) {
      if (processedOpRepository.existsByOpIdAndUserIdNot(op.opId(), userId)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Operation belongs to another user");
      }

      if (cardRepository.existsByIdAndUserIdNot(op.id(), userId)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Card belongs to another user");
      }

      if (processedOpRepository.findByOpIdAndUserId(op.opId(), userId).isPresent()) {
        CardDto current = cardRepository.findByIdAndUserId(op.id(), userId)
            .map(CardDto::from)
            .orElse(null);
        results.add(new SyncResultItem(op.opId(), SyncStatus.DUPLICATE, current));
        continue;
      }

      CardEntity savedOrExisting = cardRepository.findByIdAndUserId(op.id(), userId)
          .orElse(null);

      SyncStatus status;
      CardDto resultItem;

      if (savedOrExisting == null) {
        long seq = cardRepository.nextSeq();
        CardEntity created = new CardEntity(
            op.id(),
            userId,
            op.content(),
            op.topic(),
            op.icon(),
            Boolean.TRUE.equals(op.pinned()),
            op.updatedAt(),
            Boolean.TRUE.equals(op.deleted()),
            seq
        );
        CardEntity persisted = cardRepository.saveAndFlush(created);
        status = SyncStatus.APPLIED;
        resultItem = CardDto.from(persisted);
      } else if (op.updatedAt().isAfter(savedOrExisting.getUpdatedAt())) {
        long seq = cardRepository.nextSeq();
        savedOrExisting.setContent(op.content());
        savedOrExisting.setTopic(op.topic());
        savedOrExisting.setIcon(op.icon());
        savedOrExisting.setPinned(Boolean.TRUE.equals(op.pinned()));
        savedOrExisting.setUpdatedAt(op.updatedAt());
        savedOrExisting.setDeleted(Boolean.TRUE.equals(op.deleted()));
        savedOrExisting.setSeq(seq);
        CardEntity updated = cardRepository.saveAndFlush(savedOrExisting);
        status = SyncStatus.APPLIED;
        resultItem = CardDto.from(updated);
      } else {
        status = SyncStatus.SERVER_WINS;
        resultItem = CardDto.from(savedOrExisting);
      }

      processedOpRepository.save(new ProcessedOpEntity(op.opId(), userId));
      results.add(new SyncResultItem(op.opId(), status, resultItem));
    }

    return new SyncResponse(results);
  }
}

