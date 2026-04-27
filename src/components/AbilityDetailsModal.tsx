import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SKILL_BY_ID } from '@/content';
import { isSpecified, type DamageType, type Skill, type SkillEffect, type SkillId } from '@/content/types';
import {
  computeHitThresholds,
  SEVERITY_CRIT_MAX,
  SEVERITY_CRIT_MIN,
  SEVERITY_NORMAL,
  SEVERITY_STRONG,
  SYNTHETIC_BASIC_ATTACK,
  applyResistance,
  defenseFor,
  effectiveStats,
  mitigate,
  resistanceFor,
  type Unit,
} from '@/domain/combat';

interface AbilityDetailsModalProps {
  /** SkillId to show details for, or null when modal is hidden. */
  skillId: SkillId | null;
  /** Current caster (player) for stat-aware previews. */
  caster: Unit | null;
  /** Current selected target for enemy-defense-aware previews. */
  target: Unit | null;
  onClose: () => void;
}

type DamagePreview =
  | { kind: 'needs_target' }
  | { kind: 'no_damage' }
  | {
      kind: 'range';
      failPct: number;
      normalPct: number;
      strongPct: number;
      critPct: number;
      normalHit: number;
      strongHit: number;
      critMin: number;
      critMax: number;
    };

/** Resolve the skill record for display, including the synthetic basic attack fallback. */
function resolveSkill(skillId: SkillId): Skill | undefined {
  if (skillId === SYNTHETIC_BASIC_ATTACK.id) return SYNTHETIC_BASIC_ATTACK;
  return SKILL_BY_ID.get(skillId);
}

function formatMagnitude(effect: SkillEffect): string {
  if (effect.magnitude === undefined || !isSpecified(effect.magnitude)) return '';
  const value = effect.magnitude;
  switch (effect.magnitudeUnit) {
    case 'percent':
      return `${(value * 100).toFixed(0)}%`;
    case 'multiplier':
      return `${value.toFixed(2)}×`;
    case 'hp_percent':
    case 'max_hp_percent':
      return `${(value * 100).toFixed(0)}% HP`;
    case 'mp_percent':
      return `${(value * 100).toFixed(0)}% MP`;
    case 'flat':
    default:
      return `${value}`;
  }
}

function describeEffect(effect: SkillEffect, index: number): string {
  const mag = formatMagnitude(effect);
  const dmg = effect.damageType ? ` (${effect.damageType})` : '';
  const dur =
    effect.durationSec !== undefined && isSpecified(effect.durationSec)
      ? ` for ${effect.durationSec}s`
      : '';
  const stacks =
    effect.stacks !== undefined && isSpecified(effect.stacks) && effect.stacks > 1
      ? ` (×${effect.stacks})`
      : '';
  const chance =
    effect.chance !== undefined && isSpecified(effect.chance)
      ? ` @ ${(effect.chance * 100).toFixed(0)}%`
      : '';
  const tag = effect.statTag ? ` → ${effect.statTag}` : '';
  const head = `${index + 1}. ${effect.kind}${dmg}${tag}`;
  const detail = [mag, dur, stacks, chance].filter((s) => s.length > 0).join(' ');
  return detail.length > 0 ? `${head}: ${detail}` : head;
}

function describeCost(skill: Skill): string {
  const r = skill.resource;
  if (r.type === 'MP' && isSpecified(r.cost)) return `${r.cost} MP`;
  if (r.type === 'HP' && isSpecified(r.cost)) return `${(r.cost * 100).toFixed(0)}% HP`;
  return 'Free';
}

function describeCT(skill: Skill): string {
  if (!isSpecified(skill.ctCost)) return '—';
  return `${skill.ctCost}`;
}

function describeCooldown(skill: Skill): string {
  if (!isSpecified(skill.cooldownSec)) return 'none';
  if (skill.cooldownSec === 0) return 'none';
  return `${skill.cooldownSec}s`;
}

