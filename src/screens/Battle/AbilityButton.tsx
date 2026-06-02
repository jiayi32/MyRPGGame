import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SKILL_BY_ID } from '@/content';
import type { SkillId } from '@/content/types';
import { SYNTHETIC_BASIC_ATTACK_ID } from '@/domain/combat';
import { colors, spacing, radius, typography } from '@/design';

export function describeSkillCost(skillId: SkillId): string {
  if (skillId === SYNTHETIC_BASIC_ATTACK_ID) return '';
  const skill = SKILL_BY_ID.get(skillId);
  if (!skill) return '';
  const r = skill.resource;
  if (r.type === 'MP' && typeof r.cost === 'number') return `${r.cost} MP`;
  if (r.type === 'HP' && typeof r.cost === 'number') return `${(r.cost * 100).toFixed(0)}% HP`;
  return '';
}

export function reasonLabel(reason: string | undefined): string {
  if (!reason) return '';
  const map: Record<string, string> = {
    not_ready: 'not ready',
    skill_on_cooldown: 'on cooldown',
    insufficient_resource: 'no MP/HP',
    skill_not_owned: 'not owned',
    invalid_target: 'no target',
    unit_dead: 'dead',
    unit_stunned: 'stunned',
    battle_ended: 'ended',
  };
  return map[reason] ?? reason;
}

export function AbilityButton({
  label,
  cost,
  onPress,
  onLongPress,
  disabled,
  cooldown,
  reason,
  compact = false,
}: {
  label: string;
  cost: string;
  onPress: () => void;
  onLongPress: () => void;
  disabled: boolean;
  cooldown?: number;
  reason?: string;
  compact?: boolean;
}) {
  const bgColor = disabled ? '#2a2520' : colors.button.primary.bg;
  const borderColor = disabled ? '#3d3628' : colors.button.primary.border;
  const labelColor = disabled ? colors.dark.text.dim : colors.button.primary.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      disabled={disabled}
      style={[
        styles.abilityBtn,
        compact && styles.abilityBtnCompact,
        { backgroundColor: bgColor, borderColor },
      ]}
    >
      <Text style={[typography.style.bodySm, { color: labelColor, fontWeight: '600' }]}>
        {label}
      </Text>
      {cost.length > 0 && (
        <Text style={[typography.style.bodyXs, { color: disabled ? colors.dark.text.dim : colors.accent.amber }]}>
          {cost}
        </Text>
      )}
      {cooldown !== undefined && cooldown > 0 && (
        <Text style={[typography.style.bodyXs, { color: colors.accent.amber, fontStyle: 'italic' }]}>
          CD {cooldown.toFixed(1)}s
        </Text>
      )}
      {!compact && reason !== undefined && reason.length > 0 && disabled && (
        <Text style={[typography.style.bodyXs, { color: colors.accent.crimson, fontStyle: 'italic' }]}>
          {reason}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  abilityBtn: {
    minWidth: 100,
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  abilityBtnCompact: {
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
