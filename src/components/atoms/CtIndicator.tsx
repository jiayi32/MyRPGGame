/**
 * Design System — CtIndicator Atom
 *
 * CT (Charge Turn) countdown chip displayed on player and enemy units.
 * Shows remaining CT seconds or "READY" when the unit can act.
 *
 * Variants:
 *   - player — Appears on player unit card (grey when waiting, gold pulse when ready)
 *   - enemy  — Appears on enemy rows (red-tinted)
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, typography, spacing, radius } from '../../design';
import { ThemeText } from './ThemeText';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CtIndicatorProps {
  /** Current CT value in seconds */
  ct: number;
  /** Whether this unit is ready to act (CT ≤ 0) */
  isReady: boolean;
  /** Display variant */
  variant?: 'player' | 'enemy';
}

// ─── Component ───────────────────────────────────────────────────────────────
export function CtIndicator({ ct, isReady, variant = 'player' }: CtIndicatorProps) {
  const isPlayer = variant === 'player';

  if (isReady) {
    return (
      <View
        style={[
          styles.chip,
          {
            backgroundColor: colors.accent.emerald,
            borderColor: colors.accent.emerald,
          },
        ]}
      >
        <ThemeText
          textRole="label"
          size="xs"
          color="#ffffff"
          style={styles.readyText}
        >
          READY
        </ThemeText>
      </View>
    );
  }

  // Enemy or player waiting
  const bgColor = isPlayer ? '#1a2430' : '#2a1515';
  const borderColor = isPlayer ? colors.dark.border.default : '#3d2020';
  const textColor = isPlayer ? colors.dark.text.secondary : colors.accent.crimson;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor,
        },
      ]}
    >
      <ThemeText
        textRole="pixel"
        size="sm"
        color={textColor}
        style={styles.ctText}
      >
        {ct.toFixed(1)}s
      </ThemeText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  readyText: {
    letterSpacing: 0.5,
  },
  ctText: {
    // Pixel font at small size — ensure legibility
  },
});
