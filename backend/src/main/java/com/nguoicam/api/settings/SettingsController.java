package com.nguoicam.api.settings;

import com.nguoicam.api.user.UserEntity;
import com.nguoicam.api.user.UserService;
import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/settings")
public class SettingsController {

  private final UserService userService;
  private final SettingsRepository settingsRepository;

  public SettingsController(
      UserService userService,
      SettingsRepository settingsRepository
  ) {
    this.userService = userService;
    this.settingsRepository = settingsRepository;
  }

  @GetMapping
  @Transactional
  public SettingsDto getSettings(@AuthenticationPrincipal Jwt jwt) {
    UserEntity user = userService.getOrCreateByFirebaseUid(jwt.getSubject());
    return settingsRepository.findById(user.getId())
        .map(SettingsEntity::getData)
        .orElseGet(SettingsDto::defaults);
  }

  @PutMapping
  @Transactional
  public ResponseEntity<Void> putSettings(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody SettingsDto body
  ) {
    UserEntity user = userService.getOrCreateByFirebaseUid(jwt.getSubject());
    Instant now = Instant.now();
    SettingsEntity entity = settingsRepository.findById(user.getId())
        .map(existing -> {
          existing.setData(body);
          existing.setUpdatedAt(now);
          return existing;
        })
        .orElseGet(() -> new SettingsEntity(user.getId(), body, now));
    settingsRepository.save(entity);
    return ResponseEntity.ok().build();
  }
}

