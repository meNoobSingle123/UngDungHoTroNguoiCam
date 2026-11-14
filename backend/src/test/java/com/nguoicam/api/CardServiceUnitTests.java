package com.nguoicam.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nguoicam.api.cards.CardDtos.CardOp;
import com.nguoicam.api.cards.CardDtos.CardPage;
import com.nguoicam.api.cards.CardDtos.SyncResponse;
import com.nguoicam.api.cards.CardDtos.SyncStatus;
import com.nguoicam.api.cards.CardEntity;
import com.nguoicam.api.cards.CardRepository;
import com.nguoicam.api.cards.CardService;
import com.nguoicam.api.cards.ProcessedOpEntity;
import com.nguoicam.api.cards.ProcessedOpRepository;
import com.nguoicam.api.user.UserEntity;
import com.nguoicam.api.user.UserService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CardServiceUnitTests {

  @Mock
  private UserService userService;

  @Mock
  private CardRepository cardRepository;

  @Mock
  private ProcessedOpRepository processedOpRepository;

  private CardService cardService;
  private UUID userId;

  @BeforeEach
  void setUp() {
    cardService = new CardService(userService, cardRepository, processedOpRepository);
    userId = UUID.randomUUID();
    when(userService.getOrCreateByFirebaseUid("uid-a")).thenReturn(new UserEntity(userId, "uid-a"));
  }

  @Test
  void pushCardsAppliesNewCardHandlesDuplicateAndEnforcesServerWins() {
    UUID cardId = UUID.randomUUID();
    UUID op1 = UUID.randomUUID();
    Instant t10 = Instant.parse("2026-11-10T10:00:00Z");

    CardEntity saved = new CardEntity(cardId, userId, "Xin chào", "chao_hoi", "hand", true, t10, false, 42L);
    when(cardRepository.nextSeq()).thenReturn(42L);
    when(cardRepository.saveAndFlush(any())).thenReturn(saved);

    SyncResponse res1 = cardService.pushCards("uid-a", List.of(
        new CardOp(cardId, "Xin chào", "chao_hoi", "hand", true, t10, false, null, op1)
    ));
    assertThat(res1.results()).hasSize(1);
    assertThat(res1.results().getFirst().status()).isEqualTo(SyncStatus.APPLIED);
    assertThat(res1.results().getFirst().item().seq()).isEqualTo(42L);

    when(processedOpRepository.findByOpIdAndUserId(op1, userId))
        .thenReturn(Optional.of(new ProcessedOpEntity(op1, userId)));
    when(cardRepository.findByIdAndUserId(cardId, userId)).thenReturn(Optional.of(saved));

    SyncResponse resDup = cardService.pushCards("uid-a", List.of(
        new CardOp(cardId, "Xin chào", "chao_hoi", "hand", true, t10, false, null, op1)
    ));
    assertThat(resDup.results().getFirst().status()).isEqualTo(SyncStatus.DUPLICATE);

    UUID opStale = UUID.randomUUID();
    Instant t09 = Instant.parse("2026-11-10T09:00:00Z");
    SyncResponse resStale = cardService.pushCards("uid-a", List.of(
        new CardOp(cardId, "Cũ", null, null, false, t09, false, null, opStale)
    ));
    assertThat(resStale.results().getFirst().status()).isEqualTo(SyncStatus.SERVER_WINS);
    assertThat(resStale.results().getFirst().item().content()).isEqualTo("Xin chào");
  }

  @Test
  void pushCardsBlocksCrossUserCardAccessAndPullCardsComputesNextCursor() {
    UUID foreignCardId = UUID.randomUUID();
    UUID opId = UUID.randomUUID();
    when(cardRepository.existsByIdAndUserIdNot(foreignCardId, userId)).thenReturn(true);

    assertThatThrownBy(() -> cardService.pushCards("uid-a", List.of(
        new CardOp(foreignCardId, "Hack", null, null, false, Instant.now(), true, null, opId)
    )))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
        .isEqualTo(HttpStatus.FORBIDDEN);

    verify(cardRepository, never()).saveAndFlush(any());

    CardEntity c1 = new CardEntity(UUID.randomUUID(), userId, "Một", null, null, false, Instant.now(), false, 10L);
    CardEntity c2 = new CardEntity(UUID.randomUUID(), userId, "Hai", null, null, false, Instant.now(), true, 15L);
    when(cardRepository.findByUserIdAndSeqGreaterThanOrderBySeqAsc(eq(userId), eq(5L), eq(PageRequest.of(0, 2))))
        .thenReturn(List.of(c1, c2));

    CardPage page = cardService.pullCards("uid-a", 5L, 2);
    assertThat(page.items()).hasSize(2);
    assertThat(page.nextCursor()).isEqualTo(15L);
    assertThat(page.items().getLast().deleted()).isTrue();
  }
}

