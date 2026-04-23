import { applyResistance, mitigate } from './d20';
import { clamp } from './stateUtils';
import { defenseFor, effectiveStats, resistanceFor } from './stats';
import type {
  BattleEvent,
  BattleState,
  InstanceId,
  StatusInstance,
  Unit,
} from './types';

const EPSILON = 1e-9;

const aliveUnits = (state: BattleState): readonly Unit[] =>
  Object.values(state.units).filter((u) => !u.isDead);

const teamAlive = (state: BattleState, team: Unit['team']): boolean =>
  aliveUnits(state).some((u) => u.team === team);

const resolveResult = (state: BattleState): BattleState['result'] => {
  const playerAlive = teamAlive(state, 'player');
  const enemyAlive = teamAlive(state, 'enemy');
  if (!playerAlive && !enemyAlive) return 'draw';
  if (!playerAlive) return 'lost';
  if (!enemyAlive) return 'won';
  return 'ongoing';
};

export const sortedTurnOrder = (
  units: Readonly<Record<InstanceId, Unit>>,
): readonly InstanceId[] =>
  Object.values(units)
    .filter((u) => !u.isDead)
    .map((u) => ({
      id: u.id,
      ct: u.ct,
      speed: effectiveStats(u).speed,
      insertionIndex: u.insertionIndex,
    }))
    .sort((a, b) => {
      if (a.ct !== b.ct) return a.ct - b.ct;
      if (a.speed !== b.speed) return b.speed - a.speed;
      return a.insertionIndex - b.insertionIndex;
    })
    .map((u) => u.id);

export const pickReady = (state: BattleState): Unit | null => {
  for (const id of state.turnOrder) {
    const unit = state.units[id];
    if (unit === undefined || unit.isDead) continue;
    if (unit.ct > EPSILON) return null;
    if (unit.statuses.some((s) => s.kind === 'stun')) continue;
    return unit;
  }
  return null;
};

export const nextReadyDelta = (state: BattleState): number => {
  // Determine whether any alive unit is actable (ct ≤ 0 and NOT stunned).
  // If so, no time advancement is needed — pickReady will handle it.
  //
  // Otherwise we must advance past the stall. The next meaningful event is
  // the EARLIER of:
  //   (a) the soonest non-stunned unit reaching ct=0  (it can then act)
  //   (b) the soonest stun expiry on a ct≤0 unit      (it unblocks that unit)
  //
  // If every alive unit is stunned with positive ct (rare), fall back to
  // bringing the soonest of them to ct=0 so the stun can then expire.
  let hasActableReady = false;
  let minPositiveNonStunnedCt = Infinity;   // non-stunned unit, ct > 0
  let minStunRemainingAtZero = Infinity;    // stunned unit, ct ≤ 0
  let minStunnedPositiveCt = Infinity;      // stunned unit, ct > 0 (last resort)

  for (const unit of Object.values(state.units)) {
    if (unit.isDead) continue;
    const isStunned = unit.statuses.some((s) => s.kind === 'stun');
    if (unit.ct <= EPSILON) {
      if (!isStunned) {
        hasActableReady = true;
      } else {
        for (const s of unit.statuses) {
          if (s.kind === 'stun' && s.remainingSec < minStunRemainingAtZero) {
            minStunRemainingAtZero = s.remainingSec;
          }
        }
      }
    } else if (!isStunned) {
      if (unit.ct < minPositiveNonStunnedCt) minPositiveNonStunnedCt = unit.ct;
    } else {
      if (unit.ct < minStunnedPositiveCt) minStunnedPositiveCt = unit.ct;
    }
  }

  if (hasActableReady) return 0;

  // Nearest event: non-stunned unit ready vs. stun expiry for a blocked unit.
  const nearestEvent = Math.min(minPositiveNonStunnedCt, minStunRemainingAtZero);
  if (Number.isFinite(nearestEvent)) return Math.max(0, nearestEvent);

  // Last resort: all alive units are stunned with positive ct — bring the
  // earliest one to ct=0 so the stun can expire on the following advance.
  return Number.isFinite(minStunnedPositiveCt) ? Math.max(0, minStunnedPositiveCt) : 0;
};

