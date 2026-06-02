/**
 * Design System — Card Component
 *
 * The universal container for selectable content.
 * Used in class select, draft screens, equipment, shop, profile, and narrative.
 *
 * Variants:
 *   - selection  → Radio-like selection state with gold border
 *   - stat       → Internal horizontal stat rows
 *   - draft      → Category color stripe on left edge
 *   - room       → Room-type color background + sigil
 *   - narrative  → Larger padding, serif title, italic body
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, radius } from '../../design';
import { useTheme } from '../../design/ThemeContext';

// ─── Types ───────────────────────────────────────────────────────────────────
export type CardVariant = 'selection' | 'stat' | 'draft' | 'room' | 'narrative';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Draft/room variant: color stripe config */
  accentColor?: string;
  accentBorderColor?: string;
  /** Room variant: background color override */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Card({
  children,
  variant = 'selection',
  selected = false,
  disabled = false,
  onPress,
  accentColor,
  accentBorderColor,
  backgroundColor,
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors: themeColors, isDark } = useTheme();

  const cardBg = backgroundColor ?? themeColors.background.secondary;
  const borderColor = selected
    ? colors.accent.gold
    : themeColors.border.default;

  const cardStyle: ViewStyle = {
    backgroundColor: cardBg,
    borderColor,
    borderWidth: selected ? 2 : 1.5,
    borderRadius: radius.lg,
    padding: variant === 'narrative' ? spacing['2xl'] : spacing.xl,
    opacity: disabled ? 0.5 : 1,
  };

  const content = (
    <View style={[cardStyle, style]}>
      {/* Draft variant: left accent stripe */}
      {variant === 'draft' && accentColor && (
        <View
          style={[
            styles.draftStripe,
            { backgroundColor: accentColor },
          ]}
        />
      )}
      {children}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        style={({ pressed }) => [
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

// ─── Card Section Sub-Components ─────────────────────────────────────────────
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned accessory (badge, icon, etc.) */
  accessory?: React.ReactNode;
}

export function CardHeader({ title, subtitle, accessory }: CardHeaderProps) {
  const { colors: themeColors } = useTheme();
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerText}>
        <View style={styles.titleRow}>
          <View style={[styles.titleDot, { backgroundColor: colors.accent.gold }]} />
          <View style={{ flex: 1 }}>
            {/* Using Text directly — consumers should wrap in ThemeText if needed */}
          </View>
        </View>
      </View>
      {accessory}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  draftStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
