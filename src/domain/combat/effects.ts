import {
  isSpecified,
  type DamageType,
  type Skill,
  type SkillEffect,
  type SkillEffectKind,
} from '../../content/types';
import {
  DEFAULT_TICK_INTERVAL_SEC,
  resolveChance,
  resolveDurationSec,
  resolveMagnitude,
  resolveStacks,
} from './defaults';
import { applyResistance, mitigate, type HitRoll } from './d20';
import { drawChance } from './prng';
import { shiftCT } from './queue';
import { appendLog, clamp, patchUnit } from './stateUtils';
import { defenseFor, effectiveStats, resistanceFor } from './stats';
import { SYNTHETIC_BASIC_ATTACK_ID } from './factory';
import {
  toInstanceId,
  type BattleEvent,
  type BattleState,
  type InstanceId,
  type StatusInstance,
  type StatusKind,
  type Unit,
} from './types';

const EPSILON = 1e-9;

// clamp, patchUnit, appendLog are imported from ./stateUtils

export interface EffectContext {
  readonly state: BattleState;
  readonly caster: Unit;
  readonly targetIds: readonly InstanceId[];
  readonly skill: Skill;
  readonly effect: SkillEffect;
  readonly hit: HitRoll;
  readonly cursor: number;
  readonly tick: number;
}

export interface EffectOutcome {
  readonly state: BattleState;
  readonly cursor: number;
}

const computePowerBase = (
  caster: Unit,
  magnitude: number,
  magnitudeUnit: SkillEffect['magnitudeUnit'],
  damageType: DamageType,
  target: Unit,
): number => {
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
      const power =
        damageType === 'physical' ? casterStats.strength : casterStats.intellect;
      return power * magnitude;
    }
  }
};

const resolveDamageType = (effect: SkillEffect): DamageType =>
  effect.damageType ?? 'physical';

const takeShield = (
  statuses: readonly StatusInstance[],
  incoming: number,
): { absorbed: number; statuses: readonly StatusInstance[] } => {
  if (incoming <= 0) return { absorbed: 0, statuses };
  let remaining = incoming;
  const next: StatusInstance[] = [];
  let absorbed = 0;
  for (const s of statuses) {
    if (s.kind !== 'shield' || remaining <= 0) {
      next.push(s);
      continue;
    }
    const pool = s.snapshot.magnitude * s.stacks;
    if (pool > remaining) {
      absorbed += remaining;
      next.push({
        ...s,
        snapshot: { ...s.snapshot, magnitude: pool - remaining },
        stacks: 1,
      });
      remaining = 0;
    } else {
      absorbed += pool;
      remaining -= pool;
    }
  }
  return { absorbed, statuses: next };
};

const applyDamageToUnit = (
  state: BattleState,
  target: Unit,
  rawAmount: number,
  damageType: DamageType,
  sourceId: InstanceId,
  hit: HitRoll,
  tick: number,
): BattleState => {
  if (target.isDead || rawAmount <= 0) return state;
  const stats = effectiveStats(target);
  const mitigated = mitigate(rawAmount, defenseFor(stats, damageType));
  const resisted = applyResistance(mitigated, resistanceFor(stats, damageType));
  const finalAmount = Math.max(0, Math.round(resisted * hit.severity));
  if (finalAmount <= 0) return state;

  const shielded = takeShield(target.statuses, finalAmount);
  const afterShield = finalAmount - shielded.absorbed;
  const hpAfter = clamp(target.hp - afterShield, 0, target.hpMax);
  const isDead = hpAfter <= 0;

  const events: BattleEvent[] = [
    {
      tick,
      type: 'damage',
      sourceUnitId: sourceId,
      targetUnitId: target.id,
      amount: finalAmount,
      damageType,
      hitTier: hit.tier,
    },
  ];
  if (isDead && !target.isDead) {
    events.push({ tick, type: 'unit_died', unitId: target.id });
  }

  const nextState = patchUnit(state, target.id, {
    hp: hpAfter,
    statuses: shielded.statuses,
    isDead,
  });
  return appendLog(nextState, events);
};