const decrementCooldowns = (
  cooldowns: Readonly<Record<string, number>>,
  dt: number,
): Readonly<Record<string, number>> => {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(cooldowns)) {
    const remaining = v - dt;
    if (remaining > EPSILON) next[k] = remaining;
  }
  return next;
};

interface StatusTickOutcome {
  readonly status: StatusInstance | null;
  readonly damageToTarget: number;
  readonly healToTarget: number;
  readonly events: readonly BattleEvent[];
}

const computeStatusDamage = (
  status: StatusInstance,
  target: Unit,
): number => {
  const { magnitude, magnitudeUnit, damageType, sourceStrength, sourceIntellect } =
    status.snapshot;
  let base = 0;
  switch (magnitudeUnit) {
    case 'max_hp_percent':
      base = target.hpMax * magnitude;
      break;
    case 'hp_percent':
      base = target.hp * magnitude;
      break;
    case 'percent':
    case 'multiplier': {
      const power =
        damageType === undefined || damageType === 'physical'
          ? sourceStrength
          : sourceIntellect;
      base = power * magnitude;
      break;
    }
    case 'flat':
    default:
      base = magnitude;
  }
  base *= status.stacks;
  if (damageType === undefined) return base;
  const stats = effectiveStats(target);
  const mitigated = mitigate(base, defenseFor(stats, damageType));
  return applyResistance(mitigated, resistanceFor(stats, damageType));
};

const computeStatusHeal = (status: StatusInstance, target: Unit): number => {
  const { magnitude, magnitudeUnit, sourceIntellect } = status.snapshot;
  let base = 0;
  switch (magnitudeUnit) {
    case 'max_hp_percent':
      base = target.hpMax * magnitude;
      break;
    case 'hp_percent':
      base = target.hp * magnitude;
      break;
    case 'percent':
    case 'multiplier':
      base = sourceIntellect * magnitude;
      break;
    case 'flat':
    default:
      base = magnitude;
  }
  return base * status.stacks;
};

const advanceStatus = (
  status: StatusInstance,
  target: Unit,
  dt: number,
  tick: number,
): StatusTickOutcome => {
  const remainingSec = status.remainingSec - dt;
  const events: BattleEvent[] = [];
  let damage = 0;
  let heal = 0;

  if (status.kind === 'dot' || status.kind === 'hot') {
    const interval = Math.max(EPSILON, status.tickIntervalSec);
    const effectiveDt = Math.min(dt, Math.max(0, status.remainingSec));
    const accumulated = status.secSinceLastTick + effectiveDt;
    const ticksFired = Math.max(0, Math.floor((accumulated + EPSILON) / interval));
    const leftover = accumulated - ticksFired * interval;

    for (let i = 0; i < ticksFired; i += 1) {
      if (status.kind === 'dot') {
        const d = computeStatusDamage(status, target);
        damage += d;
        events.push({
          tick,
          type: 'status_tick',
          targetUnitId: target.id,
          statusKind: 'dot',
          amount: d,
        });
      } else {
        const h = computeStatusHeal(status, target);
        heal += h;
        events.push({
          tick,
          type: 'status_tick',
          targetUnitId: target.id,
          statusKind: 'hot',
          amount: h,
        });
      }
    }

    if (remainingSec <= EPSILON) {
      events.push({
        tick,
        type: 'status_expired',
        targetUnitId: target.id,
        statusKind: status.kind,
        skillId: status.skillId,
      });
      return { status: null, damageToTarget: damage, healToTarget: heal, events };
    }
    return {
      status: {
        ...status,
        remainingSec,
        secSinceLastTick: leftover,
      },
      damageToTarget: damage,
      healToTarget: heal,
      events,
    };
  }

  if (remainingSec <= EPSILON) {
    events.push({
      tick,
      type: 'status_expired',
      targetUnitId: target.id,
      statusKind: status.kind,
      skillId: status.skillId,
    });
    return { status: null, damageToTarget: 0, healToTarget: 0, events };
  }
  return {
    status: { ...status, remainingSec },
    damageToTarget: 0,
    healToTarget: 0,
    events: [],
  };
};

