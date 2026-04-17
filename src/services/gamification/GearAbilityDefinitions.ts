/**
 * GearAbilityDefinitions.ts — Active abilities granted by equipped gear.
 *
 * These are normal `SkillDefinition` records. They get merged into the single
 * `ALL_SKILLS_INDEX` built at module load in CampaignDefinitions.ts, so the
 * combat engine resolves them through the same `getSkillById` path as class
 * skills — there is no second registry, no fall-through, no source tag.
 *
 * Conventions:
 *   - IDs are namespaced with the gear ID prefix (e.g. `quickstep_ring_dash`)
 *     so collisions with class skills are impossible by construction.
 *   - `classId` is set to the closest thematic class. The field is required by
 *     the type, but the engine never branches on it for gear-sourced skills.
 *   - Costs and CT values tuned to be roughly equivalent to a low-rank class
 *     active so gear abilities feel like a meaningful but not dominant option.
 *
 * Adding a new gear ability:
 *   1. Add the SkillDefinition entry below.
 *   2. Reference the new ID from a piece of equipment in GearDefinitions.ts
 *      via `activeAbilitySkillId`.
 *
 * @see documentation/future/COMBATSYSTEM.md §8.3
 */

import type { SkillDefinition } from './CampaignTypes';

// ═══════════════════════════════════════════════════════════════════════
// Starter gear abilities
// ═══════════════════════════════════════════════════════════════════════

/**
 * Quickstep Dash — self-targeted. Grants a 1-turn speed buff and resets the
 * caster's CT to a small value, letting them act again sooner. Demonstrates
 * the auto-dispatch path (no TargetPicker for self-target skills).
 */
const QUICKSTEP_RING_DASH: SkillDefinition = {
  id: 'quickstep_ring_dash',
  classId: 'rogue' as any,
  name: 'Quickstep Dash',
  description: 'Surge forward. +5 SPD for 1 turn and act sooner next.',
  skillType: 'active',
  costType: 'mana',
  manaCost: 6,
  cooldownTurns: 0,
  hpCostPct: 0,
  scalingStat: 'speed',
  secondaryScalingStat: null,
  baseValue: 0,
  skillMultiplier: 0,
  targetType: 'self',
  hitCount: 0,
  unlockRank: 0,
  effectTags: ['buff'],
  ctCost: 30,
};

/**
 * Runed Smite — single-enemy target. Heavy damage with a precision boost.
 * Demonstrates the manual-targeting path: the WaterfallCommandMenu opens the
 * TargetPicker before dispatch even with one enemy on the field.
 */
const RUNED_LONGBLADE_SMITE: SkillDefinition = {
  id: 'runed_longblade_smite',
  classId: 'vanguard' as any,
  name: 'Runed Smite',
  description: 'A glowing overhead strike. Heavy damage, +2 PRC on the roll.',
  skillType: 'active',
  costType: 'mixed',
  manaCost: 8,
  cooldownTurns: 2,
  hpCostPct: 0,
  scalingStat: 'strength',
  secondaryScalingStat: 'precision',
  baseValue: 14,
  skillMultiplier: 1.4,
  targetType: 'single_enemy',
  hitCount: 1,
  unlockRank: 0,
  effectTags: ['damage'],
  ctCost: 70,
};

// ═══════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════

/**
 * Flat map of every gear ability, keyed by skill ID. Frozen at module load.
 * CampaignDefinitions imports this and spreads it into ALL_SKILLS_INDEX —
 * collisions are caught at startup by the index-build assertion.
 */
export const GEAR_ABILITIES: Readonly<Record<string, SkillDefinition>> = Object.freeze({
  [QUICKSTEP_RING_DASH.id]: QUICKSTEP_RING_DASH,
  [RUNED_LONGBLADE_SMITE.id]: RUNED_LONGBLADE_SMITE,
});