const applyHealToUnit = (
  state: BattleState,
  target: Unit,
  rawAmount: number,
  sourceId: InstanceId,
  tick: number,
): BattleState => {
  if (target.isDead || rawAmount <= 0) return state;
  // Apply heal_reduction debuff(s) before rounding.
  const totalReduction = Math.min(
    0.9,
    target.statuses
      .filter((s) => s.kind === 'debuff' && s.snapshot.statTag === 'heal_reduction')
      .reduce((sum, s) => sum + s.snapshot.magnitude, 0),
  );
  const reducedAmount = rawAmount * (1 - totalReduction);
  const amount = Math.max(0, Math.round(reducedAmount));
  if (amount <= 0) return state;
  const hpAfter = clamp(target.hp + amount, 0, target.hpMax);
  const delta = hpAfter - target.hp;
  if (delta <= 0) return state;
  const nextState = patchUnit(state, target.id, { hp: hpAfter });
  return appendLog(nextState, [
    {
      tick,
      type: 'heal',
      sourceUnitId: sourceId,
      targetUnitId: target.id,
      amount: delta,
    },
  ]);
};

const resolveShieldPool = (
  magnitude: number,
  magnitudeUnit: StatusInstance['snapshot']['magnitudeUnit'],
  caster: Unit,
): { magnitude: number; magnitudeUnit: StatusInstance['snapshot']['magnitudeUnit'] } => {
  // takeShield reads snapshot.magnitude as a flat HP value — convert at build time.
  if (magnitudeUnit === 'max_hp_percent') {
    return { magnitude: Math.round(caster.hpMax * magnitude), magnitudeUnit: 'flat' };
  }
  if (magnitudeUnit === 'percent') {
    const casterStats = effectiveStats(caster);
    return { magnitude: Math.round((casterStats.strength + casterStats.intellect) * magnitude), magnitudeUnit: 'flat' };
  }
  return { magnitude, magnitudeUnit };
};

const buildStatus = (
  ctx: EffectContext,
  kind: StatusKind,
  target: Unit,
): StatusInstance => {
  let { magnitude, magnitudeUnit } = resolveMagnitude(ctx.effect);
  if (kind === 'shield') {
    ({ magnitude, magnitudeUnit } = resolveShieldPool(magnitude, magnitudeUnit, ctx.caster));
  }
  const durationSec = resolveDurationSec(ctx.effect);
  const stacks = resolveStacks(ctx.effect);
  const casterStats = effectiveStats(ctx.caster);
  const suffix = `${ctx.caster.id}_${ctx.skill.id}_${kind}_${target.id}`;
  return {
    id: toInstanceId(`status_${ctx.tick}_${suffix}`),
    kind,
    sourceUnitId: ctx.caster.id,
    skillId: ctx.skill.id,
    snapshot: {
      magnitude,
      magnitudeUnit,
      sourceStrength: casterStats.strength,
      sourceIntellect: casterStats.intellect,
      sourceAgility: casterStats.agility,
      ...(ctx.effect.damageType !== undefined
        ? { damageType: ctx.effect.damageType }
        : {}),
      ...(ctx.effect.statTag !== undefined ? { statTag: ctx.effect.statTag } : {}),
    },
    remainingSec: Math.max(0, durationSec),
    stacks,
    tickIntervalSec: DEFAULT_TICK_INTERVAL_SEC,
    secSinceLastTick: 0,
    tags: [],
  };
};

const addStatus = (
  state: BattleState,
  target: Unit,
  status: StatusInstance,
  tick: number,
): BattleState => {
  const next = patchUnit(state, target.id, {
    statuses: [...target.statuses, status],
  });
  return appendLog(next, [
    {
      tick,
      type: 'status_applied',
      sourceUnitId: status.sourceUnitId,
      targetUnitId: target.id,
      statusKind: status.kind,
      skillId: status.skillId,
      remainingSec: status.remainingSec,
      stacks: status.stacks,
    },
  ]);
};

const forEachTarget = (
  ctx: EffectContext,
  fn: (state: BattleState, target: Unit) => BattleState,
): BattleState => {
  let state = ctx.state;
  for (const id of ctx.targetIds) {
    const t = state.units[id];
    if (t === undefined || t.isDead) continue;
    state = fn(state, t);
  }
  return state;
};

const applyDamageEffect = (ctx: EffectContext): EffectOutcome => {
  const { magnitude, magnitudeUnit } = resolveMagnitude(ctx.effect);
  if (ctx.hit.tier === 'fail') {
    return { state: ctx.state, cursor: ctx.cursor };
  }
  const damageType = resolveDamageType(ctx.effect);
  const state = forEachTarget(ctx, (s, target) => {
    const base = computePowerBase(ctx.caster, magnitude, magnitudeUnit, damageType, target);
    return applyDamageToUnit(s, target, base, damageType, ctx.caster.id, ctx.hit, ctx.tick);
  });
  return { state, cursor: ctx.cursor };
};

