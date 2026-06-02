// ─── Corporation Definition ───────────────────────────────────────
// Replaces the LineageDef from the fantasy system.
// Corporations are mega-factions that define tech trees and identity.

import type { UnspecifiedOr } from './sentinel';

/** Unique identifier for a corporation. */
export type CorporationId = string;

/** Tier of tech specialization (1-5). */
export type TechTier = 1 | 2 | 3 | 4 | 5;

export interface CorporationUniqueMechanic {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: string;
  /** How the mechanic scales at each tech tier. */
  readonly evolutionByTier: Record<TechTier, string>;
}

export interface CorporationUpgradeBonus {
  readonly rank: number;      // 1-10
  readonly effect: string;
  readonly magnitude: UnspecifiedOr<number>;
  readonly magnitudeUnit?: 'flat' | 'percent' | 'multiplier' | 'seconds';
}

export interface CorporationDef {
  readonly id: CorporationId;
  readonly name: string;
  /** The corporate archetype (drives visual + mechanical identity). */
  readonly archetype:
    | 'energy'       // plasma/electro focus
    | 'bio'          // biological modification
    | 'digital'      // hacking, data, stealth
    | 'gravity'      // spatial/force manipulation
    | 'psionic'      // mental, telekinetic
    | 'defense'      // shields, armor, fortification
    | 'speed'        // velocity, reaction time
    | 'swarm'        // drones, minions, networked
    | 'decay'        // corrosion, attrition
    | 'radiation'    // ionizing, decay over time
    | 'resonance'    // vibration, support, harmonics
    | 'chrono';      // time manipulation
  /** Theme tags for synergy and UI. */
  readonly themeTags: readonly string[];
  /** Adjacent corporations for cross-training. */
  readonly adjacentCorpIds: readonly CorporationId[];
  /** The unique mechanic that defines this corp's playstyle. */
  readonly uniqueMechanic: CorporationUniqueMechanic;
  /** Per-rank upgrade bonuses (10 ranks per corp). */
  readonly upgradeBonuses: readonly CorporationUpgradeBonus[];
  /** Flavor description. */
  readonly description: string;
}