function computePowerBase(
  caster: Unit,
  magnitude: number,
  magnitudeUnit: SkillEffect['magnitudeUnit'],
  damageType: DamageType,
  target: Unit,
): number {
  const casterStats = effectiveStats(caster);
  switch (magnitudeUnit) {
    case 'flat':
      return magnitude;
    case 'max_hp_percent':
      return target.hpMax * magnitude;
    case 'hp_percent':
      return target.hp * magnitude;
    case 'mp_percent':
      return target.mp * magnitude;
    case 'percent':
    case 'multiplier':
    default: {
      const power = damageType === 'physical' ? casterStats.strength : casterStats.intellect;
      return power * magnitude;
    }
  }
}

function damagePreviewForSkill(
  skill: Skill,
  caster: Unit | null,
  target: Unit | null,
): DamagePreview {
  if (caster === null || target === null) {
    return { kind: 'needs_target' };
  }

  const targetStats = effectiveStats(target);
  let baseResisted = 0;
  let foundDamageEffect = false;

  for (const effect of skill.effects) {
    if (effect.kind !== 'damage') continue;
    if (effect.magnitude === undefined || !isSpecified(effect.magnitude)) continue;

    foundDamageEffect = true;
    const damageType = effect.damageType ?? 'physical';
    const raw = computePowerBase(
      caster,
      effect.magnitude,
      effect.magnitudeUnit,
      damageType,
      target,
    );
    const mitigated = mitigate(raw, defenseFor(targetStats, damageType));
    const resisted = applyResistance(mitigated, resistanceFor(targetStats, damageType));
    baseResisted += Math.max(0, resisted);
  }

  if (!foundDamageEffect) {
    return { kind: 'no_damage' };
  }

  const casterStats = effectiveStats(caster);
  const hitThresholds = computeHitThresholds(
    casterStats.agility,
    targetStats.agility,
    casterStats.critChance,
  );
  const rawFail = skill.neverMiss
    ? 0
    : Math.max(0, hitThresholds.failThreshold - (skill.accuracyBonus ?? 0));
  const failPct = rawFail * 5;
  const critPct = (21 - hitThresholds.critThreshold) * 5;
  const strongPct = (hitThresholds.critThreshold - hitThresholds.strongThreshold) * 5;
  const normalPct = Math.max(0, 100 - failPct - strongPct - critPct);

  return {
    kind: 'range',
    failPct,
    normalPct,
    strongPct,
    critPct,
    normalHit: Math.max(0, Math.round(baseResisted * SEVERITY_NORMAL)),
    strongHit: Math.max(0, Math.round(baseResisted * SEVERITY_STRONG)),
    critMin: Math.max(0, Math.round(baseResisted * SEVERITY_CRIT_MIN)),
    critMax: Math.max(0, Math.round(baseResisted * SEVERITY_CRIT_MAX)),
  };
}

