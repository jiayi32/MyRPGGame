/**
 * GearMath.ts — Pure stat-resolution helpers for equipment.
 *
 * Implements the deterministic math chain from COMBATSYSTEM.md §9:
 *
 *   final[stat] = (base[stat] + sum(flatStatBonuses))
 *                 × weapon.mult × armour.mult × accessory.mult
 *                 + sum(statSkewProfile)
 *
 * Passive multipliers and battle buffs are applied later by the combat engine,
 * so this module is concerned only with the base+gear layers.
 *
 * Every helper is pure: no I/O, no mutation, no Firestore. Safe to unit-test
 * in isolation and safe to call from React render paths.
 *
 * @see documentation/future/COMBATSYSTEM.md §9, §12
 */

import {
  type StatBlock,
  type StatKey,
  type Equipment,
  type ItemSlot,
  ITEM_SLOTS,
  GEAR_CT_REDUCTION_CAP,
} from './CampaignTypes';

const STAT_KEYS: readonly StatKey[] = [
  'strength',
  'defense',
  'speed',
  'health',
  'mana',
  'cdr',
  'precision',
] as const;

/** Returns a stat block where every key is zero. Used as the additive identity. */
function zeroStats(): StatBlock {
  return { strength: 0, defense: 0, speed: 0, health: 0, mana: 0, cdr: 0, precision: 0 };
}

/** Add a partial stat block into a full one, in place. Returns the mutated target for chaining. */
function addPartialInto(target: StatBlock, partial?: Partial<StatBlock>): StatBlock {
  if (!partial) return target;
  for (const key of STAT_KEYS) {
    const v = partial[key];
    if (v) target[key] += v;
  }
  return target;
}

/**
 * Multiply each stat in `target` by the corresponding entry in `multipliers`.
 * Missing keys are treated as 1.0 (neutral). Mutates in place.
 */
function multiplyInto(target: StatBlock, multipliers?: Partial<Record<StatKey, number>>): StatBlock {
  if (!multipliers) return target;
  for (const key of STAT_KEYS) {
    const m = multipliers[key];
    if (m != null && m !== 1) target[key] *= m;
  }
  return target;
}

/**
 * Resolve base stats through equipped gear into a final StatBlock.
 *
 * Order (fixed, deterministic):
 *   1. Start from base.
 *   2. Add all flat stat bonuses from every equipped item.
 *   3. Apply multiplicative bonuses in slot order: weapon → armour → accessory.
 *   4. Add stat-skew profiles from every equipped item (additive on final).
 *
 * All non-integer results are floored at the end — combat stats are integers.
 */
export function resolveGearStats(base: StatBlock, equipped: readonly Equipment[]): StatBlock {
  const result: StatBlock = { ...base };

  // Step 2: flat bonuses (order-independent, so one pass).
  for (const item of equipped) addPartialInto(result, item.flatStatBonuses);

  // Step 3: multiplicative bonuses in fixed slot order.
  // If multiple items share a slot (shouldn't happen in practice, but defensive),
  // they compose within their slot group.
  for (const slot of ITEM_SLOTS) {
    for (const item of equipped) {
      if (item.slot === slot) multiplyInto(result, item.multiplicativeBonuses);
    }
  }

  // Step 4: stat skew (additive, after multipliers).
  for (const item of equipped) addPartialInto(result, item.statSkewProfile);

  // Floor every stat — combat engine assumes integers.
  for (const key of STAT_KEYS) result[key] = Math.floor(result[key]);
  return result;
}

/**
 * Total gear-based CT reduction, capped at GEAR_CT_REDUCTION_CAP (10%).
 * Returns a fraction in [0, GEAR_CT_REDUCTION_CAP].
 */
export function calculateGearCtReduction(equipped: readonly Equipment[]): number {
  let total = 0;
  for (const item of equipped) total += item.ctReductionPercent ?? 0;
  if (total <= 0) return 0;
  return Math.min(GEAR_CT_REDUCTION_CAP, total);
}

/**
 * Apply gear CT reduction to a base action cost. Floors result at 1 so no
 * action is instant. Undefined reduction = unchanged cost (enemies, legacy).
 */
export function applyActionCt(baseCost: number, reduction: number | undefined): number {
  if (!reduction) return baseCost;
  return Math.max(1, Math.floor(baseCost * (1 - reduction)));
}

/**
 * Compute the per-stat delta produced by adding `item` to the currently equipped set.
 * Used by the gear screen to preview "+5 STR, -2 SPD" before confirming an equip.
 *
 * Returns a delta StatBlock (next - current). If equipping would replace an item
 * in the same slot, pass the replaced item in `replacing`.
 */
export function previewEquipDelta(
  base: StatBlock,
  currentEquipped: readonly Equipment[],
  adding: Equipment,
  replacing?: Equipment,
): StatBlock {
  const before = resolveGearStats(base, currentEquipped);
  const nextEquipped = currentEquipped
    .filter(e => e.id !== replacing?.id)
    .concat(adding);
  const after = resolveGearStats(base, nextEquipped);

  const delta = zeroStats();
  for (const key of STAT_KEYS) delta[key] = after[key] - before[key];
  return delta;
}
