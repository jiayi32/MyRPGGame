/**
 * CombatEngine.ts — Turn-based combat engine.
 *
 * Implements:
 * - CT queue turn system (§10.1–10.2)
 * - D20 dice system (§11)
 * - Damage formula with defense mitigation (§13)
 * - Skill cost resolution (§12) — cooldown, mana, HP
 * - Shield absorption
 * - Auto-battle AI (§4.6)
 * - Status effect tick (buffs, debuffs, DoTs, HoTs)
 *
 * The engine is pure — no Firestore, no React. It operates on BattleState
 * and returns new state + turn records. The caller (CampaignContext / BattleScreen)
 * drives the loop and persists results.
 *
 * @see documentation/integration/EXPENSERPG.md §10-§13
 */

import type {
  BattleState,
  BattlePhase,
  QueueUnit,
  TurnRecord,
  DiceRoll,
  StatusEffect,
  StatusSubtype,
  StackPolicy,
  SkillDefinition,
  PassiveDefinition,
  StatBlock,
  AutoBattleConfig,
  BattleResult,
  DamageDie,
  CritSeverity,
  SkillTickEffectConfig,
} from './CampaignTypes';
import { DEFAULT_AUTO_BATTLE_CONFIG } from './CampaignTypes';
import { getSkillById } from './CampaignDefinitions';
import { applyActionCt } from './GearMath';

// ═══════════════════════════════════════════════════════════════════════
// D20 Dice
// ═══════════════════════════════════════════════════════════════════════

/** Roll a D20 (1-20). Accepts injectable RNG for deterministic testing. */
export function rollD20(rng: () => number = Math.random): number {
  return Math.floor(rng() * 20) + 1;
}

// ═══════════════════════════════════════════════════════════════════════
// D20 Success Tiers (legacy — kept for backward compat, no longer used)
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// Damage Dice
// ═══════════════════════════════════════════════════════════════════════

const DIE_MAX: Record<DamageDie, number> = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12,
};

/** Roll a single damage die of the given type. */
export function rollDie(die: DamageDie, rng: () => number = Math.random): number {
  return Math.floor(rng() * DIE_MAX[die]) + 1;
}

/** Roll N damage dice and return total + individual rolls. */
export function rollDamageDice(
  die: DamageDie,
  count: number,
  rng: () => number = Math.random,
): { total: number; rolls: number[] } {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(die, rng));
  }
  return { total: rolls.reduce((a, b) => a + b, 0), rolls };
}

/** Default damage die assignment based on skill unlock rank. */
function getSkillDamageDie(skill: SkillDefinition): { die: DamageDie; count: number } {
  if (skill.damageDie && skill.diceCount) {
    return { die: skill.damageDie, count: skill.diceCount };
  }
  const rank = skill.unlockRank;
  if (rank <= 2) return { die: 'd4', count: 2 };
  if (rank <= 4) return { die: 'd6', count: 2 };
  if (rank <= 6) return { die: 'd8', count: 2 };
  if (rank <= 8) return { die: 'd10', count: 2 };
  return { die: 'd12', count: 3 };
}

// ═══════════════════════════════════════════════════════════════════════
// Critical Hit Severity (d12)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Roll a d12 to determine crit severity and multiplier.
 *   1-5  → minor (×1.5)    42%
 *   6-9  → major (×2.0)    33%
 *   10-11 → devastating (×2.5) 17%
 *   12   → perfect (×3.0)   8%
 */
export function getCritSeverity(
  critBonus: number = 0,
  rng: () => number = Math.random,
): { severity: CritSeverity; multiplier: number; roll: number } {
  const roll = Math.floor(rng() * 12) + 1;
  let severity: CritSeverity;
  let baseMult: number;
  if (roll <= 5) {
    severity = 'minor';
    baseMult = 1.5;
  } else if (roll <= 9) {
    severity = 'major';
    baseMult = 2.0;
  } else if (roll <= 11) {
    severity = 'devastating';
    baseMult = 2.5;
  } else {
    severity = 'perfect';
    baseMult = 3.0;
  }
  return { severity, multiplier: baseMult + critBonus, roll };
}

/** Ranking for comparing crit severity tiers. */
const CRIT_SEVERITY_RANK: Record<CritSeverity, number> = {
  minor: 1, major: 2, devastating: 3, perfect: 4,
};

/** Pokémon-style defense ratio: DEF=0 → 1.0, DEF=20 → 0.71, DEF=40 → 0.56. */
function calculateDefenseFactor(defense: number): number {
  return 100 / (100 + 2 * defense);
}

