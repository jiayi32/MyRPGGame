/**
 * WaterfallCommandMenu — AQ-style command menu for battle.
 *
 * Single self-contained state machine:
 *
 *   root ─┬─► (Attack)  ──► targeting (basic skill)
 *         ├─► Skills    ──► targeting (single_*) or dispatch (self/aoe)
 *         ├─► Items     ──► targeting or dispatch  (Phase 4: gear abilities)
 *         ├─► Tactics   ──► Defend → dispatch
 *         └─► Flee      ──► dispatch
 *
 * Per COMBATSYSTEM.md §13, target-dependent skills (single_enemy /
 * single_ally) ALWAYS open the TargetPicker — even when a single target
 * is the only valid pick. There is no auto-target fallback in this menu;
 * the engine never sees a missing-target action for those skills.
 *
 * Self / all_enemies / all_allies / self_and_allies / random_enemies dispatch
 * directly: 'self' resolves to the active unit; the rest are passed as an
 * empty target array and the combat engine fans out.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import TargetPicker from './TargetPicker';
import { Colors, Spacing, BorderRadius } from '../../../styles/theme';
import { getSkillById } from '../../../services/gamification/CampaignDefinitions';
import { COVER_ACTION_ID, FLEE_ACTION_ID } from '../../../services/gamification/CombatEngine';
import type {
  Equipment,
  QueueUnit,
  SkillDefinition,
  SkillTargetType,
} from '../../../services/gamification/CampaignTypes';

interface Props {
  unit: QueueUnit;
  enemies: readonly QueueUnit[];
  allies: readonly QueueUnit[];
  isBossBattle: boolean;
  /**
   * Equipment currently worn by the active unit. Each item whose
   * `activeAbilitySkillId` resolves to a known SkillDefinition contributes
   * one entry to the Items sub-menu. Order is the slot order returned by
   * `resolveEquippedItems` (weapon → armour → accessory).
   */
  equippedGearItems: readonly Equipment[];
  onCommand: (skillId: string, targetUnitIds: string[]) => void;
}

type SubMenu = 'root' | 'skills' | 'items' | 'tactics';

type Mode =
  | { kind: 'root' }
  | { kind: 'skills' }
  | { kind: 'items' }
  | { kind: 'tactics' }
  | {
      kind: 'targeting';
      skillId: string;
      label: string;
      side: 'enemy' | 'ally';
      returnTo: SubMenu;
    };

/** Targets that demand a TargetPicker per COMBATSYSTEM.md §13. */
function needsManualTarget(t: SkillTargetType): boolean {
  return t === 'single_enemy' || t === 'single_ally';
}

/** Resolve auto-targetable skills to a target list (used for non-manual types). */
function autoTargetIds(def: SkillDefinition, self: QueueUnit): string[] {
  if (def.targetType === 'self') return [self.unitId];
  // all_enemies / all_allies / self_and_allies / random_enemies — engine fans out.
  return [];
}

/** Disabled if on cooldown or mana cost can't be paid. */
function isSkillDisabled(def: SkillDefinition, unit: QueueUnit): boolean {
  if ((unit.cooldowns[def.id] ?? 0) > 0) return true;
  if ((def.manaCost ?? 0) > unit.mana) return true;
  return false;
}

