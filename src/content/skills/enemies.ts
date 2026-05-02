import { type Skill } from '../types';

/**
 * Procedural enemy skill set — Combat Identity Pass.
 *
 * 5 archetypes get real skills: ct_manipulator, sustain_denial, dps_race, summoner, nullshield.
 * Each archetype has:
 *   - 1 basic attack (neverMiss, ctCost 40, no cooldown)
 *   - 1 signature skill that expresses the archetype's mechanical identity
 *
 * Remaining 4 archetypes (stat_wall, speed_pressure, chaos_dps, engineer) use stat scaling only
 * this pass and fall back to SYNTHETIC_BASIC_ATTACK.
 *
 * Magnitudes are initial playable values — flagged for retune after dogfood.
 */
export const ENEMY_SKILLS: readonly Skill[] = [
  // ---------------------------------------------------------------------------
  // CT Manipulator — rewinds player CT, forcing broken rotations
  // ---------------------------------------------------------------------------
  {
    id: 'enemy.ct_manipulator.strike',
    name: 'Temporal Strike',
    description: 'A fast physical strike.',
    ctCost: 40,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['ranged'],
    neverMiss: true,
    effects: [
      { kind: 'damage', description: 'Physical impact.', magnitude: 0.9, magnitudeUnit: 'multiplier', damageType: 'physical' },
    ],
  },
  {
    id: 'enemy.ct_manipulator.rewind',
    name: 'Temporal Rewind',
    description: 'Rewinds one target\'s CT by 20, delaying their next action.',
    ctCost: 30,
    cooldownSec: 15,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['ct_manipulation', 'control'],
    effects: [
      { kind: 'ct_shift', description: 'Rewind target CT by 20.', magnitude: 20 },
    ],
  },

  // ---------------------------------------------------------------------------
  // Sustain Denial — debuffs incoming heals on the target
  // ---------------------------------------------------------------------------
  {
    id: 'enemy.sustain_denial.strike',
    name: 'Suppressing Strike',
    description: 'A physical blow that weakens healing.',
    ctCost: 40,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: [],
    neverMiss: true,
    effects: [
      { kind: 'damage', description: 'Physical damage.', magnitude: 0.9, magnitudeUnit: 'multiplier', damageType: 'physical' },
    ],
  },
  {
    id: 'enemy.sustain_denial.suppress',
    name: 'Mending Suppression',
    description: 'Applies a debuff that reduces incoming healing by 50% for 25s.',
    ctCost: 35,
    cooldownSec: 20,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['debuff'],
    effects: [
      {
        kind: 'debuff',
        description: 'Healing received -50%.',
        magnitude: 0.5,
        magnitudeUnit: 'percent',
        durationSec: 25,
        statTag: 'heal_reduction',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DPS Race — stacks a permanent strength buff each use, escalating damage
  // ---------------------------------------------------------------------------
  {
    id: 'enemy.dps_race.strike',
    name: 'Frenzied Strike',
    description: 'An aggressive physical blow.',
    ctCost: 40,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: [],
    neverMiss: true,
    effects: [
      { kind: 'damage', description: 'Physical damage.', magnitude: 1.0, magnitudeUnit: 'multiplier', damageType: 'physical' },
    ],
  },
  {
    id: 'enemy.dps_race.ramp',
    name: 'Escalating Fury',
    description: 'Stacks +25% strength on self. Each cast makes this enemy hit harder.',
    ctCost: 25,
    cooldownSec: 12,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'buff',
        description: 'Strength +25%.',
        magnitude: 0.25,
        magnitudeUnit: 'percent',
        durationSec: 999,
        statTag: 'strength',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Summoner — spawns a Thrall unit to join the fight
  // ---------------------------------------------------------------------------
  {
    id: 'enemy.summoner.strike',
    name: 'Pack Strike',
    description: 'A physical blow.',
    ctCost: 40,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: [],
    neverMiss: true,
    effects: [
      { kind: 'damage', description: 'Physical damage.', magnitude: 0.8, magnitudeUnit: 'multiplier', damageType: 'physical' },
    ],
  },
  {
    id: 'enemy.summoner.call',
    name: 'Call Thrall',
    description: 'Summons a Thrall to fight alongside this enemy.',
    ctCost: 45,
    cooldownSec: 30,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['summon'],
    effects: [
      { kind: 'summon', description: 'Spawns a Thrall unit.' },
    ],
  },

  // ---------------------------------------------------------------------------
  // Nullshield — raises a large personal shield before the player can burst it
  // ---------------------------------------------------------------------------
  {
    id: 'enemy.nullshield.strike',
    name: 'Shielded Bash',
    description: 'A physical blow from behind the barrier.',
    ctCost: 40,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: [],
    neverMiss: true,
    effects: [
      { kind: 'damage', description: 'Physical damage.', magnitude: 0.9, magnitudeUnit: 'multiplier', damageType: 'physical' },
    ],
  },
  {
    id: 'enemy.nullshield.barrier',
    name: 'Null Barrier',
    description: 'Raises a shield absorbing up to 50% of max HP in incoming damage for 20s.',
    ctCost: 35,
    cooldownSec: 25,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['defense_break'],
    effects: [
      {
        kind: 'shield',
        description: 'Absorb shield for 50% max HP.',
        magnitude: 0.5,
        magnitudeUnit: 'max_hp_percent',
        durationSec: 20,
      },
    ],
  },
];