/** Make a dice roll with purpose and modifier. */
function makeDiceRoll(
  purpose: DiceRoll['purpose'],
  modifier: number = 0,
  rng?: () => number,
): DiceRoll {
  const rollValue = rollD20(rng);
  return {
    rollValue,
    modifier,
    total: rollValue + modifier,
    purpose,
    isCrit: rollValue >= 18, // natural 18-20
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CT Queue
// ═══════════════════════════════════════════════════════════════════════

/**
 * Initialize CT for all units: CT = 100 - speed.
 * Higher speed → lower starting CT → acts sooner.
 */
export function initializeCT(units: QueueUnit[]): QueueUnit[] {
  return units.map(u => ({
    ...u,
    ct: Math.max(1, 100 - u.currentStats.speed),
  }));
}

/**
 * Advance the CT queue: tick all units down until one reaches 0.
 * Returns the unit that acts next and the ticked units array.
 */
export function advanceCTQueue(units: QueueUnit[]): { nextUnit: QueueUnit; updatedUnits: QueueUnit[] } {
  const alive = units.filter(u => !u.isKO);
  if (alive.length === 0) {
    return { nextUnit: units[0], updatedUnits: units };
  }

  // Find the minimum CT among alive units
  const minCT = Math.min(...alive.map(u => u.ct));

  // Subtract minCT from all alive units
  const updated = units.map(u => {
    if (u.isKO) return u;
    return { ...u, ct: u.ct - minCT };
  });

  // Find the first alive unit at CT=0 (defenders/earlier queue position win ties)
  const acting = updated.find(u => !u.isKO && u.ct <= 0);
  if (!acting) {
    // Fallback: first alive unit
    const fallback = updated.find(u => !u.isKO)!;
    return { nextUnit: fallback, updatedUnits: updated };
  }

  return { nextUnit: acting, updatedUnits: updated };
}

// ═══════════════════════════════════════════════════════════════════════
// Damage Formula
// ═══════════════════════════════════════════════════════════════════════

/**
 * Core damage formula (redesigned):
 *   guaranteedBase = skill.baseValue + floor(scalingStat × skillMultiplier)
 *   diceBonus = sum of N rolls of damageDie (doubled on crit)
 *   critMult = 1.0 (normal) or d12-severity multiplier (crit)
 *   preDef = (guaranteedBase + diceBonus) × critMult × (1 + passiveBonuses)
 *   defenseFactor = 100 / (100 + 2 × target.defense)   [Pokémon-style ratio]
 *   finalDamage = max(1, round(preDef × defenseFactor × (1 - damageReduction)))
 */
export function calculateDamage(
  skill: SkillDefinition,
  attacker: QueueUnit,
  defender: QueueUnit,
  diceBonus: number,
  critMultiplier: number,
): number {
  const scalingValue = skill.scalingStat ? attacker.currentStats[skill.scalingStat] : 0;
  const guaranteedBase = skill.baseValue + Math.floor(scalingValue * skill.skillMultiplier);

  let rawDamage = (guaranteedBase + diceBonus) * critMultiplier;

  // Damage bonuses from passives
  rawDamage *= (1 + getDamageBonuses(attacker, defender));

  // Defense factor (Pokémon-style ratio)
  const defenseFactor = calculateDefenseFactor(defender.currentStats.defense);
  rawDamage *= defenseFactor;

  // Damage reduction from cover / status effects
  const damageReduction = getDamageReduction(defender);
  rawDamage *= (1 - damageReduction);

  return Math.max(1, Math.round(rawDamage));
}

/** Get damage reduction from status effects (e.g. cover). */
function getDamageReduction(unit: QueueUnit): number {
  let reduction = 0;
  for (const effect of unit.statusEffects) {
    if (effect.property === 'damage_reduction') {
      reduction += effect.value;
    }
  }
  return Math.min(0.75, reduction); // cap at 75%
}

/** Get crit damage bonus from passives (e.g. Predator's Instinct +0.30). */
function getCritDamageBonus(unit: QueueUnit): number {
  let bonus = 0;
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'crit_damage') bonus += mod.value;
    }
  }
  return bonus;
}

/** Get total damage bonuses from passives applicable to this attack. */
function getDamageBonuses(attacker: QueueUnit, defender: QueueUnit): number {
  let bonus = 0;
  for (const passiveId of attacker.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'damage_vs_debuffed' && defender.statusEffects.some(e => e.type === 'debuff')) {
        bonus += mod.value;
      }
      if (mod.property === 'class_damage') {
        bonus += mod.value;
      }
    }
  }
  return bonus;
}

// ═══════════════════════════════════════════════════════════════════════
// Skill Execution
// ═══════════════════════════════════════════════════════════════════════

export interface SkillExecutionResult {
  turnRecord: TurnRecord;
  diceRolls: DiceRoll[];
  updatedUnits: QueueUnit[];
}

/**
 * Execute a skill: pay costs, roll dice, apply damage/healing/effects.
 * Returns the turn record and updated unit array.
 */