export default function WaterfallCommandMenu({
  unit,
  enemies,
  allies,
  isBossBattle,
  equippedGearItems,
  onCommand,
}: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'root' });

  // ── Derived combat data ───────────────────────────────────────────
  const aliveEnemies = useMemo(() => enemies.filter(e => !e.isKO), [enemies]);
  const aliveAllies = useMemo(() => allies.filter(a => !a.isKO), [allies]);

  const skillEntries = useMemo(
    () =>
      unit.skillIds
        .map(id => ({ id, def: getSkillById(id) as SkillDefinition | undefined }))
        .filter((e): e is { id: string; def: SkillDefinition } =>
          !!e.def && (e.def.skillType === 'basic' || e.def.skillType === 'active')),
    [unit.skillIds],
  );

  const basicSkill = useMemo(
    () => skillEntries.find(e => e.def.skillType === 'basic')?.def ?? null,
    [skillEntries],
  );

  const activeSkills = useMemo(
    () => skillEntries.filter(e => e.def.skillType === 'active'),
    [skillEntries],
  );

  // Equipped gear active abilities. Each Equipment may carry an
  // `activeAbilitySkillId` that resolves through the same getSkillById path
  // as class skills (gear abilities are merged into ALL_SKILLS_INDEX at
  // module load — see CampaignDefinitions.ts). Items without an ability,
  // or with an unknown skill ID, are silently dropped.
  const itemAbilities = useMemo(
    () =>
      equippedGearItems
        .map(item => {
          const skillId = item.activeAbilitySkillId;
          if (!skillId) return null;
          const def = getSkillById(skillId) as SkillDefinition | undefined;
          if (!def || def.skillType !== 'active') return null;
          return { id: skillId, def };
        })
        .filter((e): e is { id: string; def: SkillDefinition } => e !== null),
    [equippedGearItems],
  );

  // ── Dispatch + targeting ──────────────────────────────────────────
  const dispatch = useCallback(
    (skillId: string, targetUnitIds: string[]) => {
      setMode({ kind: 'root' });
      onCommand(skillId, targetUnitIds);
    },
    [onCommand],
  );

  /**
   * Decide whether a skill needs the TargetPicker. If yes, push to
   * targeting mode. If not, dispatch immediately.
   */
  const beginSkill = useCallback(
    (def: SkillDefinition, returnTo: SubMenu) => {
      if (needsManualTarget(def.targetType)) {
        const side: 'enemy' | 'ally' = def.targetType === 'single_ally' ? 'ally' : 'enemy';
        const pool = side === 'ally' ? aliveAllies : aliveEnemies;
        if (pool.length === 0) return; // shouldn't happen — submenu hides skill
        setMode({
          kind: 'targeting',
          skillId: def.id,
          label: def.name,
          side,
          returnTo,
        });
        return;
      }
      dispatch(def.id, autoTargetIds(def, unit));
    },
    [aliveAllies, aliveEnemies, unit, dispatch],
  );

  const handleAttack = useCallback(() => {
    if (basicSkill) beginSkill(basicSkill, 'root');
  }, [basicSkill, beginSkill]);

  const handleDefend = useCallback(() => {
    // Cover (Defend) is self-targeted innate — no picker, no skill lookup.
    dispatch(COVER_ACTION_ID, [unit.unitId]);
  }, [dispatch, unit.unitId]);

  const handleFlee = useCallback(() => {
    if (isBossBattle) return;
    dispatch(FLEE_ACTION_ID, []);
  }, [dispatch, isBossBattle]);

  const handleTargetSelect = useCallback(
    (targetId: string) => {
      if (mode.kind !== 'targeting') return;
      dispatch(mode.skillId, [targetId]);
    },
    [mode, dispatch],
  );

  const handleCancelTargeting = useCallback(() => {
    if (mode.kind !== 'targeting') return;
    setMode({ kind: mode.returnTo } as Mode);
  }, [mode]);

  const handleBack = useCallback(() => setMode({ kind: 'root' }), []);

  // ── Render ────────────────────────────────────────────────────────
  if (mode.kind === 'targeting') {
    const pool = mode.side === 'ally' ? aliveAllies : aliveEnemies;
    return (
      <TargetPicker
        prompt={`${mode.label} → ${mode.side === 'ally' ? 'Select an ally' : 'Select a target'}`}
        targets={pool}
        onSelect={handleTargetSelect}
        onCancel={handleCancelTargeting}
      />
    );
  }

  if (mode.kind === 'root') {
    return (
      <View style={styles.root}>
        <View style={styles.motherRow}>
          <MotherButton
            label="Attack"
            color="rgba(100,100,100,0.85)"
            disabled={!basicSkill}
            onPress={handleAttack}
          />
          <MotherButton
            label="Skills"
            color="rgba(74,144,217,0.85)"
            disabled={activeSkills.length === 0}
            onPress={() => setMode({ kind: 'skills' })}
          />
          <MotherButton
            label="Items"
            color="rgba(156,89,209,0.85)"
            disabled={itemAbilities.length === 0}
            onPress={() => setMode({ kind: 'items' })}
          />
          <MotherButton
            label="Tactics"
            color="rgba(76,175,80,0.85)"
            onPress={() => setMode({ kind: 'tactics' })}
          />
          <MotherButton
            label={isBossBattle ? 'No Flee' : 'Flee'}
            color="rgba(255,152,0,0.85)"
            disabled={isBossBattle}
            onPress={handleFlee}
          />
        </View>
      </View>
    );
  }

  // Sub-menus (skills / items / tactics)
  return (
    <View style={styles.root}>
      <View style={styles.subHeader}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.subTitle}>
          {mode.kind === 'skills' ? 'Skills' : mode.kind === 'items' ? 'Items' : 'Tactics'}
        </Text>
        <View style={styles.backBtnSpacer} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subRow}
      >
        {mode.kind === 'skills' &&
          activeSkills.map(({ id, def }) => (
            <SkillButton
              key={id}
              def={def}
              disabled={isSkillDisabled(def, unit)}
              cooldown={unit.cooldowns[id] ?? 0}
              onPress={() => beginSkill(def, 'skills')}
            />
          ))}

        {mode.kind === 'items' && (
          itemAbilities.length === 0 ? (
            <Text style={styles.emptyText}>No equipped item abilities.</Text>
          ) : (
            itemAbilities.map(({ id, def }) => (
              <SkillButton
                key={id}
                def={def}
                disabled={isSkillDisabled(def, unit)}
                cooldown={unit.cooldowns[id] ?? 0}
                onPress={() => beginSkill(def, 'items')}
              />
            ))
          )
        )}

        {mode.kind === 'tactics' && (
          <Pressable style={[styles.skillBtn, styles.defendBtn]} onPress={handleDefend}>
            <Text style={styles.skillInitial}>🛡</Text>
            <Text style={styles.skillName}>Defend</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

interface MotherButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}

function MotherButton({ label, color, disabled, onPress }: MotherButtonProps) {
  return (
    <Pressable
      style={[styles.motherBtn, { backgroundColor: color }, disabled && styles.disabledBtn]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.motherText}>{label}</Text>
    </Pressable>
  );
}

interface SkillButtonProps {
  def: SkillDefinition;
  disabled: boolean;
  cooldown: number;
  onPress: () => void;
}

function SkillButton({ def, disabled, cooldown, onPress }: SkillButtonProps) {
  return (
    <Pressable
      style={[styles.skillBtn, disabled && styles.disabledBtn]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.skillInitial}>{def.name.charAt(0).toUpperCase()}</Text>
      <Text style={styles.skillName} numberOfLines={1}>{def.name}</Text>
      {(def.manaCost ?? 0) > 0 && (
        <View style={styles.manaBadge}>
          <Text style={styles.manaText}>{def.manaCost}</Text>
        </View>
      )}
      {cooldown > 0 && (
        <View style={styles.cooldownOverlay}>
          <Text style={styles.cooldownText}>{cooldown}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: Spacing.sm,
  },
  motherRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  motherBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    minHeight: 44,
  },
  motherText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  backBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 60,
  },
  backBtnSpacer: { minWidth: 60 },
  backText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  subTitle: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subRow: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
    minHeight: 64,
  },
  skillBtn: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(74,144,217,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  defendBtn: {
    backgroundColor: 'rgba(76,175,80,0.85)',
    borderColor: 'rgba(200,255,200,0.4)',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  skillInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  skillName: {
    color: '#fff',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  manaBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#6A5ACD',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  manaText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  cooldownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cooldownText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
  },
});
