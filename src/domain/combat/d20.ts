import { drawRangeInt } from './prng';
import type { HitTier } from './types';

export interface HitRoll {
  readonly tier: HitTier;
  readonly severity: number;
  readonly nextCursor: number;
}

export const rollHit = (seed: number, cursor: number): HitRoll => {
  const d20 = drawRangeInt(seed, cursor, 1, 20);
  const afterD20 = cursor + 1;
  if (d20 <= 9) return { tier: 'fail', severity: 0, nextCursor: afterD20 };
  if (d20 <= 17) return { tier: 'normal', severity: 1, nextCursor: afterD20 };
  if (d20 <= 19) return { tier: 'strong', severity: 1.5, nextCursor: afterD20 };
  const d12 = drawRangeInt(seed, afterD20, 1, 12);
  return {
    tier: 'critical',
    severity: 1 + d12 * 0.25,
    nextCursor: afterD20 + 1,
  };
};

export const mitigate = (rawDamage: number, defense: number): number =>
  rawDamage * (100 / (100 + 2 * Math.max(0, defense)));

export const applyResistance = (damage: number, resistance: number): number =>
  damage * (1 - Math.max(0, Math.min(1, resistance)));