export function executeSkill(
  state: BattleState,
  actingUnitId: string,
  skillId: string,
  targetUnitIds: string[],
  rng?: () => number,
): SkillExecutionResult {
  const skill = getSkillById(skillId) as SkillDefinition | undefined;
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);

  let units = state.units.map(u => ({
    ...u,
    currentStats: { ...u.currentStats },
    cooldowns: { ...u.cooldowns },
    statusEffects: u.statusEffects.map(e => ({ ...e })),
  }));
  const attacker = units.find(u => u.unitId === actingUnitId)!;
  const diceRolls: DiceRoll[] = [];
  const damageDealt: Record<string, number> = {};
  const healingDone: Record<string, number> = {};
  const appliedEffects: StatusEffect[] = [];
  const removedEffects: string[] = [];
  let turnCritSeverity: CritSeverity | undefined;

  // 1. Pay skill costs
  if (skill.costType === 'mana' || skill.costType === 'mixed') {
    const manaCost = getEffectiveManaCost(attacker, skill.manaCost);
    attacker.mana = Math.max(0, attacker.mana - manaCost);
  }
  if (skill.costType === 'hp' || skill.costType === 'mixed') {
    const hpCost = Math.round(attacker.hp * skill.hpCostPct);
    attacker.hp = Math.max(0, attacker.hp - hpCost);
  }
  if (skill.costType === 'cooldown' || skill.costType === 'mixed') {
    attacker.cooldowns[skillId] = getEffectiveCooldown(attacker, skill.cooldownTurns);
  }

  // 2. Resolve by skill effect tags
  if (skill.effectTags.includes('damage')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    const { die, count } = getSkillDamageDie(skill);

    for (let i = 0; i < skill.hitCount; i++) {
      for (const target of targets) {
        // d20 attack roll: hit/miss/crit gate
        const attackRoll = makeDiceRoll('attack', Math.floor(attacker.currentStats.precision / 5), rng);
        diceRolls.push(attackRoll);

        // Natural 1 always misses
        if (attackRoll.rollValue === 1) continue;

        // Hit check: d20 + PRC/5 vs dodge threshold
        const dodgeThreshold = getDodgeThreshold(target);
        if (attackRoll.total < dodgeThreshold) continue; // miss

        // Determine crit (natural 18-20 or guaranteed)
        const isCrit = attackRoll.isCrit || isGuaranteedCrit(skill, target);

        // Roll damage dice (doubled on crit — D&D crit rules)
        const diceCount = isCrit ? count * 2 : count;
        const { total: diceBonus } = rollDamageDice(die, diceCount, rng);
        const damageDiceRoll: DiceRoll = {
          rollValue: diceBonus,
          modifier: 0,
          total: diceBonus,
          purpose: 'damage_dice',
          isCrit,
        };
        diceRolls.push(damageDiceRoll);

        // Crit severity (d12 roll for multiplier)
        let critMultiplier = 1.0;
        if (isCrit) {
          const critResult = getCritSeverity(getCritDamageBonus(attacker), rng);
          critMultiplier = critResult.multiplier;
          if (!turnCritSeverity || CRIT_SEVERITY_RANK[critResult.severity] > CRIT_SEVERITY_RANK[turnCritSeverity]) {
            turnCritSeverity = critResult.severity;
          }
          const critRoll: DiceRoll = {
            rollValue: critResult.roll,
            modifier: 0,
            total: critResult.roll,
            purpose: 'crit_severity',
            isCrit: true,
          };
          diceRolls.push(critRoll);
        }

        const damage = calculateDamage(skill, attacker, target, diceBonus, critMultiplier);
        applyDamageToUnit(target, damage);
        damageDealt[target.unitId] = (damageDealt[target.unitId] || 0) + damage;
      }
    }
  }

  if (skill.effectTags.includes('heal')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    const scalingValue = skill.scalingStat ? attacker.currentStats[skill.scalingStat] : 0;
    const { die, count } = getSkillDamageDie(skill);
    const { total: healDice } = rollDamageDice(die, count, rng);
    for (const target of targets) {
      const baseHeal = Math.floor(target.maxHp * skill.skillMultiplier) + scalingValue;
      const healAmount = baseHeal + healDice;
      const bonus = getHealingBonus(attacker);
      const intended = Math.max(1, Math.round(healAmount * (1 + bonus)));
      const prevHp = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + intended);
      const actual = target.hp - prevHp;
      if (actual > 0) {
        healingDone[target.unitId] = (healingDone[target.unitId] || 0) + actual;
      }
    }
  }

  if (skill.effectTags.includes('hot')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    const hotConfig = resolveTickConfig(skill, attacker, 'hot');
    const { die } = getSkillDamageDie(skill);
    const applicationRoll = rollDie(die, rng);
    for (const target of targets) {
      const tickBase = Math.round(target.maxHp * hotConfig.value);
      const tickBonus = Math.floor(applicationRoll / hotConfig.durationTurns);
      const effect: StatusEffect = {
        id: `hot_${attacker.unitId}_${state.currentTurn}`,
        name: SUBTYPE_DISPLAY_NAME[hotConfig.subtype],
        type: 'buff',
        property: 'hot',
        subtype: hotConfig.subtype,
        value: hotConfig.value,
        turnsRemaining: hotConfig.durationTurns,
        sourceUnitId: attacker.unitId,
        sourceSkillId: skillId,
        tickValue: tickBase + tickBonus,
      };
      if (applyStatusEffect(target, effect, hotConfig.stackPolicy ?? 'refresh')) {
        appliedEffects.push(effect);
      }
    }
  }

  if (skill.effectTags.includes('revive')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    for (const target of targets) {
      if (target.isKO) {
        target.isKO = false;
        const healPct = skill.skillMultiplier || 0.40;
        target.hp = Math.round(target.maxHp * healPct);
        healingDone[target.unitId] = (healingDone[target.unitId] || 0) + target.hp;
      }
    }
  }

  if (skill.effectTags.includes('shield')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    for (const target of targets) {
      const shieldAmount = Math.round(
        (skill.scalingStat ? attacker.currentStats[skill.scalingStat] : attacker.maxHp) * skill.skillMultiplier
      );
      target.shield += shieldAmount;
    }
  }

  if (skill.effectTags.includes('buff')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    for (const target of targets) {
      const effect = createStatusEffect(skill, attacker, 'buff');
      if (applyStatusEffect(target, effect, 'refresh')) {
        appliedEffects.push(effect);
      }
    }
  }

  if (skill.effectTags.includes('debuff')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    for (const target of targets) {
      if (hasPassiveProperty(target, 'debuff_immunity')) continue;
      const effect = createStatusEffect(skill, attacker, 'debuff');
      if (applyStatusEffect(target, effect, 'refresh')) {
        appliedEffects.push(effect);
      }
    }
  }

  if (skill.effectTags.includes('taunt')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    for (const target of targets) {
      const effect: StatusEffect = {
        id: `taunt_${attacker.unitId}_${state.currentTurn}`,
        name: 'Taunted',
        type: 'debuff',
        property: 'forced_target',
        subtype: 'generic',
        value: 0,
        turnsRemaining: 2,
        sourceUnitId: attacker.unitId,
        sourceSkillId: skillId,
      };
      if (applyStatusEffect(target, effect, 'refresh')) {
        appliedEffects.push(effect);
      }
    }
  }

  if (skill.effectTags.includes('dot')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    const dotConfig = resolveTickConfig(skill, attacker, 'dot');
    const { die } = getSkillDamageDie(skill);
    const applicationRoll = rollDie(die, rng);
    for (const target of targets) {
      if (hasPassiveProperty(target, 'debuff_immunity')) continue;
      const tickBase = Math.round(target.maxHp * dotConfig.value);
      const tickBonus = Math.floor(applicationRoll / dotConfig.durationTurns);
      const effect: StatusEffect = {
        id: `dot_${attacker.unitId}_${state.currentTurn}`,
        name: SUBTYPE_DISPLAY_NAME[dotConfig.subtype],
        type: 'debuff',
        property: 'dot',
        subtype: dotConfig.subtype,
        value: dotConfig.value,
        turnsRemaining: dotConfig.durationTurns,
        sourceUnitId: attacker.unitId,
        sourceSkillId: skillId,
        tickValue: tickBase + tickBonus,
      };
      if (applyStatusEffect(target, effect, dotConfig.stackPolicy ?? 'refresh')) {
        appliedEffects.push(effect);
      }
    }
  }

  if (skill.effectTags.includes('dodge')) {
    const effect: StatusEffect = {
      id: `dodge_${attacker.unitId}_${state.currentTurn}`,
      name: 'Evasion',
      type: 'buff',
      property: 'dodge_all',
      subtype: 'generic',
      value: 1,
      turnsRemaining: 1,
      sourceUnitId: attacker.unitId,
      sourceSkillId: skillId,
    };
    if (applyStatusEffect(attacker, effect, 'refresh')) {
      appliedEffects.push(effect);
    }
  }

  if (skill.effectTags.includes('dispel')) {
    const targets = resolveTargets(units, attacker, skill, targetUnitIds);
    for (const target of targets) {
      const buffIds = target.statusEffects.filter(e => e.type === 'buff').map(e => e.id);
      target.statusEffects = target.statusEffects.filter(e => e.type !== 'buff');
      removedEffects.push(...buffIds);
    }
  }

  // 3. Reset acting unit's CT — gear CT reduction is baked into the unit,
  //    already capped at GEAR_CT_REDUCTION_CAP at build time.
  attacker.ct = applyActionCt(skill.ctCost, attacker.gearCtReduction);

  // 4. Check for KOs
  for (const unit of units) {
    if (unit.hp <= 0 && !unit.isKO) {
      // Self-KO from HP cost: if enemy died same turn, prevent self-KO
      if (unit.unitId === actingUnitId && skill.hpCostPct > 0) {
        const enemyKilled = Object.keys(damageDealt).some(tid => {
          const t = units.find(u => u.unitId === tid);
          return t && t.hp <= 0 && t.unitType !== attacker.unitType;
        });
        if (enemyKilled) {
          unit.hp = 1;
          continue;
        }
      }
      unit.isKO = true;
      unit.hp = 0;
    }
  }

  // Build result description
  const targetNames = targetUnitIds
    .map(id => units.find(u => u.unitId === id)?.name || id)
    .join(', ');
  const totalDmg = Object.values(damageDealt).reduce((a, b) => a + b, 0);
  const totalHeal = Object.values(healingDone).reduce((a, b) => a + b, 0);
  let desc = `${attacker.name} used ${skill.name}`;
  if (turnCritSeverity) desc += ` (${turnCritSeverity.toUpperCase()} CRIT!)`;
  if (totalDmg > 0) desc += ` dealing ${totalDmg} damage`;
  if (totalHeal > 0) desc += `${totalDmg > 0 ? ' and' : ''} healed ${totalHeal} HP`;
  if (appliedEffects.length > 0) desc += ` [${appliedEffects.map(e => e.name).join(', ')}]`;
  desc += '.';

  const turnRecord: TurnRecord = {
    turnNumber: state.currentTurn,
    actingUnitId,
    skillId,
    targetUnitIds,
    diceRolls,
    damageDealt,
    healingDone,
    statusEffectsApplied: appliedEffects,
    statusEffectsRemoved: removedEffects,
    resultDescription: desc,
    critSeverity: turnCritSeverity,
  };

  return { turnRecord, diceRolls, updatedUnits: units };
}

