import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SKILL_BY_ID } from '@/content';
import type { SkillId } from '@/content/types';
import { SYNTHETIC_BASIC_ATTACK_ID } from '@/domain/combat';

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
}: {
  label: string;
  cost: string;
  onPress: () => void;
  onLongPress: () => void;
  disabled: boolean;
  cooldown?: number;
  reason?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      disabled={disabled}
      style={[styles.abilityBtn, disabled && styles.abilityBtnDisabled]}
    >
      <Text style={[styles.abilityBtnLabel, disabled && styles.abilityBtnLabelDisabled]}>{label}</Text>
      {cost.length > 0 && (
        <Text style={[styles.abilityBtnCost, disabled && styles.abilityBtnCostDisabled]}>{cost}</Text>
      )}
      {cooldown !== undefined && cooldown > 0 && (
        <Text style={styles.abilityBtnCooldown}>CD {cooldown.toFixed(1)}s</Text>
      )}
      {reason !== undefined && reason.length > 0 && disabled && (
        <Text style={styles.abilityBtnReason}>{reason}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  abilityBtn: {
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7a3b00',
    backgroundColor: '#7a3b00',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  abilityBtnDisabled: { backgroundColor: '#e6e6ea', borderColor: '#bbb' },
  abilityBtnLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
  abilityBtnLabelDisabled: { color: '#888' },
  abilityBtnCost: { fontSize: 10, color: '#ffd9a0' },
  abilityBtnCostDisabled: { color: '#aaa' },
  abilityBtnCooldown: { fontSize: 10, color: '#ffd9a0', fontStyle: 'italic' },
  abilityBtnReason: { fontSize: 10, color: '#a04040', fontStyle: 'italic' },
});
