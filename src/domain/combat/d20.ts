import { drawRangeInt } from './prng';
import type { HitTier } from './types';

export interface HitRoll {
  readonly tier: HitTier;
  readonly severity: number;
  readonly nextCursor: number;
}

export interface HitThresholds {
  readonly failThreshold: number;
  readonly strongThreshold: number;
  readonly critThreshold: number;
}

/** Severity multiplier for a normal (d20 10–17) hit. */
export const SEVERITY_NORMAL = 1.0;
/** Severity multiplier for a strong (d20 18–19) hit. */
export const SEVERITY_STRONG = 1.5;
/** Minimum severity for a critical (d20 20, d12=1) hit. */
export const SEVERITY_CRIT_MIN = 1.5;
/** Maximum severity for a critical (d20 20, d12=12) hit. */
export const SEVERITY_CRIT_MAX = 1.5 + 11 * 0.075; // 2.325

export const DEFAULT_HIT_THRESHOLDS: HitThresholds = {
  failThreshold: 2,
  strongThreshold: 18,
  critThreshold: 20,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const computeHitThresholds = (
  attackerAgility: number,
  defenderAgility: number,
  attackerCritChance: number,
): HitThresholds => {
  const critFaces = clamp(Math.round(attackerCritChance * 20), 1, 5);
  const critThreshold = 21 - critFaces;
  const strongThreshold = Math.max(critThreshold - 2, 2);
  const agilityDelta = defenderAgility - attackerAgility;
  const failThreshold = clamp(
    2 + Math.floor(agilityDelta / 10),
    1,
    strongThreshold - 1,
  );
  return { failThreshold, strongThreshold, critThreshold };
};

export const rollHit = (
  seed: number,
  cursor: number,
  thresholds: HitThresholds,
): HitRoll => {
  const d20 = drawRangeInt(seed, cursor, 1, 20);
  const afterD20 = cursor + 1;
  if (d20 <= thresholds.failThreshold) {
    return { tier: 'fail', severity: 0, nextCursor: afterD20 };
  }
  if (d20 >= thresholds.critThreshold) {
    const d12 = drawRangeInt(seed, afterD20, 1, 12);
    return {
      tier: 'critical',
      severity: SEVERITY_CRIT_MIN + (d12 - 1) * 0.075,
      nextCursor: afterD20 + 1,
    };
  }
  if (d20 >= thresholds.strongThreshold) {
    return { tier: 'strong', severity: SEVERITY_STRONG, nextCursor: afterD20 };
  }
  return { tier: 'normal', severity: SEVERITY_NORMAL, nextCursor: afterD20 };
};

export const mitigate = (rawDamage: number, defense: number): number =>
  rawDamage * (100 / (100 + 2 * Math.max(0, defense)));

export const applyResistance = (damage: number, resistance: number): number =>
  damage * (1 - Math.max(0, Math.min(1, resistance)));
