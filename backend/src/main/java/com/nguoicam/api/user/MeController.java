package com.nguoicam.api.user;

import java.time.Instant;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/me")
public class MeController {

  private final UserService userService;

  public MeController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping
  public ProfileResponse getMe(@AuthenticationPrincipal Jwt jwt) {
    UserEntity user = userService.getOrCreateByFirebaseUid(jwt.getSubject());
    return new ProfileResponse(user.getId(), user.getCreatedAt());
  }

  @DeleteMapping
  public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal Jwt jwt) {
    userService.deleteByFirebaseUid(jwt.getSubject());
    return ResponseEntity.noContent().build();
  }

  public record ProfileResponse(UUID id, Instant createdAt) {}
}

