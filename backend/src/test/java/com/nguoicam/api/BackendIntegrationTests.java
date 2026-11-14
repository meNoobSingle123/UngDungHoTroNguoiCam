package com.nguoicam.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nguoicam.api.config.SecurityConfig;
import com.nguoicam.api.library.LibraryPackEntity;
import com.nguoicam.api.library.LibraryPackRepository;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, BackendIntegrationTests.TestJwtConfig.class})
@TestPropertySource(properties = "app.firebase.project-id=test-firebase-project")
class BackendIntegrationTests {

  private static final String PROJECT_ID = "test-firebase-project";
  private static final RSAKey TEST_RSA_KEY = generateTestKey();

  private static RSAKey generateTestKey() {
    try {
      return new RSAKeyGenerator(2048).keyID("test-kid").generate();
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  @TestConfiguration(proxyBeanMethods = false)
  static class TestJwtConfig {

    @Bean
    @Primary
    JwtDecoder testJwtDecoder() throws Exception {
      NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(TEST_RSA_KEY.toRSAPublicKey()).build();
      decoder.setJwtValidator(SecurityConfig.buildFirebaseValidator(PROJECT_ID));
      return decoder;
    }
  }

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private LibraryPackRepository libraryPackRepository;

  private String signToken(String subject, String issuer, String audience) throws Exception {
    JWTClaimsSet claims = new JWTClaimsSet.Builder()
        .subject(subject)
        .issuer(issuer)
        .audience(List.of(audience))
        .issueTime(Date.from(Instant.now().minusSeconds(10)))
        .expirationTime(Date.from(Instant.now().plusSeconds(600)))
        .build();
    SignedJWT signed = new SignedJWT(
        new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(TEST_RSA_KEY.getKeyID()).build(),
        claims
    );
    signed.sign(new RSASSASigner(TEST_RSA_KEY));
    return signed.serialize();
  }

  private String validToken(String uid) throws Exception {
    return signToken(uid, "https://securetoken.google.com/" + PROJECT_ID, PROJECT_ID);
  }

  @Test
  void authEnforcesFirebaseIssuerAudienceAndCreatesOrDeletesUser() throws Exception {
    mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    mockMvc.perform(get("/v1/me")).andExpect(status().isUnauthorized());

    String badIssuer = signToken("u1", "https://securetoken.google.com/wrong-proj", PROJECT_ID);
    mockMvc.perform(get("/v1/me").header("Authorization", "Bearer " + badIssuer))
        .andExpect(status().isUnauthorized());

    String badAud = signToken("u1", "https://securetoken.google.com/" + PROJECT_ID, "wrong-aud");
    mockMvc.perform(get("/v1/me").header("Authorization", "Bearer " + badAud))
        .andExpect(status().isUnauthorized());

    String uid = "firebase-user-" + UUID.randomUUID();
    String tok = validToken(uid);

    MvcResult first = mockMvc.perform(get("/v1/me").header("Authorization", "Bearer " + tok))
        .andExpect(status().isOk())
        .andReturn();
    MvcResult second = mockMvc.perform(get("/v1/me").header("Authorization", "Bearer " + tok))
        .andExpect(status().isOk())
        .andReturn();

    String id1 = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asString();
    String id2 = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asString();
    assertThat(id1).isEqualTo(id2);

    mockMvc.perform(delete("/v1/me").header("Authorization", "Bearer " + tok))
        .andExpect(status().isNoContent());
  }

  @Test
  void syncDeduplicatesResolvesConflictsEnforcesUserIsolationAndPaginates() throws Exception {
    String tokA = validToken("user-a-" + UUID.randomUUID());
    String tokB = validToken("user-b-" + UUID.randomUUID());

    UUID card1 = UUID.randomUUID();
    UUID card2 = UUID.randomUUID();
    UUID card3 = UUID.randomUUID();
    UUID op1 = UUID.randomUUID();

    String syncBody1 = """
        {
          "ops": [{
            "id": "%s",
            "opId": "%s",
            "content": "Xin chào",
            "topic": "chao_hoi",
            "icon": "hand",
            "pinned": true,
            "deleted": false,
            "updatedAt": "2026-11-10T10:00:00Z"
          }]
        }
        """.formatted(card1, op1);

    // 1) First push -> APPLIED
    mockMvc.perform(post("/v1/cards/sync")
            .header("Authorization", "Bearer " + tokA)
            .contentType(MediaType.APPLICATION_JSON)
            .content(syncBody1))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].status").value("APPLIED"));

    // 2) Replay same opId -> DUPLICATE
    mockMvc.perform(post("/v1/cards/sync")
            .header("Authorization", "Bearer " + tokA)
            .contentType(MediaType.APPLICATION_JSON)
            .content(syncBody1))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].status").value("DUPLICATE"))
        .andExpect(jsonPath("$.results[0].item.content").value("Xin chào"));

    // 3) Older updatedAt with new opId -> SERVER_WINS
    String staleSync = """
        {
          "ops": [{
            "id": "%s",
            "opId": "%s",
            "content": "Ghi đè cũ",
            "pinned": false,
            "deleted": false,
            "updatedAt": "2026-11-10T09:00:00Z"
          }]
        }
        """.formatted(card1, UUID.randomUUID());
    mockMvc.perform(post("/v1/cards/sync")
            .header("Authorization", "Bearer " + tokA)
            .contentType(MediaType.APPLICATION_JSON)
            .content(staleSync))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.results[0].status").value("SERVER_WINS"))
        .andExpect(jsonPath("$.results[0].item.content").value("Xin chào"));

    // 4) User B cannot read or overwrite User A's card even by guessing card UUID
    mockMvc.perform(get("/v1/cards").header("Authorization", "Bearer " + tokB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(0));

    String hijackBody = """
        {
          "ops": [{
            "id": "%s",
            "opId": "%s",
            "content": "B hijack",
            "pinned": false,
            "deleted": true,
            "updatedAt": "2026-11-10T12:00:00Z"
          }]
        }
        """.formatted(card1, UUID.randomUUID());
    mockMvc.perform(post("/v1/cards/sync")
            .header("Authorization", "Bearer " + tokB)
            .contentType(MediaType.APPLICATION_JSON)
            .content(hijackBody))
        .andExpect(status().isForbidden());

    // 5) Insert card2, soft-delete card3, and verify multi-page cursor pagination
    String batch2 = """
        {
          "ops": [
            {
              "id": "%s",
              "opId": "%s",
              "content": "Cảm ơn",
              "pinned": false,
              "deleted": false,
              "updatedAt": "2026-11-10T10:05:00Z"
            },
            {
              "id": "%s",
              "opId": "%s",
              "content": "Thẻ đã xóa",
              "pinned": false,
              "deleted": true,
              "updatedAt": "2026-11-10T10:06:00Z"
            }
          ]
        }
        """.formatted(card2, UUID.randomUUID(), card3, UUID.randomUUID());
    mockMvc.perform(post("/v1/cards/sync")
            .header("Authorization", "Bearer " + tokA)
            .contentType(MediaType.APPLICATION_JSON)
            .content(batch2))
        .andExpect(status().isOk());

    MvcResult page1Res = mockMvc.perform(get("/v1/cards?since=0&limit=2")
            .header("Authorization", "Bearer " + tokA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(2))
        .andReturn();

    JsonNode page1 = objectMapper.readTree(page1Res.getResponse().getContentAsString());
    long cursor = page1.get("nextCursor").asLong();

    mockMvc.perform(get("/v1/cards?since=" + cursor + "&limit=2")
            .header("Authorization", "Bearer " + tokA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].id").value(card3.toString()))
        .andExpect(jsonPath("$.items[0].deleted").value(true));
  }

  @Test
  void settingsAndPublicLibraryPacksWork() throws Exception {
    String tok = validToken("settings-user-" + UUID.randomUUID());

    mockMvc.perform(put("/v1/settings")
            .header("Authorization", "Bearer " + tok)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"fontLevel": 2, "highContrast": true, "speechRate": 1.25, "dominantHand": "left"}
                """))
        .andExpect(status().isOk());

    mockMvc.perform(get("/v1/settings").header("Authorization", "Bearer " + tok))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fontLevel").value(2))
        .andExpect(jsonPath("$.highContrast").value(true))
        .andExpect(jsonPath("$.dominantHand").value("left"));

    libraryPackRepository.save(new LibraryPackEntity(
        "hcm-core-v1",
        "1.0.0",
        20,
        "https://example.local/packs/hcm-core-v1.json",
        "sha256-test",
        Instant.now()
    ));

    mockMvc.perform(get("/v1/library/packs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.id == 'hcm-core-v1')]").exists());
  }
}

