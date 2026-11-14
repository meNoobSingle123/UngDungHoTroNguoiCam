package com.nguoicam.api.settings;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record SettingsDto(
    @Min(0) @Max(3) Integer fontLevel,
    Boolean highContrast,
    @DecimalMin("0.25") @DecimalMax("4.0") Double speechRate,
    DominantHand dominantHand
) {
  public enum DominantHand {
    left,
    right
  }

  public static SettingsDto defaults() {
    return new SettingsDto(1, false, 1.0, DominantHand.right);
  }
}

