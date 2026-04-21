import type { UnspecifiedOr } from './sentinel';
import type { LineageId } from './ids';
import type { ClassTier } from './class';

export type ArchetypeLabel =
  | 'ignis'
  | 'aegis'
  | 'arcana'
  | 'rift'
  | 'solaris'
  | 'nox'
  | 'seraph'
  | 'umbra'
  | 'tempest'
  | 'terra'
  | 'chrono'
  | 'spirit';

export type ZodiacLabel =
  | 'dragon'
  | 'ox'
  | 'monkey'
  | 'rabbit'
  | 'rooster'
  | 'snake'
  | 'goat'
  | 'rat'
  | 'horse'
  | 'pig'
  | 'tiger'
  | 'dog';

export interface UpgradeBonus {
  rank: number;
  effect: string;
  magnitude: UnspecifiedOr<number>;
  magnitudeUnit?: 'flat' | 'percent' | 'multiplier';
}

export interface LineageUniqueMechanic {
  id: string;
  name: string;
  shortDescription: string;
  evolutionByTier: Record<ClassTier, string>;
}

export interface Lineage {
  id: LineageId;
  name: string;
  archetype: ArchetypeLabel;
  zodiac: ZodiacLabel;
  themeTags: string[];
  adjacentLineageIds: LineageId[];
  upgradeBonuses: UnspecifiedOr<UpgradeBonus[]>;
  uniqueMechanic: UnspecifiedOr<LineageUniqueMechanic>;
  description?: string;
}
