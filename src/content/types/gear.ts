import type { UnspecifiedOr } from './sentinel';
import type { GearId, LineageId } from './ids';

export type GearSlot = 'weapon' | 'armor' | 'accessory';

export type GearTier = 1 | 2 | 3 | 4 | 5;

export type GearRole = 'tank' | 'dps' | 'support' | 'hybrid' | 'control';

export type GearRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface GearPassive {
  category: string;
  effect: string;
  magnitude: UnspecifiedOr<number>;
  magnitudeUnit?: 'flat' | 'percent' | 'multiplier';
}

export interface GearTrigger {
  trigger: string;
  effect: string;
  magnitude: UnspecifiedOr<number>;
}

export interface GearUpgradeLevel {
  level: number;
  cost: UnspecifiedOr<number>;
  addStats: UnspecifiedOr<Record<string, number>>;
  addMults?: UnspecifiedOr<Record<string, number>>;
}

export const CT_REDUCTION_CAP = 0.1 as const;

export interface GearItem {
  id: GearId;
  name: string;
  slot: GearSlot;
  tier: GearTier;
  lineageId?: LineageId;
  rarity: GearRarity;
  baseStats: UnspecifiedOr<Record<string, number>>;
  multStats: UnspecifiedOr<Record<string, number>>;
  passives: GearPassive[];
  triggers: GearTrigger[];
  tradeoffs: UnspecifiedOr<Record<string, number>>;
  ctReductionPct?: number;
  upgradeLevels: UnspecifiedOr<GearUpgradeLevel[]>;
  description?: string;
}

export interface GearTemplate {
  id: string;
  tier: Exclude<GearTier, 5>;
  role: GearRole;
  slot: GearSlot;
  description: string;
  baseStatsHint: UnspecifiedOr<Record<string, number>>;
  passives: GearPassive[];
  triggers: GearTrigger[];
}
