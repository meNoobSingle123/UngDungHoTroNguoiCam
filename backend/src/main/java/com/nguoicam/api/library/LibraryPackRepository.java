package com.nguoicam.api.library;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LibraryPackRepository extends JpaRepository<LibraryPackEntity, String> {

  List<LibraryPackEntity> findAllByOrderByPublishedAtDesc();
}

