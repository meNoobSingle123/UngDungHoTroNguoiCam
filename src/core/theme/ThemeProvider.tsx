import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AccessibilityInfo, PixelRatio, Text, type TextProps } from 'react-native';
import { useSystemStore } from '../store/systemStatus.ts';
import {
  BASE_FONT_SIZES,
  DIMENSIONS,
  HIGH_CONTRAST_COLORS,
  LIGHT_COLORS,
  MOTION,
  RADII,
  SHADOWS,
  SOS_COLORS,
  SPACING,
  getScaledFontSizes,
  type FontScaleLevel,
  type ThemePalette,
} from './tokens.ts';

export interface AppThemeContextValue {
  colors: ThemePalette;
  sosColors: typeof SOS_COLORS;
  isHighContrast: boolean;
  fontLevel: FontScaleLevel;
  fonts: Record<keyof typeof BASE_FONT_SIZES, number>;
  spacing: typeof SPACING;
  radii: typeof RADII;
  shadows: typeof SHADOWS;
  dimensions: typeof DIMENSIONS;
  motion: typeof MOTION;
  reduceMotion: boolean;
}

const ThemeContext = createContext<AppThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const fontLevel = useSystemStore((s) => s.fontLevel);
  const highContrast = useSystemStore((s) => s.highContrast);
  const reduceMotion = useSystemStore((s) => s.reduceMotion);
  const initFontScaleFromSystem = useSystemStore((s) => s.initFontScaleFromSystem);
  const setReduceMotion = useSystemStore((s) => s.setReduceMotion);

  useEffect(() => {
    initFontScaleFromSystem(PixelRatio.getFontScale());
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled)
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [initFontScaleFromSystem, setReduceMotion]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      colors: highContrast ? HIGH_CONTRAST_COLORS : LIGHT_COLORS,
      sosColors: SOS_COLORS,
      isHighContrast: highContrast,
      fontLevel,
      fonts: getScaledFontSizes(fontLevel),
      spacing: SPACING,
      radii: RADII,
      shadows: SHADOWS,
      dimensions: DIMENSIONS,
      motion: MOTION,
      reduceMotion,
    }),
    [fontLevel, highContrast, reduceMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colors: LIGHT_COLORS,
      sosColors: SOS_COLORS,
      isHighContrast: false,
      fontLevel: 'small',
      fonts: getScaledFontSizes('small'),
      spacing: SPACING,
      radii: RADII,
      shadows: SHADOWS,
      dimensions: DIMENSIONS,
      motion: MOTION,
      reduceMotion: false,
    };
  }
  return ctx;
}

export interface AppTextProps extends TextProps {
  variant?: keyof typeof BASE_FONT_SIZES;
  color?: string;
  bold?: boolean;
  weight?: '400' | '500' | '600' | '700';
}

export function AppText({
  variant = 'body',
  color,
  bold,
  weight,
  style,
  ...rest
}: AppTextProps): React.ReactElement {
  const theme = useAppTheme();
  const resolvedWeight = weight ? weight : bold ? '700' : '400';

  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          fontSize: theme.fonts[variant],
          color: color ?? theme.colors.text,
          fontWeight: resolvedWeight,
        },
        style,
      ]}
      {...rest}
    />
  );
}