// ═══════════════════════════════════════════════════════════════════════
// Innate Actions: Cover & Flee
// ═══════════════════════════════════════════════════════════════════════

/** Cover action ID constant. */
export const COVER_ACTION_ID = '__cover__';
/** Flee action ID constant. */
export const FLEE_ACTION_ID = '__flee__';

/**
 * Execute cover: self-targeted 50% damage reduction buff for 1 turn.
 * CT cost is 60 (acts sooner than a full skill turn — rewards defensive play).
 */
export function executeCover(
  state: BattleState,
  unitId: string,
): SkillExecutionResult {
  const units = state.units.map(u => ({ ...u }));
  const unit = units.find(u => u.unitId === unitId)!;

  const effect: StatusEffect = {
    id: `cover_${unitId}_${state.currentTurn}`,
    name: 'Cover',
    type: 'buff',
    property: 'damage_reduction',
    subtype: 'shield',
    value: 0.5,
    turnsRemaining: 1,
    sourceUnitId: unitId,
    sourceSkillId: COVER_ACTION_ID,
  };

  applyStatusEffect(unit, effect, 'refresh');
  unit.ct = applyActionCt(60, unit.gearCtReduction);

  const turnRecord: TurnRecord = {
    turnNumber: state.currentTurn,
    actingUnitId: unitId,
    skillId: COVER_ACTION_ID,
    targetUnitIds: [unitId],
    diceRolls: [],
    damageDealt: {},
    healingDone: {},
    statusEffectsApplied: [effect],
    statusEffectsRemoved: [],
    resultDescription: `${unit.name} takes a defensive stance! (50% damage reduction)`,
  };

  return { turnRecord, diceRolls: [], updatedUnits: units };
}

/**
 * Execute flee: D20 + SPD/10 vs threshold (10 + difficulty*2).
 * Success: battle ends (fleeFlag=true, result='defeat').
 * Failure: unit loses turn (CT set to 100).
 * Blocked in boss battles.
 */
