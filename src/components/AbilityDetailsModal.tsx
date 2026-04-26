import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SKILL_BY_ID } from '@/content';
import { isSpecified, type Skill, type SkillEffect, type SkillId } from '@/content/types';
import { SYNTHETIC_BASIC_ATTACK } from '@/domain/combat';

interface AbilityDetailsModalProps {
  /** SkillId to show details for, or null when modal is hidden. */
  skillId: SkillId | null;
  onClose: () => void;
}

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

export function AbilityDetailsModal({ skillId, onClose }: AbilityDetailsModalProps) {
  const visible = skillId !== null;
  const skill = skillId !== null ? resolveSkill(skillId) : undefined;

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
