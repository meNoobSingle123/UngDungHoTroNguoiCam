package com.nguoicam.api.cards;

import com.nguoicam.api.cards.CardDtos.CardPage;
import com.nguoicam.api.cards.CardDtos.SyncRequest;
import com.nguoicam.api.cards.CardDtos.SyncResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/v1/cards")
public class CardController {

  private final CardService cardService;

  public CardController(CardService cardService) {
    this.cardService = cardService;
  }

  @GetMapping
  public CardPage pullCards(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "0") @Min(0) long since,
      @RequestParam(defaultValue = "200") @Min(1) @Max(500) int limit
  ) {
    return cardService.pullCards(jwt.getSubject(), since, limit);
  }

  @PostMapping("/sync")
  public SyncResponse pushCards(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody SyncRequest request
  ) {
    return cardService.pushCards(jwt.getSubject(), request.ops());
  }
}