export function executeFlee(
  state: BattleState,
  unitId: string,
  rng?: () => number,
): { success: boolean; roll: DiceRoll; execution: SkillExecutionResult } {
  const units = state.units.map(u => ({ ...u }));
  const unit = units.find(u => u.unitId === unitId)!;
  const difficulty = state.difficulty ?? 5;
  const threshold = 10 + difficulty * 2;

  const roll = makeDiceRoll('flee', Math.floor(unit.currentStats.speed / 10), rng);
  const success = roll.total >= threshold;

  if (!success) {
    // Flee failed — lose turn
    unit.ct = 100;
  }

  const desc = success
    ? `${unit.name} successfully fled the battle!`
    : `${unit.name} tried to flee but failed! (needed ${threshold}, rolled ${roll.total})`;

  const turnRecord: TurnRecord = {
    turnNumber: state.currentTurn,
    actingUnitId: unitId,
    skillId: FLEE_ACTION_ID,
    targetUnitIds: [],
    diceRolls: [roll],
    damageDealt: {},
    healingDone: {},
    statusEffectsApplied: [],
    statusEffectsRemoved: [],
    resultDescription: desc,
  };

  return {
    success,
    roll,
    execution: { turnRecord, diceRolls: [roll], updatedUnits: units },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Status Effect Application
// ═══════════════════════════════════════════════════════════════════════

/**
 * Single decision point for attaching a status effect to a target. Every
 * DoT, HoT, buff, debuff, shield, taunt, and dodge application routes through
 * this — raw pushes to `target.statusEffects` are an error.
 *
 * The refresh key is `(subtype, sourceSkillId)`. This means:
 *   - Re-casting the same skill on the same target collapses under 'refresh'.
 *   - Two *different* skills with the same subtype (e.g. two 'stat_buff'
 *     sources) coexist — neither silently clobbers the other.
 *
 * Policies:
 *   refresh → replace existing same-key instance; duration = max of the two,
 *             tickValue = max (strongest proc wins). Default.
 *   stack   → push unconditionally. Bleed-style linear accumulation.
 *   unique  → if any same-key instance is present, drop the new one silently;
 *             returns false so callers can log/skip.
 *
 * Returns whether a new or refreshed instance is now present on the target.
 */
function applyStatusEffect(
  target: QueueUnit,
  effect: StatusEffect,
  policy: StackPolicy = 'refresh',
): boolean {
  const existingIdx = target.statusEffects.findIndex(
    e => e.subtype === effect.subtype && e.sourceSkillId === effect.sourceSkillId,
  );
  if (existingIdx === -1) {
    target.statusEffects.push(effect);
    return true;
  }
  switch (policy) {
    case 'unique':
      return false;
    case 'stack':
      target.statusEffects.push(effect);
      return true;
    case 'refresh': {
      const existing = target.statusEffects[existingIdx];
      existing.turnsRemaining = Math.max(existing.turnsRemaining, effect.turnsRemaining);
      if (effect.tickValue !== undefined) {
        existing.tickValue = Math.max(existing.tickValue ?? 0, effect.tickValue);
      }
      existing.value = Math.max(existing.value, effect.value);
      existing.sourceUnitId = effect.sourceUnitId;
      return true;
    }
  }
}

/** Human-readable name for a StatusSubtype. Drives tick log text and badges. */
const SUBTYPE_DISPLAY_NAME: Record<StatusSubtype, string> = {
  poison: 'Poison',
  burn: 'Burn',
  bleed: 'Bleed',
  regen: 'Regen',
  stun: 'Stun',
  shield: 'Shield',
  stat_buff: 'Buff',
  stat_debuff: 'Debuff',
  generic: 'Effect',
};

// ═══════════════════════════════════════════════════════════════════════
// Status Effect Tick
// ═══════════════════════════════════════════════════════════════════════

/** Tick all status effects and return both updated units and optional tick log record. */
export function tickStatusEffects(
  units: QueueUnit[],
  turnNumber: number,
  actingUnitId: string,
): { updatedUnits: QueueUnit[]; tickTurnRecord: TurnRecord | null } {
  const damageDealt: Record<string, number> = {};
  const healingDone: Record<string, number> = {};
  const tickFragments: string[] = [];

  const updatedUnits = units.map(unit => {
    if (unit.isKO) return unit;
    const u = { ...unit, statusEffects: [...unit.statusEffects] };

    for (const effect of u.statusEffects) {
      // DoT
      if (effect.property === 'dot') {
        const prevHp = u.hp;
        const dotDmg = effect.tickValue ?? Math.round(u.maxHp * effect.value);
        applyDamageToUnit(u, dotDmg);
        const actual = Math.max(0, prevHp - u.hp);
        if (actual > 0) {
          damageDealt[u.unitId] = (damageDealt[u.unitId] || 0) + actual;
          tickFragments.push(`${u.name} takes ${actual} ${SUBTYPE_DISPLAY_NAME[effect.subtype]} damage`);
        }
      }
      // HoT
      if (effect.property === 'hot' || effect.property === 'hp_regen') {
        const prevHp = u.hp;
        const healAmt = effect.tickValue ?? Math.round(u.maxHp * effect.value);
        u.hp = Math.min(u.maxHp, u.hp + healAmt);
        const actual = Math.max(0, u.hp - prevHp);
        if (actual > 0) {
          healingDone[u.unitId] = (healingDone[u.unitId] || 0) + actual;
          tickFragments.push(`${u.name} regenerates ${actual} HP (${SUBTYPE_DISPLAY_NAME[effect.subtype]})`);
        }
      }
      // Tick duration
      effect.turnsRemaining--;
    }

    // Remove expired effects
    u.statusEffects = u.statusEffects.filter(e => e.turnsRemaining > 0);

    // Tick cooldowns
    const newCooldowns: Record<string, number> = {};
    for (const [skillId, cd] of Object.entries(u.cooldowns)) {
      if (cd > 1) newCooldowns[skillId] = cd - 1;
    }
    u.cooldowns = newCooldowns;

    // Mana regen (base 5/turn + class bonuses)
    const manaRegen = 5 + getManaRegenBonus(u);
    u.mana = Math.min(u.maxMana, u.mana + manaRegen);

    // KO check
    if (u.hp <= 0) {
      u.isKO = true;
      u.hp = 0;
    }

    return u;
  });

  const totalTickDmg = Object.values(damageDealt).reduce((a, b) => a + b, 0);
  const totalTickHeal = Object.values(healingDone).reduce((a, b) => a + b, 0);

  if (totalTickDmg === 0 && totalTickHeal === 0) {
    return { updatedUnits, tickTurnRecord: null };
  }

  const tickTurnRecord: TurnRecord = {
    turnNumber,
    actingUnitId,
    skillId: '__status_tick__',
    targetUnitIds: Array.from(new Set([
      ...Object.keys(healingDone),
      ...Object.keys(damageDealt),
    ])),
    diceRolls: [],
    damageDealt,
    healingDone,
    statusEffectsApplied: [],
    statusEffectsRemoved: [],
    resultDescription: tickFragments.join('. ') + '.',
  };

  return { updatedUnits, tickTurnRecord };
}

// ═══════════════════════════════════════════════════════════════════════
// Battle Result Check
// ═══════════════════════════════════════════════════════════════════════

/** Check if the battle is over. */
export function checkBattleResult(units: QueueUnit[]): BattleResult {
  const playersAlive = units.some(u => u.unitType === 'player' && !u.isKO);
  const enemiesAlive = units.some(u => u.unitType === 'enemy' && !u.isKO);

  if (!enemiesAlive) return 'victory';
  if (!playersAlive) return 'defeat';
  return 'in_progress';
}

// ═══════════════════════════════════════════════════════════════════════
// Auto-Battle AI
// ═══════════════════════════════════════════════════════════════════════

/**
 * Auto-battle AI decision for the current acting unit.
 * Priority: Heal critical → Debuff boss → Buff party → Highest damage → Basic attack.
 *
 * Returns a { skillId, targetUnitIds } pair.
 */
export function getAutoBattleAction(
  state: BattleState,
  actingUnit: QueueUnit,
  config: AutoBattleConfig = DEFAULT_AUTO_BATTLE_CONFIG,
): { skillId: string; targetUnitIds: string[] } {
  const allies = state.units.filter(u => u.unitType === actingUnit.unitType && !u.isKO);
  const enemies = state.units.filter(u => u.unitType !== actingUnit.unitType && !u.isKO);

  if (enemies.length === 0) {
    return { skillId: actingUnit.skillIds[0], targetUnitIds: [] };
  }

  const availableSkills = getAvailableSkills(actingUnit);

  for (const priority of config.priorities) {
    switch (priority) {
      case 'heal_critical': {
        const criticalAlly = allies.find(a => a.hp / a.maxHp < config.healThreshold);
        if (criticalAlly) {
          const healSkill = availableSkills.find(s =>
            (s.effectTags.includes('heal') || s.effectTags.includes('hot')) && s.targetType.includes('ally'),
          );
          if (healSkill) return { skillId: healSkill.id, targetUnitIds: [criticalAlly.unitId] };
          // No heal available and self is critical — use cover
          if (criticalAlly.unitId === actingUnit.unitId) {
            return { skillId: COVER_ACTION_ID, targetUnitIds: [actingUnit.unitId] };
          }
        }
        break;
      }
      case 'debuff_boss': {
        const boss = enemies.find(e => e.classId.startsWith('the_')); // boss archetypes
        if (boss) {
          const debuffSkill = availableSkills.find(s =>
            s.effectTags.includes('debuff') && !actingUnit.cooldowns[s.id],
          );
          if (debuffSkill) return { skillId: debuffSkill.id, targetUnitIds: [boss.unitId] };
        }
        break;
      }
      case 'buff_party': {
        const buffSkill = availableSkills.find(s =>
          s.effectTags.includes('buff') &&
          (s.targetType === 'all_allies' || s.targetType === 'self') &&
          !actingUnit.cooldowns[s.id],
        );
        if (buffSkill) {
          const targets = buffSkill.targetType === 'all_allies'
            ? allies.map(a => a.unitId)
            : [actingUnit.unitId];
          return { skillId: buffSkill.id, targetUnitIds: targets };
        }
        break;
      }
      case 'highest_damage': {
        const dmgSkills = availableSkills
          .filter(s => s.effectTags.includes('damage') && canAfford(actingUnit, s))
          .sort((a, b) => b.skillMultiplier * b.baseValue - a.skillMultiplier * a.baseValue);

        if (dmgSkills.length > 0) {
          const skill = dmgSkills[0];
          const target = pickBestTarget(enemies, skill);
          return { skillId: skill.id, targetUnitIds: [target.unitId] };
        }
        break;
      }
      case 'basic_attack': {
        const basicSkill = availableSkills.find(s => s.skillType === 'basic');
        if (basicSkill) {
          const target = pickBestTarget(enemies, basicSkill);
          return { skillId: basicSkill.id, targetUnitIds: [target.unitId] };
        }
        break;
      }
    }
  }

  // Absolute fallback: first available skill on first enemy
  return {
    skillId: actingUnit.skillIds[0],
    targetUnitIds: [enemies[0].unitId],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Full Battle Step — orchestrates one turn
// ═══════════════════════════════════════════════════════════════════════

/**
 * Advance the queue and identify the next acting unit.
 * Transitions: queueing → player_turn | enemy_turn.
 * Used by both manual and auto-battle flows.
 */
export function advanceToNextTurn(state: BattleState): BattleState {
  if (state.result !== 'in_progress') return state;
  if (state.phase !== 'queueing' && state.phase !== 'preparation') return state;

  // Advance CT
  const { nextUnit, updatedUnits } = advanceCTQueue(state.units);

  // Tick status effects for the acting unit's turn
  const { updatedUnits: units, tickTurnRecord } = tickStatusEffects(
    updatedUnits,
    state.currentTurn,
    nextUnit.unitId,
  );
  const turnHistory = tickTurnRecord ? [...state.turnHistory, tickTurnRecord] : state.turnHistory;

  // Re-find the acting unit (may have been updated by tick)
  const actingUnit = units.find(u => u.unitId === nextUnit.unitId);
  if (!actingUnit || actingUnit.isKO) {
    // Unit died from DoT — skip turn, stay in queueing
    return {
      ...state,
      units,
      turnHistory,
      currentTurn: state.currentTurn + 1,
      activeUnitId: null,
      phase: 'queueing',
    };
  }

  const nextPhase: BattlePhase = actingUnit.unitType === 'player' ? 'player_turn' : 'enemy_turn';
  return {
    ...state,
    units,
    turnHistory,
    activeUnitId: actingUnit.unitId,
    phase: nextPhase,
  };
}

/**
 * Execute a single battle step (full cycle):
 * 1. Advance CT → find acting unit (queueing → player_turn/enemy_turn)
 * 2. Determine action (manual or AI)
 * 3. Execute skill (→ resolving)
 * 4. Check battle result (→ queueing | reward | finished)
 *
 * Returns updated battle state.
 */
export function executeBattleStep(
  state: BattleState,
  manualAction?: { skillId: string; targetUnitIds: string[] },
  rng?: () => number,
): BattleState {
  if (state.result !== 'in_progress') return state;

  // If in preparation, auto-transition to queueing
  let current = state;
  if (current.phase === 'preparation') {
    current = { ...current, phase: 'queueing' };
  }

  // 1. Advance CT → find acting unit
  if (current.phase === 'queueing') {
    current = advanceToNextTurn(current);
  }

  const actingUnit = current.units.find(u => u.unitId === current.activeUnitId);
  if (!actingUnit || actingUnit.isKO) {
    return { ...current, phase: 'queueing' };
  }

  // 2. Determine action → resolving
  const action = manualAction ?? getAutoBattleAction(current, actingUnit);
  current = { ...current, phase: 'resolving' };

  // 3. Handle special innate actions (cover, flee)
  if (action.skillId === COVER_ACTION_ID) {
    const coverResult = executeCover(current, actingUnit.unitId);
    return {
      ...current,
      units: coverResult.updatedUnits,
      turnHistory: [...current.turnHistory, coverResult.turnRecord],
      currentTurn: current.currentTurn + 1,
      activeUnitId: null,
      phase: 'queueing',
    };
  }

  if (action.skillId === FLEE_ACTION_ID) {
    const fleeResult = executeFlee(current, actingUnit.unitId, rng);
    if (fleeResult.success) {
      return {
        ...current,
        units: fleeResult.execution.updatedUnits,
        turnHistory: [...current.turnHistory, fleeResult.execution.turnRecord],
        diceHistory: [...current.diceHistory, fleeResult.roll],
        currentTurn: current.currentTurn + 1,
        result: 'defeat',
        phase: 'finished',
        fleeFlag: true,
        completedAt: Date.now(),
      };
    }
    // Flee failed — unit loses turn, back to queueing
    return {
      ...current,
      units: fleeResult.execution.updatedUnits,
      turnHistory: [...current.turnHistory, fleeResult.execution.turnRecord],
      diceHistory: [...current.diceHistory, fleeResult.roll],
      currentTurn: current.currentTurn + 1,
      activeUnitId: null,
      phase: 'queueing',
    };
  }

  // 3b. Execute regular skill
  const execution = executeSkill(
    current,
    actingUnit.unitId,
    action.skillId,
    action.targetUnitIds,
    rng,
  );

  let units = execution.updatedUnits;

  // 4. Check battle result
  const result = checkBattleResult(units);

  let nextPhase: BattlePhase = 'queueing';
  let winner: 'players' | 'enemies' | undefined;
  if (result === 'victory') {
    nextPhase = 'reward';
    winner = 'players';
  } else if (result === 'defeat') {
    nextPhase = 'finished';
    winner = 'enemies';
  }

  return {
    ...current,
    units,
    turnHistory: [...current.turnHistory, execution.turnRecord],
    diceHistory: [...current.diceHistory, ...execution.diceRolls],
    currentTurn: current.currentTurn + 1,
    result,
    activeUnitId: result === 'in_progress' ? null : current.activeUnitId,
    phase: nextPhase,
    winner,
    completedAt: result !== 'in_progress' ? Date.now() : null,
  };
}

/**
 * Transition from 'reward' to 'finished' after rewards have been claimed.
 */
export function finishBattle(state: BattleState): BattleState {
  if (state.phase !== 'reward') return state;
  return { ...state, phase: 'finished' };
}

// ═══════════════════════════════════════════════════════════════════════
// Damage Preview
// ═══════════════════════════════════════════════════════════════════════

export interface DamagePreview {
  min: number;
  max: number;
  avg: number;
}

/**
 * Preview the damage range for a skill from attacker against defender.
 * Min: all dice roll 1, normal hit. Max: all dice roll max, minor crit (×1.5).
 * Returns min/avg/max for display in SkillBar tooltip.
 */
export function previewDamageRange(
  skill: SkillDefinition,
  attacker: QueueUnit,
  defender: QueueUnit,
): DamagePreview {
  if (!skill.effectTags.includes('damage')) {
    return { min: 0, max: 0, avg: 0 };
  }

  const { die, count } = getSkillDamageDie(skill);
  const dieMax = DIE_MAX[die];

  // Min: all dice roll 1, normal hit (no crit)
  const minDice = count; // each die = 1
  const min = calculateDamage(skill, attacker, defender, minDice, 1.0);

  // Avg: average dice, normal hit
  const avgPerDie = (dieMax + 1) / 2;
  const avgDice = Math.round(count * avgPerDie);
  const avg = calculateDamage(skill, attacker, defender, avgDice, 1.0);

  // Max: all dice roll max, minor crit (×1.5) — realistic "great hit"
  const maxDice = count * dieMax;
  const max = calculateDamage(skill, attacker, defender, maxDice, 1.5);

  return { min, max, avg };
}

/**
 * Run auto-battle to completion.
 * Returns the final battle state. Use for quick-resolve or testing.
 */
export function runFullAutoBattle(
  state: BattleState,
  maxTurns: number = 200,
  rng?: () => number,
): BattleState {
  let current = state;
  // Auto-begin if in preparation
  if (current.phase === 'preparation') {
    current = beginBattle(current);
  }
  let turns = 0;

  while (current.result === 'in_progress' && turns < maxTurns) {
    current = executeBattleStep(current, undefined, rng);
    turns++;
  }

  return current;
}

// ═══════════════════════════════════════════════════════════════════════
// Battle State Factory
// ═══════════════════════════════════════════════════════════════════════

/** Create initial battle state from player units and enemy units. */
export function createBattleState(params: {
  battleId: string;
  campaignId: string;
  questId: string | null;
  bossId: string | null;
  playerUnits: QueueUnit[];
  enemyUnits: QueueUnit[];
  difficulty?: number;
}): BattleState {
  const allUnits = initializeCT([...params.playerUnits, ...params.enemyUnits]);

  return {
    battleId: params.battleId,
    campaignId: params.campaignId,
    questId: params.questId,
    bossId: params.bossId,
    units: allUnits,
    turnHistory: [],
    diceHistory: [],
    currentTurn: 1,
    result: 'in_progress',
    activeUnitId: null,
    phase: 'preparation',
    difficulty: params.difficulty ?? 5,
    createdAt: Date.now(),
    completedAt: null,
  };
}

/**
 * Begin a battle — transitions from preparation to queueing.
 * Actual first turn starts on executeBattleStep.
 */
export function beginBattle(state: BattleState): BattleState {
  if (state.phase !== 'preparation') return state;
  return { ...state, phase: 'queueing' };
}

/**
 * Create enemy QueueUnits from encounter definition.
 * Generates stats based on archetype and level.
 */
export function createEnemyUnits(
  archetype: string,
  level: number,
  count: number,
  bossHp?: number,
): QueueUnit[] {
  const enemies: QueueUnit[] = [];
  const baseStats = getEnemyBaseStats(archetype, level);

  for (let i = 0; i < count; i++) {
    const isBoss = i === 0 && bossHp !== undefined;
    const hp = isBoss ? bossHp! : baseStats.health * 5;
    const mana = baseStats.mana * 3;
    const suffix = count > 1 ? ` ${String.fromCharCode(65 + i)}` : '';
    const name = isBoss ? archetype.replace(/_/g, ' ').replace(/\bthe\b/i, 'The') : `${archetype}${suffix}`;

    enemies.push({
      unitId: `enemy_${i}_${Date.now()}`,
      unitType: 'enemy',
      name,
      ct: Math.max(1, 100 - baseStats.speed),
      currentStats: { ...baseStats },
      maxHp: hp,
      maxMana: mana,
      hp,
      mana,
      shield: 0,
      isKO: false,
      statusEffects: [],
      cooldowns: {},
      skillIds: [`enemy_attack_${archetype}`],
      classId: archetype,
      isAutoBattle: true,
      passiveIds: [],
    });
  }

  return enemies;
}

/** Generate base stats for an enemy based on archetype and level. */
function getEnemyBaseStats(archetype: string, level: number): StatBlock {
  const base = 8 + level * 2;
  const basePrc = Math.floor(base * 0.8); // enemies slightly less accurate than players
  // Some archetypes skew stats
  switch (archetype) {
    case 'the_gourmand':
      return { strength: base, defense: base - 2, speed: base - 3, health: base + 4, mana: base - 4, cdr: 0, precision: basePrc - 2 };
    case 'the_road_warden':
      return { strength: base + 2, defense: base + 2, speed: base - 2, health: base + 2, mana: base - 4, cdr: 0, precision: basePrc + 1 };
    case 'the_siphon':
      return { strength: base - 2, defense: base - 2, speed: base + 2, health: base, mana: base + 4, cdr: 2, precision: basePrc + 2 };
    case 'the_hoarder':
      return { strength: base + 3, defense: base + 3, speed: base - 4, health: base + 3, mana: base - 4, cdr: 0, precision: basePrc - 1 };
    case 'the_plague_lord':
      return { strength: base - 1, defense: base, speed: base, health: base + 2, mana: base + 2, cdr: 2, precision: basePrc };
    default:
      return { strength: base, defense: base, speed: base, health: base, mana: base, cdr: 0, precision: basePrc };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════════

function applyDamageToUnit(unit: QueueUnit, damage: number): void {
  // Shield absorbs first
  if (unit.shield > 0) {
    if (unit.shield >= damage) {
      unit.shield -= damage;
      return;
    }
    damage -= unit.shield;
    unit.shield = 0;
  }
  unit.hp = Math.max(0, unit.hp - damage);
}

function getDodgeThreshold(target: QueueUnit): number {
  // Base dodge threshold: 3 + SPD/20
  let threshold = 3 + Math.floor(target.currentStats.speed / 20);
  // Dodge chance passives
  for (const passiveId of target.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'dodge_chance') {
        threshold += Math.round(mod.value * 20); // convert to d20 scale
      }
    }
  }
  // Full dodge status effect
  if (target.statusEffects.some(e => e.property === 'dodge_all')) {
    threshold = 21; // impossible to hit
  }
  return threshold;
}

function isGuaranteedCrit(skill: SkillDefinition, target: QueueUnit): boolean {
  // Lethal Volley: guaranteed crit if target HP < 30%
  if (skill.id === 'ranger_lethal_volley' && target.hp / target.maxHp < 0.30) return true;
  return false;
}

function getEffectiveManaCost(unit: QueueUnit, baseCost: number): number {
  let reduction = 0;
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'mana_cost') reduction += Math.abs(mod.value);
    }
  }
  return Math.max(0, Math.round(baseCost * (1 - reduction)));
}

function getEffectiveCooldown(unit: QueueUnit, baseCd: number): number {
  let reduction = 0;
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'class_cdr') reduction += mod.value;
    }
  }
  // CDR stat contribution (cap 25%)
  const cdrPct = Math.min(0.25, unit.currentStats.cdr / 100);
  return Math.max(1, Math.round(baseCd * (1 - cdrPct) - reduction));
}