const applyHealEffect = (ctx: EffectContext): EffectOutcome => {
  const { magnitude, magnitudeUnit } = resolveMagnitude(ctx.effect);
  const state = forEachTarget(ctx, (s, target) => {
    const base = computePowerBase(ctx.caster, magnitude, magnitudeUnit, 'radiant', target);
    return applyHealToUnit(s, target, base, ctx.caster.id, ctx.tick);
  });
  return { state, cursor: ctx.cursor };
};

const applyStatusEffect =
  (kind: StatusKind) =>
  (ctx: EffectContext): EffectOutcome => {
    const state = forEachTarget(ctx, (s, target) => {
      const status = buildStatus({ ...ctx, state: s }, kind, target);
      return addStatus(s, target, status, ctx.tick);
    });
    return { state, cursor: ctx.cursor };
  };

const applyCtShiftEffect = (ctx: EffectContext): EffectOutcome => {
  const { magnitude } = resolveMagnitude(ctx.effect);
  let state = ctx.state;
  for (const id of ctx.targetIds) {
    const t = state.units[id];
    if (t === undefined || t.isDead) continue;
    state = shiftCT(state, id, -magnitude);
  }
  return { state, cursor: ctx.cursor };
};

const applyExecuteEffect = (ctx: EffectContext): EffectOutcome => {
  const { magnitude } = resolveMagnitude(ctx.effect);
  const damageType = resolveDamageType(ctx.effect);
  const state = forEachTarget(ctx, (s, target) => {
    const threshold = target.hpMax * magnitude;
    if (target.hp > threshold) return s;
    const huge = target.hp * 10;
    return applyDamageToUnit(s, target, huge, damageType, ctx.caster.id, ctx.hit, ctx.tick);
  });
  return { state, cursor: ctx.cursor };
};

const applyCleanseEffect = (ctx: EffectContext): EffectOutcome => {
  const state = forEachTarget(ctx, (s, target) => {
    const kept = target.statuses.filter(
      (st) => st.kind !== 'dot' && st.kind !== 'debuff' && st.kind !== 'stun',
    );
    if (kept.length === target.statuses.length) return s;
    return patchUnit(s, target.id, { statuses: kept });
  });
  return { state, cursor: ctx.cursor };
};

const applyUtilityEffect = (ctx: EffectContext): EffectOutcome => {
  const state = forEachTarget(ctx, (s, target) => {
    const nextCooldowns: Record<string, number> = {};
    for (const [skillId, remaining] of Object.entries(target.cooldowns)) {
      if (skillId === ctx.skill.id) {
        nextCooldowns[skillId] = remaining;
      }
    }
    return patchUnit(s, target.id, { cooldowns: nextCooldowns });
  });
  return { state, cursor: ctx.cursor };
};

const HP_PER_STAMINA = 4; // must match factory.ts

const MAX_THRALLS_PER_SUMMONER = 2;

const applySummonEffect = (ctx: EffectContext): EffectOutcome => {
  const caster = ctx.state.units[ctx.caster.id];
  if (caster === undefined || caster.isDead) return { state: ctx.state, cursor: ctx.cursor };

  const allUnits = Object.values(ctx.state.units);

  // Prevent unbounded summons: count live Thralls already on caster's team.
  const thrallCount = allUnits.filter(
    (u) => !u.isDead && u.team === caster.team && u.displayName === 'Thrall',
  ).length;
  if (thrallCount >= MAX_THRALLS_PER_SUMMONER) return { state: ctx.state, cursor: ctx.cursor };

  const nextInsertionIndex =
    allUnits.reduce((max, u) => Math.max(max, u.insertionIndex), 0) + 1;

  const baseStrength = Math.round(caster.baseStats.strength * 0.4);
  const baseStamina = Math.round(caster.baseStats.stamina * 0.3);
  const hpMax = Math.max(1, baseStamina * HP_PER_STAMINA);

  const minionId = toInstanceId(`minion_${ctx.tick}_${nextInsertionIndex}`);
  const minion: Unit = {
    id: minionId,
    team: caster.team,
    displayName: 'Thrall',
    hp: hpMax,
    hpMax,
    mp: 0,
    mpMax: 0,
    ct: 0,
    baseStats: {
      strength: baseStrength,
      intellect: 0,
      agility: caster.baseStats.agility,
      stamina: baseStamina,
      defense: Math.round(caster.baseStats.defense * 0.5),
      magicDefense: Math.round(caster.baseStats.magicDefense * 0.5),
      speed: caster.baseStats.speed,
      critChance: 0.05,
      critMultiplier: 1.5,
      ctReductionPct: 0,
      resistances: {},
    },
    skillIds: [],
    basicAttackSkillId: SYNTHETIC_BASIC_ATTACK_ID,
    cooldowns: {},
    statuses: [],
    insertionIndex: nextInsertionIndex,
    isDead: false,
  };

  const nextState = appendLog(
    { ...ctx.state, units: { ...ctx.state.units, [minionId]: minion } },
    [{ tick: ctx.tick, type: 'unit_spawned', unitId: minionId, displayName: minion.displayName }],
  );
  return { state: nextState, cursor: ctx.cursor };
};

