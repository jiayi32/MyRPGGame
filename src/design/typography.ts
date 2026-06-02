/**
 * Design System — Typography
 *
 * Four font families with defined roles:
 *   pixel   → Damage numbers, CT ticks, currency, stage counter (Press Start 2P)
 *   serif   → Screen titles, boss names, lineage names, narrative (Cinzel)
 *   sans    → Body text, labels, buttons, UI (Inter / system)
 *   mono    → Stat values, combat log, debug (JetBrains Mono / monospace)
 *
 * Usage:
 *   import { typography } from 'src/design';
 *   fontSize: typography.size.pixel.md
 *   fontFamily: typography.font.pixel
 */

import { Platform, StyleSheet } from 'react-native';

// ─── Font Families ───────────────────────────────────────────────────────────
// Press Start 2P and Cinzel are Google Fonts (OFL licensed).
// To use in React Native, load via expo-font in App.tsx or use @expo-google-fonts.
// Fallbacks ensure the app never renders with missing glyphs.

export const fontFamily = {
  /** Damage numbers, CT ticks, gold count, stage counter */
  pixel: Platform.select({
    ios: '"Press Start 2P"',
    android: '"Press Start 2P"',
    default: 'monospace',
  }) as string,

  /** Screen titles, boss names, lineage names, narrative */
  serif: Platform.select({
    ios: 'Cinzel',
    android: 'Cinzel',
    default: 'serif',
  }) as string,

  /** Body text, labels, buttons, UI chrome */
  sans: Platform.select({
    ios: 'Inter',
    android: 'Inter',
    default: 'sans-serif',
  }) as string,

  /** Stat values, combat log, debug info */
  mono: Platform.select({
    ios: '"JetBrains Mono"',
    android: '"JetBrains Mono"',
    default: 'monospace',
  }) as string,
} as const;

// ─── Type Scale ──────────────────────────────────────────────────────────────
// All sizes in logical pixels (dp).

const size = {
  // Standard text scale
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,

  // Pixel font scale (larger because pixel fonts are less dense)
  pixel: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 30,
  },
} as const;

// ─── Line Heights ────────────────────────────────────────────────────────────
const lineHeight = {
  xs: 14,
  sm: 16,
  base: 20,
  md: 22,
  lg: 26,
  xl: 30,
  '2xl': 38,

  pixel: {
    sm: 16,
    md: 20,
    lg: 26,
    xl: 34,
  },
} as const;

// ─── Font Weights ────────────────────────────────────────────────────────────
// React Native uses string weights on iOS, numeric on Android.
// These constants work cross-platform when used with the `fontWeight` style prop.

const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// ─── Pre-built Text Styles ───────────────────────────────────────────────────
// Convenience style fragments. Use spread: {...typography.style.headingSerif}

const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.5,
  label: 0.3,
};

export const typography = {
  font: fontFamily,
  size,
  lineHeight,
  weight,
  letterSpacing,

  // ── Pre-built styles ───────────────────────────────────────────────────
  style: StyleSheet.create({
    // Pixel font styles
    pixelSm: {
      fontFamily: fontFamily.pixel,
      fontSize: size.pixel.sm,
      lineHeight: lineHeight.pixel.sm,
      fontWeight: weight.regular,
    },
    pixelMd: {
      fontFamily: fontFamily.pixel,
      fontSize: size.pixel.md,
      lineHeight: lineHeight.pixel.md,
      fontWeight: weight.regular,
    },
    pixelLg: {
      fontFamily: fontFamily.pixel,
      fontSize: size.pixel.lg,
      lineHeight: lineHeight.pixel.lg,
      fontWeight: weight.regular,
    },
    pixelXl: {
      fontFamily: fontFamily.pixel,
      fontSize: size.pixel.xl,
      lineHeight: lineHeight.pixel.xl,
      fontWeight: weight.regular,
    },

    // Serif heading styles
    headingSm: {
      fontFamily: fontFamily.serif,
      fontSize: size.lg,
      lineHeight: lineHeight.lg,
      fontWeight: weight.semibold,
    },
    headingMd: {
      fontFamily: fontFamily.serif,
      fontSize: size.xl,
      lineHeight: lineHeight.xl,
      fontWeight: weight.bold,
    },
    headingLg: {
      fontFamily: fontFamily.serif,
      fontSize: size['2xl'],
      lineHeight: lineHeight['2xl'],
      fontWeight: weight.bold,
    },

    // Body styles
    bodyXs: {
      fontFamily: fontFamily.sans,
      fontSize: size.xs,
      lineHeight: lineHeight.xs,
      fontWeight: weight.regular,
    },
    bodySm: {
      fontFamily: fontFamily.sans,
      fontSize: size.sm,
      lineHeight: lineHeight.sm,
      fontWeight: weight.regular,
    },
    bodyBase: {
      fontFamily: fontFamily.sans,
      fontSize: size.base,
      lineHeight: lineHeight.base,
      fontWeight: weight.regular,
    },
    bodyMd: {
      fontFamily: fontFamily.sans,
      fontSize: size.md,
      lineHeight: lineHeight.md,
      fontWeight: weight.medium,
    },

    // UI label styles
    labelSm: {
      fontFamily: fontFamily.sans,
      fontSize: size.xs,
      lineHeight: lineHeight.xs,
      fontWeight: weight.semibold,
      letterSpacing: letterSpacing.wide,
      textTransform: 'uppercase',
    },
    labelMd: {
      fontFamily: fontFamily.sans,
      fontSize: size.sm,
      lineHeight: lineHeight.sm,
      fontWeight: weight.semibold,
      letterSpacing: letterSpacing.label,
    },
    buttonLabel: {
      fontFamily: fontFamily.sans,
      fontSize: size.base,
      lineHeight: lineHeight.base,
      fontWeight: weight.bold,
      letterSpacing: letterSpacing.label,
    },

    // Mono data style
    monoSm: {
      fontFamily: fontFamily.mono,
      fontSize: size.sm,
      lineHeight: lineHeight.sm,
      fontWeight: weight.regular,
    },
    monoBase: {
      fontFamily: fontFamily.mono,
      fontSize: size.base,
      lineHeight: lineHeight.base,
      fontWeight: weight.regular,
    },

    // Narrative / italic
    narrative: {
      fontFamily: fontFamily.serif,
      fontSize: size.base,
      lineHeight: lineHeight.base + 4, // Extra breathing room for italic
      fontWeight: weight.regular,
      fontStyle: 'italic',
    },
  }),
} as const;