function getManaRegenBonus(unit: QueueUnit): number {
  let bonus = 0;
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'mana_regen') bonus += mod.value;
    }
  }
  return bonus;
}

function getHealingBonus(unit: QueueUnit): number {
  let bonus = 0;
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'healing_bonus') bonus += mod.value;
    }
  }
  return bonus;
}

function getPoisonDurationBonus(unit: QueueUnit): number {
  let bonus = 0;
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === 'poison_duration') bonus += mod.value;
    }
  }
  return bonus;
}

function resolveTickConfig(
  skill: SkillDefinition,
  attacker: QueueUnit,
  type: 'hot' | 'dot',
): SkillTickEffectConfig {
  const configured = skill.tickConfig?.[type];
  const poisonDurationBonus = type === 'dot' ? getPoisonDurationBonus(attacker) : 0;

  if (configured) {
    return {
      value: Math.max(0, configured.value),
      durationTurns: Math.max(1, Math.round(configured.durationTurns + poisonDurationBonus)),
      subtype: configured.subtype,
      stackPolicy: configured.stackPolicy,
    };
  }

  if (type === 'hot') {
    return {
      value: Math.max(0, skill.skillMultiplier),
      durationTurns: 3,
      subtype: 'regen',
    };
  }

  return {
    value: 0.05,
    durationTurns: Math.max(1, 3 + poisonDurationBonus),
    subtype: 'poison',
  };
}

