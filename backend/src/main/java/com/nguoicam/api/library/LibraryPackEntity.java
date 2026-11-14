package com.nguoicam.api.library;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "library_packs")
public class LibraryPackEntity {

  @Id
  @Column(name = "id", nullable = false)
  private String id;

  @Column(name = "version", nullable = false)
  private String version;

  @Column(name = "word_count", nullable = false)
  private int wordCount;

  @Column(name = "url", nullable = false)
  private String url;

  @Column(name = "sha256", nullable = false)
  private String sha256;

  @Column(name = "published_at", nullable = false)
  private Instant publishedAt;

  protected LibraryPackEntity() {}

  public LibraryPackEntity(
      String id,
      String version,
      int wordCount,
      String url,
      String sha256,
      Instant publishedAt
  ) {
    this.id = id;
    this.version = version;
    this.wordCount = wordCount;
    this.url = url;
    this.sha256 = sha256;
    this.publishedAt = publishedAt;
  }

  public String getId() {
    return id;
  }

  public String getVersion() {
    return version;
  }

  public int getWordCount() {
    return wordCount;
  }

  public String getUrl() {
    return url;
  }

  public String getSha256() {
    return sha256;
  }

  public Instant getPublishedAt() {
    return publishedAt;
  }
}

