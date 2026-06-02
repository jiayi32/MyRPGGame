/**
 * Design System — Spacing Scale
 *
 * Consistent spacing tokens for margins, paddings, gaps, and layout.
 * Based on a 4px base unit. All values in logical pixels.
 *
 * Usage:
 *   import { spacing } from 'src/design';
 *   padding: spacing.md   // 16
 *   gap: spacing.sm       // 8
 */

export const spacing = {
  /** 2px — hairline, icon padding */
  xs: 2,
  /** 4px — tight gap, inline spacing */
  sm: 4,
  /** 8px — standard gap between related items */
  md: 8,
  /** 12px — comfortable inner padding */
  lg: 12,
  /** 16px — section padding, card padding */
  xl: 16,
  /** 20px — screen horizontal padding */
  '2xl': 20,
  /** 24px — screen vertical padding, large section gap */
  '3xl': 24,
  /** 32px — major section separation */
  '4xl': 32,
} as const;

/** Border radius tokens */
export const radius = {
  /** 4px — small chips, inline badges */
  sm: 4,
  /** 8px — buttons, input fields */
  md: 8,
  /** 10px — standard cards */
  lg: 10,
  /** 12px — large cards */
  xl: 12,
  /** 14px — modals */
  '2xl': 14,
  /** 999px — pill shapes */
  full: 999,
} as const;

/** Minimum touch target dimensions (Apple HIG + Android Material) */
export const touchTarget = {
  /** 44px — minimum tappable dimension */
  min: 44,
  /** 48px — preferred button height */
  button: 48,
  /** 56px — large action button height */
  buttonLg: 56,
} as const;