function hasPassiveProperty(unit: QueueUnit, property: string): boolean {
  for (const passiveId of unit.passiveIds) {
    const passive = getSkillById(passiveId) as PassiveDefinition | undefined;
    if (!passive?.modifiers) continue;
    for (const mod of passive.modifiers) {
      if (mod.property === property && mod.value > 0) return true;
    }
  }
  return false;
}

function resolveTargets(
  units: QueueUnit[],
  attacker: QueueUnit,
  skill: SkillDefinition,
  requestedTargets: string[],
): QueueUnit[] {
  const allies = units.filter(u => u.unitType === attacker.unitType && !u.isKO);
  const enemies = units.filter(u => u.unitType !== attacker.unitType && !u.isKO);

  switch (skill.targetType) {
    case 'single_enemy':
      if (requestedTargets.length > 0) {
        const requested = units.find(u => u.unitId === requestedTargets[0] && !u.isKO);
        if (requested && requested.unitType !== attacker.unitType) return [requested];
      }
      return enemies.length > 0 ? [enemies[0]] : [];
    case 'all_enemies':
      return enemies;
    case 'random_enemies':
      return shuffleArray(enemies).slice(0, skill.hitCount || 1);
    case 'single_ally':
      if (requestedTargets.length > 0) {
        const requested = units.find(u => u.unitId === requestedTargets[0] && !u.isKO);
        if (requested && requested.unitType === attacker.unitType) return [requested];
      }
      return allies.length > 0 ? [allies[0]] : [];
    case 'all_allies':
      return allies;
    case 'self':
      return [attacker];
    case 'self_and_allies':
      return allies;
    default:
      return [];
  }
}