// clamp is imported from ./stateUtils

export const advance = (state: BattleState): BattleState => {
  if (state.result !== 'ongoing') return state;
  const dt = nextReadyDelta(state);
  if (dt <= EPSILON) return state;

  const tick = state.tick + 1;
  const nextUnits: Record<InstanceId, Unit> = {};
  const events: BattleEvent[] = [];

  for (const unit of Object.values(state.units)) {
    if (unit.isDead) {
      nextUnits[unit.id] = unit;
      continue;
    }

    const nextStatuses: StatusInstance[] = [];
    let damageAccum = 0;
    let healAccum = 0;
    for (const status of unit.statuses) {
      const outcome = advanceStatus(status, unit, dt, tick);
      damageAccum += outcome.damageToTarget;
      healAccum += outcome.healToTarget;
      for (const ev of outcome.events) events.push(ev);
      if (outcome.status !== null) nextStatuses.push(outcome.status);
    }

    const hpAfter = clamp(unit.hp - damageAccum + healAccum, 0, unit.hpMax);
    const isDead = hpAfter <= 0;
    if (damageAccum > 0 && !unit.isDead) {
      events.push({
        tick,
        type: 'damage',
        sourceUnitId: unit.id,
        targetUnitId: unit.id,
        amount: damageAccum,
        damageType: 'true',
        hitTier: 'normal',
      });
    }
    if (healAccum > 0) {
      events.push({
        tick,
        type: 'heal',
        sourceUnitId: unit.id,
        targetUnitId: unit.id,
        amount: healAccum,
      });
    }
    if (isDead && !unit.isDead) {
      events.push({ tick, type: 'unit_died', unitId: unit.id });
    }

    nextUnits[unit.id] = {
      ...unit,
      ct: unit.ct - dt,
      hp: hpAfter,
      isDead,
      cooldowns: decrementCooldowns(unit.cooldowns, dt),
      statuses: nextStatuses,
    };
  }

  const turnOrder = sortedTurnOrder(nextUnits);
  const after: BattleState = {
    ...state,
    tick,
    elapsedSec: state.elapsedSec + dt,
    units: nextUnits,
    turnOrder,
    log: [...state.log, ...events],
  };
  const result = resolveResult(after);
  if (result !== 'ongoing') {
    return {
      ...after,
      result,
      log: [...after.log, { tick, type: 'battle_ended', result }],
    };
  }
  return after;
};

export const spendCT = (
  state: BattleState,
  unitId: InstanceId,
  cost: number,
): BattleState => {
  const unit = state.units[unitId];
  if (unit === undefined) return state;
  const nextUnits = {
    ...state.units,
    [unitId]: { ...unit, ct: unit.ct + cost },
  };
  return { ...state, units: nextUnits, turnOrder: sortedTurnOrder(nextUnits) };
};

export const shiftCT = (
  state: BattleState,
  unitId: InstanceId,
  delta: number,
): BattleState => {
  const unit = state.units[unitId];
  if (unit === undefined) return state;
  const nextUnits = {
    ...state.units,
    [unitId]: { ...unit, ct: unit.ct + delta },
  };
  return {
    ...state,
    units: nextUnits,
    turnOrder: sortedTurnOrder(nextUnits),
    log: [
      ...state.log,
      { tick: state.tick, type: 'ct_shift', targetUnitId: unitId, delta },
    ],
  };
};
