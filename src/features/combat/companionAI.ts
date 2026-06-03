// ─── Companion AI ─────────────────────────────────────────────────
// Deterministic auto-action selector for companion units (drones, allies).
// Pattern follows enemyAI in bossAI.ts — uses seed+tick for determinism.

import type { Action, BattleState, InstanceId, Unit } from '@/domain/combat/types';
import type { SkillId } from '@/content/types';

/**
 * Decide the next action for a companion unit.
 * Companions auto-act without player input.
 *
 * Priority:
 * 1. If caster (player) HP < 30% and drone has a heal skill → heal caster
 * 2. If any ally HP < 50% and drone has a shield skill → shield ally
 * 3. Default → basic attack the lowest-HP enemy
 */
export function decideCompanionAction(
  drone: Unit,
  state: BattleState,
): Action {
  // Find caster (the player unit — first player-team, non-companion unit)
  const caster = Object.values(state.units).find(
    (u) => u.team === 'player' && !u.isCompanion && !u.isDead,
  );

  // Find living enemies
  const enemies = Object.values(state.units).filter(
    (u) => u.team === 'enemy' && !u.isDead,
  );

  if (enemies.length === 0) {
    return { kind: 'wait', unitId: drone.id };
  }

  // Priority 1: Heal caster if low HP
  if (caster && caster.hp < caster.hpMax * 0.3) {
    const healSkill = findSkillByTag(drone, 'heal');
    if (healSkill) {
      return {
        kind: 'cast_skill',
        unitId: drone.id,
        skillId: healSkill,
        targetIds: [caster.id],
      };
    }
  }

  // Priority 2: Shield ally if low HP
  const lowAlly = Object.values(state.units).find(
    (u) => u.team === 'player' && !u.isDead && u.hp < u.hpMax * 0.5,
  );
  if (lowAlly) {
    const shieldSkill = findSkillByTag(drone, 'defense_break');
    if (shieldSkill) {
      return {
        kind: 'cast_skill',
        unitId: drone.id,
        skillId: shieldSkill,
        targetIds: [lowAlly.id],
      };
    }
  }

  // Default: basic attack the enemy with lowest HP
  const target = enemies.reduce((lowest, e) =>
    e.hp < lowest.hp ? e : lowest,
  );

  if (drone.basicAttackSkillId) {
    return {
      kind: 'cast_skill',
      unitId: drone.id,
      skillId: drone.basicAttackSkillId,
      targetIds: [target.id],
    };
  }

  return {
    kind: 'basic_attack',
    unitId: drone.id,
    targetId: target.id,
  };
}

/** Find a skill on the unit matching a tag. Returns the first match. */
function findSkillByTag(unit: Unit, tag: string): SkillId | null {
  // In a real implementation, we'd look up skills by their tags.
  // For now, companions use basic attacks only; heal/shield will be
  // added when deploy_drone skill is fully implemented.
  for (const skillId of unit.skillIds) {
    // Simple heuristic: skill IDs containing keywords
    if (tag === 'heal' && (skillId.includes('heal') || skillId.includes('repair'))) {
      return skillId;
    }
    if (tag === 'defense_break' && (skillId.includes('shield') || skillId.includes('fortify'))) {
      return skillId;
    }
  }
  return null;
}