function createStatusEffect(
  skill: SkillDefinition,
  source: QueueUnit,
  type: 'buff' | 'debuff',
): StatusEffect {
  return {
    id: `${skill.id}_${source.unitId}_${Date.now()}`,
    name: skill.name,
    type,
    property: type === 'buff' ? 'stat_bonus' : 'stat_debuff',
    subtype: type === 'buff' ? 'stat_buff' : 'stat_debuff',
    value: skill.skillMultiplier,
    turnsRemaining: type === 'buff' ? 3 : 2,
    sourceUnitId: source.unitId,
    sourceSkillId: skill.id,
  };
}

function canAfford(unit: QueueUnit, skill: SkillDefinition): boolean {
  if (unit.cooldowns[skill.id]) return false;
  if (skill.costType === 'mana' || skill.costType === 'mixed') {
    if (unit.mana < getEffectiveManaCost(unit, skill.manaCost)) return false;
  }
  return true;
}

function getAvailableSkills(unit: QueueUnit): SkillDefinition[] {
  return unit.skillIds
    .map(id => getSkillById(id))
    .filter((s): s is SkillDefinition => s !== undefined && s.skillType !== 'passive')
    .filter(s => canAfford(unit, s));
}

function pickBestTarget(enemies: QueueUnit[], skill: SkillDefinition): QueueUnit {
  // Target lowest HP enemies first
  return [...enemies].sort((a, b) => a.hp - b.hp)[0];
}

function shuffleArray<T>(arr: T[], rng: () => number = Math.random): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
