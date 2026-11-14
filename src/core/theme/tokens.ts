export interface ThemePalette {
  readonly bg: string;
  readonly surface: string;
  readonly border: string;
  readonly text: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly onDanger: string;
}

export const LIGHT_COLORS: ThemePalette = {
  bg: '#FFFFFF',
  surface: '#F3F4F6',
  border: '#D1D5DB',
  text: '#111827',
  textMuted: '#374151',
  primary: '#1D4ED8',
  onPrimary: '#FFFFFF',
  success: '#166534',
  warning: '#92400E',
  danger: '#B91C1C',
  onDanger: '#FFFFFF',
};

export const HIGH_CONTRAST_COLORS: ThemePalette = {
  bg: '#000000',
  surface: '#111111',
  border: '#FFD600',
  text: '#FFD600',
  textMuted: '#FFFFFF',
  primary: '#FFD600',
  onPrimary: '#000000',
  success: '#86EFAC',
  warning: '#FDE68A',
  danger: '#FF8A80',
  onDanger: '#000000',
};

export const SOS_COLORS = {
  bg: '#D50000',
  text: '#FFFFFF',
  flashAltBg: '#FFFFFF',
  flashAltText: '#D50000',
} as const;

export const BASE_FONT_SIZES = {
  label: 14,
  body: 16,
  title: 22,
  display: 28,
  conversation: 28,
} as const;

export type FontScaleLevel = 'small' | 'medium' | 'large' | 'max';

export const FONT_SCALE_MULTIPLIERS: Record<FontScaleLevel, number> = {
  small: 1,
  medium: 1.25,
  large: 1.6,
  max: 2.1,
};

export const MAX_BUTTON_LABEL_LINES = 2;

export function resolveDefaultFontScaleLevel(systemFontScale: number): FontScaleLevel {
  return systemFontScale >= 1.3 ? 'large' : 'small';
}

export function getScaledFontSizes(level: FontScaleLevel): Record<keyof typeof BASE_FONT_SIZES, number> {
  const m = FONT_SCALE_MULTIPLIERS[level];
  return {
    label: Math.round(BASE_FONT_SIZES.label * m),
    body: Math.round(BASE_FONT_SIZES.body * m),
    title: Math.round(BASE_FONT_SIZES.title * m),
    display: Math.round(BASE_FONT_SIZES.display * m),
    conversation: Math.round(BASE_FONT_SIZES.conversation * m),
  };
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADII = {
  card: 12,
  button: 20,
  sheet: 20,
  chip: 999,
} as const;

export const DIMENSIONS = {
  topBarHeight: 56,
  bottomTabsHeight: 64,
  statusDotSize: 14,
  sosButtonSize: 56,
  minTouchTarget: 48,
  quickReplyMinHeight: 56,
  primaryActionMinHeight: 64,
  bigActionMinHeight: 96,
  sosStopMinHeight: 96,
} as const;

export const MOTION = {
  maxTransitionMs: 200,
  sosFlashHz: 2,
} as const;

function linearizeChannel(channel255: number): number {
  const s = channel255 / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function validateThemeContrast(
  palette: ThemePalette,
  minRatio: number
): string[] {
  const pairs: Array<[string, string, string]> = [
    ['text/bg', palette.text, palette.bg],
    ['text/surface', palette.text, palette.surface],
    ['textMuted/bg', palette.textMuted, palette.bg],
    ['textMuted/surface', palette.textMuted, palette.surface],
    ['onPrimary/primary', palette.onPrimary, palette.primary],
    ['success/bg', palette.success, palette.bg],
    ['success/surface', palette.success, palette.surface],
    ['warning/bg', palette.warning, palette.bg],
    ['warning/surface', palette.warning, palette.surface],
    ['danger/bg', palette.danger, palette.bg],
    ['danger/surface', palette.danger, palette.surface],
    ['onDanger/danger', palette.onDanger, palette.danger],
  ];

  const failures: string[] = [];
  for (const [label, fg, bg] of pairs) {
    const ratio = getContrastRatio(fg, bg);
    if (ratio < minRatio) {
      failures.push(`${label} (${fg} on ${bg}) = ${ratio.toFixed(2)}:1 < ${minRatio}:1`);
    }
  }
  return failures;
}

