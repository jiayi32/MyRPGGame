/**
 * Design System — ThemeText Component
 *
 * Typography-aware text component that applies the correct font family
 * based on the text role.
 *
 * Roles:
 *   pixel     → Press Start 2P — damage numbers, CT ticks, currency
 *   heading   → Cinzel serif — screen titles, boss names
 *   body      → Inter sans-serif — descriptions, stats
 *   label     → Inter sans-serif, semibold, uppercase — button text, tabs
 *   mono      → JetBrains Mono — stat values, combat log
 *   narrative → Cinzel italic — story text
 *   neon      → JetBrains Mono bold with cyan glow — sci-fi accent text
 *
 * Usage:
 *   <ThemeText textRole="pixel" size="md">247</ThemeText>
 *   <ThemeText textRole="neon" size="md">ACTIVE</ThemeText>
 */

import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { typography } from '../../design';
import { useTheme } from '../../design/ThemeContext';

// ─── Types ───────────────────────────────────────────────────────────────────
export type TextRole = 'pixel' | 'heading' | 'body' | 'label' | 'mono' | 'narrative' | 'neon';
export type TextSize = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl';

interface ThemeTextProps extends Omit<TextProps, 'style'> {
  /** Typographic role: determines font family and base styling */
  textRole: TextRole;
  size?: TextSize;
  color?: string;
  /** Use theme-aware text color (primary/secondary/dim) */
  colorKey?: 'primary' | 'secondary' | 'dim';
  /** For 'label' role: whether to uppercase */
  uppercase?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
}

// ─── Role → Base Style Map ───────────────────────────────────────────────────
function getBaseStyle(role: TextRole, size?: TextSize) {
  // Map role + size to the closest typography preset
  switch (role) {
    case 'pixel': {
      const map: Record<string, any> = {
        sm: typography.style.pixelSm,
        md: typography.style.pixelMd,
        lg: typography.style.pixelLg,
        xl: typography.style.pixelXl,
      };
      return map[size ?? 'md'] ?? typography.style.pixelMd;
    }
    case 'heading': {
      const map: Record<string, any> = {
        lg: typography.style.headingSm,
        xl: typography.style.headingMd,
        '2xl': typography.style.headingLg,
      };
      return map[size ?? 'lg'] ?? typography.style.headingSm;
    }
    case 'body': {
      const map: Record<string, any> = {
        xs: typography.style.bodyXs,
        sm: typography.style.bodySm,
        base: typography.style.bodyBase,
        md: typography.style.bodyMd,
      };
      return map[size ?? 'base'] ?? typography.style.bodyBase;
    }
    case 'label':
      return typography.style.labelMd;
    case 'mono': {
      const map: Record<string, any> = {
        sm: typography.style.monoSm,
        base: typography.style.monoBase,
      };
      return map[size ?? 'base'] ?? typography.style.monoBase;
    }
    case 'narrative':
      return typography.style.narrative;
    case 'neon': {
      const map: Record<string, any> = {
        sm: typography.style.neon,
        base: typography.style.neon,
        md: typography.style.neonMd,
        lg: typography.style.neonLg,
      };
      return map[size ?? 'base'] ?? typography.style.neon;
    }
    default:
      return typography.style.bodyBase;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ThemeText({
  textRole,
  size,
  color,
  colorKey,
  uppercase,
  align,
  style,
  children,
  ...textProps
}: ThemeTextProps) {
  const { colors: themeColors } = useTheme();

  const baseStyle = getBaseStyle(textRole, size);
  const resolvedColor = color ?? (colorKey ? themeColors.text[colorKey] : themeColors.text.primary);

  const composedStyle: StyleProp<TextStyle> = [
    baseStyle,
    { color: resolvedColor },
    uppercase && { textTransform: 'uppercase' as const },
    align && { textAlign: align },
    style,
  ];

  return (
    <Text style={composedStyle} {...textProps}>
      {children}
    </Text>
  );
}
