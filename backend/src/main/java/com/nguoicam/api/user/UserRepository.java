package com.nguoicam.api.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

  Optional<UserEntity> findByFirebaseUid(String firebaseUid);

  @Modifying
  @Query(
      value = "INSERT INTO users (id, firebase_uid) VALUES (:id, :firebaseUid) ON CONFLICT (firebase_uid) DO NOTHING",
      nativeQuery = true
  )
  void insertIfAbsent(@Param("id") UUID id, @Param("firebaseUid") String firebaseUid);
}

