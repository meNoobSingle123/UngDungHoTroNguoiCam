package com.nguoicam.api.user;

import com.nguoicam.api.cards.ProcessedOpRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final ProcessedOpRepository processedOpRepository;

  public UserService(
      UserRepository userRepository,
      ProcessedOpRepository processedOpRepository
  ) {
    this.userRepository = userRepository;
    this.processedOpRepository = processedOpRepository;
  }

  @Transactional
  public UserEntity getOrCreateByFirebaseUid(String firebaseUid) {
    return userRepository.findByFirebaseUid(firebaseUid)
        .orElseGet(() -> {
          userRepository.insertIfAbsent(UUID.randomUUID(), firebaseUid);
          return userRepository.findByFirebaseUid(firebaseUid)
              .orElseThrow();
        });
  }

  @Transactional
  public void deleteByFirebaseUid(String firebaseUid) {
    userRepository.findByFirebaseUid(firebaseUid).ifPresent(user -> {
      processedOpRepository.deleteByUserId(user.getId());
      userRepository.delete(user);
    });
  }
}

