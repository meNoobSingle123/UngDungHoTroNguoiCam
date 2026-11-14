package com.nguoicam.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.firebase")
public record FirebaseProperties(
    String projectId,
    String jwkSetUri
) {}

