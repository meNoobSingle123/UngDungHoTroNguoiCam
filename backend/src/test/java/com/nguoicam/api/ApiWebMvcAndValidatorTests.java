package com.nguoicam.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nguoicam.api.cards.CardController;
import com.nguoicam.api.cards.CardDtos.CardPage;
import com.nguoicam.api.cards.CardService;
import com.nguoicam.api.config.ProblemExceptionHandler;
import com.nguoicam.api.config.SecurityConfig;
import com.nguoicam.api.library.LibraryPackEntity;
import com.nguoicam.api.library.LibraryPackRepository;
import com.nguoicam.api.library.PackController;
import com.nguoicam.api.settings.SettingsController;
import com.nguoicam.api.settings.SettingsRepository;
import com.nguoicam.api.user.MeController;
import com.nguoicam.api.user.UserEntity;
import com.nguoicam.api.user.UserService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {
    MeController.class,
    CardController.class,
    SettingsController.class,
    PackController.class
})
@Import({SecurityConfig.class, ProblemExceptionHandler.class})
class ApiWebMvcAndValidatorTests {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private JwtDecoder jwtDecoder;

  @MockitoBean
  private UserService userService;

  @MockitoBean
  private CardService cardService;

  @MockitoBean
  private SettingsRepository settingsRepository;

  @MockitoBean
  private LibraryPackRepository libraryPackRepository;

  @Test
  void firebaseValidatorChecksIssuerAudienceAndSubject() {
    OAuth2TokenValidator<Jwt> validator = SecurityConfig.buildFirebaseValidator("my-project");

    Jwt valid = Jwt.withTokenValue("tok")
        .header("alg", "RS256")
        .issuer("https://securetoken.google.com/my-project")
        .audience(List.of("my-project"))
        .subject("firebase-uid-1")
        .issuedAt(Instant.now().minusSeconds(10))
        .expiresAt(Instant.now().plusSeconds(300))
        .build();
    assertThat(validator.validate(valid).hasErrors()).isFalse();

    Jwt wrongIssuer = Jwt.withTokenValue("tok")
        .header("alg", "RS256")
        .issuer("https://securetoken.google.com/other-project")
        .audience(List.of("my-project"))
        .subject("firebase-uid-1")
        .issuedAt(Instant.now().minusSeconds(10))
        .expiresAt(Instant.now().plusSeconds(300))
        .build();
    assertThat(validator.validate(wrongIssuer).hasErrors()).isTrue();

    Jwt wrongAudience = Jwt.withTokenValue("tok")
        .header("alg", "RS256")
        .issuer("https://securetoken.google.com/my-project")
        .audience(List.of("other-project"))
        .subject("firebase-uid-1")
        .issuedAt(Instant.now().minusSeconds(10))
        .expiresAt(Instant.now().plusSeconds(300))
        .build();
    assertThat(validator.validate(wrongAudience).hasErrors()).isTrue();
  }

  @Test
  void unauthenticatedRequestsReturn401ProblemJsonExceptPublicPacks() throws Exception {
    mockMvc.perform(get("/v1/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));

    mockMvc.perform(get("/v1/cards"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));

    when(libraryPackRepository.findAllByOrderByPublishedAtDesc()).thenReturn(List.of(
        new LibraryPackEntity(
            "pack-v1",
            "1.0.0",
            20,
            "https://example.local/packs/v1.json",
            "abc123",
            Instant.parse("2026-11-10T00:00:00Z")
        )
    ));

    mockMvc.perform(get("/v1/library/packs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value("pack-v1"))
        .andExpect(jsonPath("$[0].wordCount").value(20));
  }

  @Test
  void validatesCardContentMax140AndSettingsBounds() throws Exception {
    String tooLong = "a".repeat(141);
    String body = """
        {
          "ops": [{
            "id": "%s",
            "opId": "%s",
            "content": "%s",
            "pinned": false,
            "deleted": false,
            "updatedAt": "2026-11-10T08:00:00Z"
          }]
        }
        """.formatted(UUID.randomUUID(), UUID.randomUUID(), tooLong);

    mockMvc.perform(post("/v1/cards/sync")
            .with(jwt().jwt(j -> j.subject("uid-a")))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));

    mockMvc.perform(put("/v1/settings")
            .with(jwt().jwt(j -> j.subject("uid-a")))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"fontLevel": 9, "highContrast": true, "speechRate": 1.0, "dominantHand": "right"}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
  }

  @Test
  void authenticatedGetMeAndPullCardsInvokeServicesWithTokenSubject() throws Exception {
    UUID userId = UUID.randomUUID();
    when(userService.getOrCreateByFirebaseUid("uid-a"))
        .thenReturn(new UserEntity(userId, "uid-a"));
    when(cardService.pullCards(anyString(), anyLong(), anyInt()))
        .thenReturn(new CardPage(List.of(), 0L));

    mockMvc.perform(get("/v1/me").with(jwt().jwt(j -> j.subject("uid-a"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(userId.toString()));

    mockMvc.perform(get("/v1/cards").with(jwt().jwt(j -> j.subject("uid-a"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextCursor").value(0));
  }
}

