// ─── Dismantling Yield Table ──────────────────────────────────────
// Defines material returns for breaking down gear by tier + rarity.
// Used by the dismantle flow in useGearInventory and dismantleGear CF.

import type { GearTier } from './types/gear';

export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface DismantleYield {
  readonly scrap: number;
  readonly quantumCores: number;
  readonly credits: number;
}

/**
 * Yield matrix: tier (1-5) × rarity (5 levels).
 * Higher tier + higher rarity = more materials.
 */
const YIELD_TABLE: Record<GearTier, Record<GearRarity, DismantleYield>> = {
  1: {
    common:   { scrap: 5,  quantumCores: 0, credits: 0 },
    rare:     { scrap: 10, quantumCores: 0, credits: 5 },
    epic:     { scrap: 15, quantumCores: 0, credits: 10 },
    legendary:{ scrap: 25, quantumCores: 1, credits: 20 },
    mythic:   { scrap: 40, quantumCores: 2, credits: 35 },
  },
  2: {
    common:   { scrap: 15, quantumCores: 0, credits: 5 },
    rare:     { scrap: 25, quantumCores: 0, credits: 10 },
    epic:     { scrap: 40, quantumCores: 2, credits: 20 },
    legendary:{ scrap: 60, quantumCores: 3, credits: 40 },
    mythic:   { scrap: 90, quantumCores: 5, credits: 60 },
  },
  3: {
    common:   { scrap: 30, quantumCores: 0, credits: 10 },
    rare:     { scrap: 50, quantumCores: 3, credits: 25 },
    epic:     { scrap: 75, quantumCores: 5, credits: 45 },
    legendary:{ scrap: 120,quantumCores: 8, credits: 75 },
    mythic:   { scrap: 180,quantumCores: 12,credits: 110 },
  },
  4: {
    common:   { scrap: 50, quantumCores: 2,  credits: 20 },
    rare:     { scrap: 85, quantumCores: 5,  credits: 45 },
    epic:     { scrap: 130,quantumCores: 10, credits: 80 },
    legendary:{ scrap: 200,quantumCores: 18, credits: 140 },
    mythic:   { scrap: 300,quantumCores: 30, credits: 220 },
  },
  5: {
    common:   { scrap: 80, quantumCores: 5,  credits: 40 },
    rare:     { scrap: 130,quantumCores: 12, credits: 80 },
    epic:     { scrap: 200,quantumCores: 25, credits: 150 },
    legendary:{ scrap: 350,quantumCores: 50, credits: 280 },
    mythic:   { scrap: 500,quantumCores: 80, credits: 450 },
  },
};

/** Look up the dismantle yield for a gear item. Falls back to common if rarity not found. */
export function getDismantleYield(tier: GearTier, rarity: GearRarity): DismantleYield {
  const tierRow = YIELD_TABLE[tier];
  if (!tierRow) {
    return { scrap: 0, quantumCores: 0, credits: 0 };
  }
  return tierRow[rarity] ?? tierRow['common']!;
}