export function AbilityDetailsModal({ skillId, caster, target, onClose }: AbilityDetailsModalProps) {
  const visible = skillId !== null;
  const skill = skillId !== null ? resolveSkill(skillId) : undefined;
  const damagePreview = skill !== undefined ? damagePreviewForSkill(skill, caster, target) : null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* Inner Pressable swallows taps so the card stays open when tapped on. */}
        <Pressable style={styles.card} onPress={() => undefined}>
          {skill === undefined ? (
            <Text style={styles.title}>Unknown ability</Text>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{skill.name}</Text>
              </View>
              <Text style={styles.description}>{skill.description}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>Cost</Text>
                  <Text style={styles.statValue}>{describeCost(skill)}</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>CT</Text>
                  <Text style={styles.statValue}>{describeCT(skill)}</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>Cooldown</Text>
                  <Text style={styles.statValue}>{describeCooldown(skill)}</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>Target</Text>
                  <Text style={styles.statValue}>{skill.target}</Text>
                </View>
              </View>

              <View style={styles.damageRangeCard}>
                <Text style={styles.damageRangeTitle}>Damage Preview</Text>
                {damagePreview?.kind === 'needs_target' && (
                  <Text style={styles.damageRangeText}>Select an enemy target to preview damage.</Text>
                )}
                {damagePreview?.kind === 'no_damage' && (
                  <Text style={styles.damageRangeText}>No direct damage effects.</Text>
                )}
                {damagePreview?.kind === 'range' && (
                  <>
                    <View style={styles.damageRow}>
                      <Text style={styles.damageTierLabel}>
                        {damagePreview.failPct === 0 ? 'Guaranteed Hit' : `Miss (${damagePreview.failPct}%)`}
                      </Text>
                      <Text style={styles.damageTierValue}>{damagePreview.failPct === 0 ? '—' : '0'}</Text>
                    </View>
                    <View style={styles.damageRow}>
                      <Text style={styles.damageTierLabel}>Hit ({damagePreview.normalPct}%)</Text>
                      <Text style={styles.damageTierValue}>{damagePreview.normalHit}</Text>
                    </View>
                    <View style={styles.damageRow}>
                      <Text style={styles.damageTierLabel}>Strong ({damagePreview.strongPct}%)</Text>
                      <Text style={styles.damageTierValue}>{damagePreview.strongHit}</Text>
                    </View>
                    <View style={styles.damageRow}>
                      <Text style={styles.damageTierLabel}>Crit ({damagePreview.critPct}%)</Text>
                      <Text style={[styles.damageTierValue, styles.damageCritValue]}>
                        {damagePreview.critMin}–{damagePreview.critMax}
                      </Text>
                    </View>
                  </>
                )}
                <Text style={styles.damageRangeFootnote}>
                  Odds use caster agility and crit chance versus target agility; damage uses current caster stats and selected enemy defense/resistance.
                </Text>
              </View>

              {skill.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {skill.tags.map((tag) => (
                    <Text key={tag} style={styles.tag}>
                      {tag}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={styles.sectionLabel}>Effects</Text>
              <ScrollView style={styles.effectsScroll} contentContainerStyle={styles.effectsList}>
                {skill.effects.map((e, i) => (
                  <View key={i} style={styles.effectRow}>
                    <Text style={styles.effectHeader}>{describeEffect(e, i)}</Text>
                    {e.description.length > 0 && (
                      <Text style={styles.effectBody}>{e.description}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 38, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fffdf8',
    borderRadius: 14,
    padding: 18,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#7a3b00',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: '#2b1f10' },
  description: { fontSize: 13, color: '#4a3a28', lineHeight: 19 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e8e0d4',
  },
  statBlock: { flexBasis: '40%', flexGrow: 1 },
  statLabel: { fontSize: 10, color: '#7b684a', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, color: '#2b1f10', fontWeight: '600' },
  damageRangeCard: {
    borderWidth: 1,
    borderColor: '#e8e0d4',
    borderRadius: 8,
    backgroundColor: '#f8f4ec',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  damageRangeTitle: { fontSize: 11, color: '#7b684a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  damageRangeText: { fontSize: 13, color: '#2b1f10', fontWeight: '700' },
  damageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  damageTierLabel: { fontSize: 12, color: '#5a4838' },
  damageTierValue: { fontSize: 13, color: '#2b1f10', fontWeight: '700' },
  damageCritValue: { color: '#b84a00' },
  damageRangeFootnote: { fontSize: 11, color: '#7b684a', marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#7a3b00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#7b684a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  effectsScroll: { maxHeight: 220 },
  effectsList: { gap: 6 },
  effectRow: {
    backgroundColor: '#f6f1e6',
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
  effectHeader: { fontSize: 12, color: '#2b1f10', fontWeight: '700' },
  effectBody: { fontSize: 12, color: '#5a4838', lineHeight: 17 },
  closeBtn: {
    alignSelf: 'center',
    backgroundColor: '#7a3b00',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 6,
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
