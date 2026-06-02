/**
 * Design System — StatusChip Component
 *
 * Small pill-shaped indicators for status effects, buffs, and debuffs.
 * Used below unit HP bar in battle and on gear/skill cards.
 *
 * Variants:
 *   positive → emerald (buffs, regen)
 *   negative → crimson (debuffs, dots)
 *   neutral  → sapphire (CT effects, shields)
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, typography, spacing, radius } from '../../design';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ChipVariant = 'positive' | 'negative' | 'neutral';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  /** Optional icon character (emoji or unicode symbol) */
  icon?: string;
  /** Stack counter (e.g., burn stacks) */
  count?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function StatusChip({
  label,
  variant = 'neutral',
  icon,
  count,
}: StatusChipProps) {
  const chipColors = colors.statusEffect[variant];

  return (
    <View style={[styles.chip, { backgroundColor: chipColors.bg }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[typography.style.bodyXs, { color: chipColors.text, fontWeight: '600' }]}>
        {label}
      </Text>
      {count !== undefined && count > 1 && (
        <Text style={[typography.style.bodyXs, { color: chipColors.text, fontWeight: '700' }]}>
          {count}
        </Text>
      )}
    </View>
  );
}

// ─── Status Chip Row ─────────────────────────────────────────────────────────
interface StatusChipRowProps {
  chips: Array<{ label: string; variant?: ChipVariant; icon?: string; count?: number }>;
  /** Maximum chips to show before "+N more" */
  maxVisible?: number;
}

export function StatusChipRow({ chips, maxVisible = 4 }: StatusChipRowProps) {
  const visible = chips.slice(0, maxVisible);
  const overflow = chips.length - maxVisible;

  return (
    <View style={styles.row}>
      {visible.map((chip, i) => (
        <StatusChip key={`${chip.label}-${i}`} {...chip} />
      ))}
      {overflow > 0 && (
        <StatusChip label={`+${overflow} more`} variant="neutral" />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    minHeight: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  icon: {
    fontSize: 10,
  },
});