const applyLifestealEffect = (ctx: EffectContext): EffectOutcome => {
  const { magnitude } = resolveMagnitude(ctx.effect);
  let total = 0;
  for (let i = ctx.state.log.length - 1; i >= 0; i -= 1) {
    const event = ctx.state.log[i];
    if (event === undefined) continue;
    if (event.tick < ctx.tick) break;
    if (event.type !== 'damage' || event.tick !== ctx.tick) continue;
    if (event.sourceUnitId !== ctx.caster.id) continue;
    total += event.amount;
  }
  if (total <= 0) return { state: ctx.state, cursor: ctx.cursor };
  const heal = total * magnitude;
  const casterAlive = ctx.state.units[ctx.caster.id];
  if (casterAlive === undefined || casterAlive.isDead) {
    return { state: ctx.state, cursor: ctx.cursor };
  }
  const state = applyHealToUnit(ctx.state, casterAlive, heal, ctx.caster.id, ctx.tick);
  return { state, cursor: ctx.cursor };
};

const applyStatusGeneric = (ctx: EffectContext): EffectOutcome => {
  const tag = ctx.effect.statTag?.toLowerCase();
  const kind: StatusKind =
    tag === 'stun'
      ? 'stun'
      : tag === 'shield'
        ? 'shield'
        : tag === 'counter'
          ? 'counter'
          : 'debuff';
  return applyStatusEffect(kind)(ctx);
};

type EffectHandler = (ctx: EffectContext) => EffectOutcome;

const HANDLERS: Readonly<Record<SkillEffectKind, EffectHandler>> = {
  damage: applyDamageEffect,
  dot: applyStatusEffect('dot'),
  heal: applyHealEffect,
  hot: applyStatusEffect('hot'),
  buff: applyStatusEffect('buff'),
  debuff: applyStatusEffect('debuff'),
  shield: applyStatusEffect('shield'),
  counter: applyStatusEffect('counter'),
  ct_shift: applyCtShiftEffect,
  status: applyStatusGeneric,
  execute: applyExecuteEffect,
  cleanse: applyCleanseEffect,
  lifesteal: applyLifestealEffect,
  summon: applySummonEffect,
  utility: applyUtilityEffect,
};

export const applyEffect = (ctx: EffectContext): EffectOutcome => {
  const chance = resolveChance(ctx.effect);
  let cursor = ctx.cursor;
  if (chance < 1 - EPSILON) {
    const rolled = drawChance(ctx.state.seed, cursor, chance);
    cursor += 1;
    if (!rolled) return { state: ctx.state, cursor };
  }
  const handler = HANDLERS[ctx.effect.kind];
  return handler({ ...ctx, cursor });
};

export const applySkillEffects = (
  state: BattleState,
  caster: Unit,
  targetIds: readonly InstanceId[],
  skill: Skill,
  hit: HitRoll,
  cursor: number,
  tick: number,
): EffectOutcome => {
  let curState = state;
  let curCursor = cursor;
  for (const effect of skill.effects) {
    const outcome = applyEffect({
      state: curState,
      caster,
      targetIds,
      skill,
      effect,
      hit,
      cursor: curCursor,
      tick,
    });
    curState = outcome.state;
    curCursor = outcome.cursor;
  }
  return { state: curState, cursor: curCursor };
};


