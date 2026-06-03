// ─── Battle Screen (Sci-Fi Edition) ───────────────────────────────
// Adapted from the original BattleScreen for the sci-fi GPS RPG.
// Preserves the CT timeline UI while adding Defend, Items, and companion slots.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useCombatStore } from '@/stores/combatStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useWorldStore } from '@/stores/worldStore';
import { createEngine, type CombatEngine } from '@/domain/combat';
import { buildPlayerUnit, buildEnemyUnit } from '@/domain/combat/factory';
import { ABILITIES } from '@/content/abilities';
import { SPECIALIZATIONS } from '@/content/specializations';
import { decideCompanionAction } from '@/features/combat/companionAI';
import type { Skill, SkillId } from '@/content/types';
import type { Action, Unit, InstanceId } from '@/domain/combat/types';

interface BattleScreenProps {
  onVictory?: () => void;
  onDefeat?: () => void;
  onFlee?: () => void;
}

const skillLookup = (id: SkillId): Skill | undefined => ABILITIES[id];

// ─── Component ─────────────────────────────────────────────────────

export const BattleScreen: React.FC<BattleScreenProps> = ({
  onVictory,
  onDefeat,
  onFlee,
}) => {
  const character = useCharacterStore();
  const world = useWorldStore();
  const combat = useCombatStore();

  const [engine, setEngine] = useState<CombatEngine | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<InstanceId | null>(null);
  const [isDefending, setIsDefending] = useState(false);

  // Initialize combat engine
  useEffect(() => {
    if (!character.activeSpecId) return;

    const spec = SPECIALIZATIONS[character.activeSpecId];
    if (!spec) return;

    const playerUnit = buildPlayerUnit(spec, {
      instanceId: 'player',
      team: 'player',
      classRank: 0,
    });

    // Build a sample enemy based on the active spawn
    const spawn = world.visibleSpawns.find((s) => s.id === world.activeEncounterId);
    const enemyTier = spawn?.tier ?? world.playerTier;
    const enemyUnit = buildEnemyUnit(
      {
        id: 'scavenger_drone' as import('@/content/types').EnemyArchetypeId,
        name: spawn?.label ?? 'Hostile Patrol',
        role: 'basic',
        signature: '',
        stressAxis: '',
        scaling: [
          { tier: 1, hp: 40, atk: 12, def: 3, ctPerTick: 8 },
          { tier: 2, hp: 70, atk: 20, def: 6, ctPerTick: 9 },
          { tier: 3, hp: 120, atk: 32, def: 10, ctPerTick: 10 },
          { tier: 4, hp: 200, atk: 50, def: 16, ctPerTick: 11 },
        ],
        description: '',
      },
      { instanceId: 'enemy_1', tier: Math.min(enemyTier, 4) as 1 | 2 | 3 | 4, team: 'enemy' },
    );

    const eng = createEngine({
      seed: spawn?.seed ?? Date.now(),
      units: [playerUnit, enemyUnit],
      skillLookup,
    });

    setEngine(eng);
  }, [character.activeSpecId, world.activeEncounterId]);

  // Handle action dispatch
  const dispatchAction = useCallback(
    (action: Action) => {
      if (!engine) return;

      // Advance CT until a unit is ready
      let current = engine;
      while (!current.ready() && current.state.result === 'ongoing') {
        current = current.advance();
      }

      if (current.state.result !== 'ongoing') {
        handleBattleEnd(current);
        return;
      }

      // If it's the enemy's turn, auto-play
      const readyUnit = current.ready();
      if (readyUnit && readyUnit.team === 'enemy') {
        const enemyAction: Action = {
          kind: 'basic_attack',
          unitId: readyUnit.id,
          targetId: 'player' as InstanceId,
        };
        const { engine: nextEngine } = current.step(enemyAction);
        setEngine(nextEngine);
        if (nextEngine.state.result !== 'ongoing') {
          handleBattleEnd(nextEngine);
        }
        return;
      }

      // If it's a companion's turn, auto-decide and dispatch
      if (readyUnit && readyUnit.isCompanion) {
        const companionAction = decideCompanionAction(readyUnit, current.state);
        const { engine: nextEngine } = current.step(companionAction);
        setEngine(nextEngine);
        if (nextEngine.state.result !== 'ongoing') {
          handleBattleEnd(nextEngine);
        }
        return;
      }

      // Player action
      const { engine: nextEngine } = current.step(action);
      setEngine(nextEngine);

      if (nextEngine.state.result !== 'ongoing') {
        handleBattleEnd(nextEngine);
      }

      // Reset selection
      setSelectedSkill(null);
      setSelectedTarget(null);
      setIsDefending(false);
    },
    [engine],
  );

  const handleBattleEnd = useCallback(
    (eng: CombatEngine) => {
      if (eng.state.result === 'won') {
        // Grant XP and credits
        const xpGain = 20 + world.playerTier * 15;
        const creditGain = 10 + world.playerTier * 5;
        character.addXp(xpGain);
        character.addCredits(creditGain);

        // Record defeated enemies in the bestiary
        const enemies = Object.values(eng.state.units).filter(
          (u) => u.team === 'enemy' && u.isDead && u.archetypeId,
        );
        for (const enemy of enemies) {
          if (enemy.archetypeId) {
            // Estimate damage dealt (enemy lost HP = their max HP minus remaining)
            const damageEstimate = enemy.hpMax - enemy.hp;
            character.recordEnemyDefeated(
              enemy.archetypeId,
              enemy.displayName,
              Math.max(0, damageEstimate),
            );
          }
        }

        setTimeout(() => {
          world.clearEncounter();
          onVictory?.();
        }, 500);
      } else if (eng.state.result === 'lost') {
        setTimeout(() => {
          world.clearEncounter();
          onDefeat?.();
        }, 500);
      }
    },
    [character, world, onVictory, onDefeat],
  );

  // ── Render helpers ──

  const playerUnit = engine?.state.units['player' as InstanceId];
  const enemyUnits = useMemo(
    () =>
      engine
        ? Object.values(engine.state.units).filter((u) => u.team === 'enemy' && !u.isDead)
        : [],
    [engine],
  );

  const playerSkills = useMemo(() => {
    if (!playerUnit) return [];
    const skills: Skill[] = [];
    for (const sid of playerUnit.skillIds) {
      const skill = ABILITIES[sid];
      if (skill) skills.push(skill);
    }
    return skills;
  }, [playerUnit]);

  // Loading state
  if (!engine || !playerUnit) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Initializing Combat Grid...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Enemy Area ── */}
      <View style={styles.enemyArea}>
        {enemyUnits.map((enemy) => (
          <TouchableOpacity
            key={enemy.id}
            style={[
              styles.enemyCard,
              selectedTarget === enemy.id && styles.selectedTarget,
            ]}
            onPress={() => setSelectedTarget(enemy.id)}
            disabled={!selectedSkill}
          >
            <Text style={styles.enemyName}>{enemy.displayName}</Text>
            <View style={styles.hpBarOuter}>
              <View
                style={[
                  styles.hpBarInner,
                  {
                    width: `${Math.max(0, (enemy.hp / enemy.hpMax) * 100)}%`,
                    backgroundColor:
                      enemy.hp / enemy.hpMax > 0.5 ? '#ff4444' : '#ff8800',
                  },
                ]}
              />
            </View>
            <Text style={styles.enemyHp}>
              {enemy.hp}/{enemy.hpMax}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Player Area ── */}
      <View style={styles.playerArea}>
        <Text style={styles.playerName}>{character.characterName}</Text>
        <View style={styles.hpBarOuter}>
          <View
            style={[
              styles.hpBarInner,
              {
                width: `${Math.max(0, (playerUnit.hp / playerUnit.hpMax) * 100)}%`,
                backgroundColor: '#00ff88',
              },
            ]}
          />
        </View>
        <Text style={styles.playerHp}>
          HP: {playerUnit.hp}/{playerUnit.hpMax} | MP: {playerUnit.mp}/{playerUnit.mpMax}
        </Text>
        {/* CT indicator */}
        <View style={styles.ctBar}>
          <View
            style={[
              styles.ctFill,
              { width: `${Math.max(0, 100 - (playerUnit.ct / (playerUnit.ct + 50)) * 100)}%` },
            ]}
          />
          <Text style={styles.ctText}>CT: {playerUnit.ct.toFixed(0)}</Text>
        </View>
      </View>

      {/* ── Action Bar ── */}
      <View style={styles.actionBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Defend Button */}
          <TouchableOpacity
            style={[styles.actionBtn, isDefending && styles.selectedAction]}
            onPress={() => {
              setIsDefending(true);
              setSelectedSkill(null);
              dispatchAction({ kind: 'defend', unitId: playerUnit.id });
            }}
          >
            <Text style={styles.actionIcon}>🛡️</Text>
            <Text style={styles.actionLabel}>Defend</Text>
          </TouchableOpacity>

          {/* Item Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              dispatchAction({
                kind: 'use_item',
                unitId: playerUnit.id,
                itemSkillId: 'skill.use_stimpack' as SkillId,
              });
            }}
          >
            <Text style={styles.actionIcon}>💉</Text>
            <Text style={styles.actionLabel}>Stim</Text>
          </TouchableOpacity>

          {/* Skill Buttons */}
          {playerSkills.map((skill) => (
            <TouchableOpacity
              key={skill.id}
              style={[
                styles.actionBtn,
                selectedSkill === skill.id && styles.selectedAction,
              ]}
              onPress={() => {
                if (selectedSkill === skill.id) {
                  // Deselect
                  setSelectedSkill(null);
                  setSelectedTarget(null);
                } else {
                  setSelectedSkill(skill.id);
                  setIsDefending(false);
                }
              }}
            >
              <Text style={styles.actionIcon}>
                {skill.tags?.includes('burst') ? '💥' :
                 skill.tags?.includes('control') ? '⚡' :
                 skill.tags?.includes('defense_break') ? '🔓' :
                 skill.tags?.includes('aoe') ? '💫' :
                 skill.tags?.includes('execute') ? '☠️' : '⚔️'}
              </Text>
              <Text style={styles.actionLabel}>{skill.name}</Text>
              <Text style={styles.actionCost}>CT:{String(skill.ctCost)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Confirm Target Button */}
        {selectedSkill && selectedTarget && (
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => {
              dispatchAction({
                kind: 'cast_skill',
                unitId: playerUnit.id,
                skillId: selectedSkill,
                targetIds: [selectedTarget],
              });
            }}
          >
            <Text style={styles.confirmText}>Execute</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a1a' },
  loadingText: { color: '#00ffff', fontSize: 16, fontFamily: 'JetBrainsMono' },

  // Enemy area
  enemyArea: {
    flex: 2,
    padding: 16,
    justifyContent: 'center',
    gap: 8,
  },
  enemyCard: {
    backgroundColor: 'rgba(255, 50, 50, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 50, 50, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  selectedTarget: {
    borderColor: '#ff8800',
    backgroundColor: 'rgba(255, 136, 0, 0.15)',
  },
  enemyName: { color: '#ff6666', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  hpBarOuter: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  hpBarInner: { height: '100%', borderRadius: 3 },
  enemyHp: { color: '#886666', fontSize: 11, marginTop: 2, fontFamily: 'JetBrainsMono' },

  // Player area
  playerArea: {
    padding: 16,
    backgroundColor: 'rgba(0, 255, 150, 0.05)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 255, 150, 0.2)',
  },
  playerName: { color: '#00ff88', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  playerHp: { color: '#668877', fontSize: 11, marginTop: 4, fontFamily: 'JetBrainsMono' },
  ctBar: {
    height: 4,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  ctFill: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  ctText: {
    color: '#448888',
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'JetBrainsMono',
    textAlign: 'right',
  },

  // Action bar
  actionBar: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  selectedAction: {
    borderColor: '#00ffff',
    backgroundColor: 'rgba(0,255,255,0.15)',
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { color: '#aabbcc', fontSize: 10, marginTop: 2, textAlign: 'center' },
  actionCost: { color: '#556677', fontSize: 8, marginTop: 1, fontFamily: 'JetBrainsMono' },
  confirmBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  confirmText: { color: '#00ffff', fontSize: 16, fontWeight: '700' },
});
