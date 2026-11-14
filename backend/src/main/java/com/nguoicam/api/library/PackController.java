package com.nguoicam.api.library;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/library/packs")
public class PackController {

  private final LibraryPackRepository libraryPackRepository;

  public PackController(LibraryPackRepository libraryPackRepository) {
    this.libraryPackRepository = libraryPackRepository;
  }

  @GetMapping
  public List<PackSummary> listPacks() {
    return libraryPackRepository.findAllByOrderByPublishedAtDesc().stream()
        .map(p -> new PackSummary(
            p.getId(),
            p.getVersion(),
            p.getWordCount(),
            p.getUrl(),
            p.getSha256()
        ))
        .toList();
  }

  public record PackSummary(
      String id,
      String version,
      int wordCount,
      String url,
      String sha256
  ) {}
}

