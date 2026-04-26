import { type Skill } from '../types';

/**
 * Boss skill set — Stage 4 "simple stat-block bosses" pass.
 *
 * Each boss gets:
 *   - 1 basic attack (free, low CT cost)
 *   - 2-3 specials with cooldowns + cost
 *
 * Magnitudes are playable placeholders — flagged as P6 retune candidates in BALANCE_TUNING.md.
 * Fights should feel different from procedural enemies (themed damage type + DoT/CT mechanics)
 * but mechanics are intentionally simple: no on-hit triggers, no phase-driven ability swaps.
 */
export const BOSS_SKILLS: readonly Skill[] = [
  // -------------------------------------------------------------------------
  // Pyre Warden — Stage 5 mini-boss (fire DoT race)
  // -------------------------------------------------------------------------
  {
    id: 'boss.pyre.scorch',
    name: 'Scorch',
    description: 'Single-target fire jab.',
    ctCost: 30,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['ranged', 'fire'],
    effects: [
      { kind: 'damage', description: 'Fire damage.', magnitude: 1.4, damageType: 'fire' },
    ],
  },
  {
    id: 'boss.pyre.heat_surge',
    name: 'Heat Surge',
    description: 'Fire surge that burns for 6s.',
    ctCost: 50,
    cooldownSec: 8,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['fire', 'dot'],
    effects: [
      { kind: 'damage', description: 'Surge impact.', magnitude: 1.8, damageType: 'fire' },
      {
        kind: 'dot',
        description: 'Burn DoT.',
        magnitude: 0.04,
        magnitudeUnit: 'max_hp_percent',
        durationSec: 6,
        damageType: 'fire',
      },
    ],
  },
  {
    id: 'boss.pyre.ignite_aura',
    name: 'Ignite Aura',
    description: 'Self-buff: outgoing fire damage +25% for 8s.',
    ctCost: 60,
    cooldownSec: 16,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff', 'fire'],
    effects: [
      {
        kind: 'buff',
        description: 'Damage bonus.',
        magnitude: 0.25,
        magnitudeUnit: 'percent',
        durationSec: 8,
        statTag: 'strength',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Vortex Colossus — Stage 10 gate boss (CT manipulation)
  // -------------------------------------------------------------------------
  {
    id: 'boss.vortex.crush',
    name: 'Crush',
    description: 'Heavy single-target slam.',
    ctCost: 35,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['physical', 'single-target'],
    effects: [
      { kind: 'damage', description: 'Crushing blow.', magnitude: 1.6, damageType: 'physical' },
    ],
  },
  {
    id: 'boss.vortex.ct_rewind',
    name: 'CT Rewind',
    description: 'Push the target backward in the CT queue.',
    ctCost: 50,
    cooldownSec: 12,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['ct_manipulation', 'control'],
    effects: [
      {
        kind: 'ct_shift',
        description: 'Add CT to target (delay their action).',
        magnitude: 30,
        magnitudeUnit: 'flat',
      },
      { kind: 'damage', description: 'Glancing impact.', magnitude: 0.6, damageType: 'arcane' },
    ],
  },
  {
    id: 'boss.vortex.gravity_well',
    name: 'Gravity Well',
    description: 'Area arcane pulse that softens defenses.',
    ctCost: 60,
    cooldownSec: 14,
    resource: { type: 'none', cost: 0 },
    target: 'area',
    tags: ['aoe', 'debuff'],
    effects: [
      { kind: 'damage', description: 'Area arcane damage.', magnitude: 1.4, damageType: 'arcane' },
      {
        kind: 'debuff',
        description: 'Defense −15% for 6s.',
        magnitude: 0.15,
        magnitudeUnit: 'percent',
        durationSec: 6,
        statTag: 'defense',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Rimefang Hydra — Stage 30 counter boss (ice + Drakehorn counter)
  // -------------------------------------------------------------------------
  {
    id: 'boss.rimefang.ice_bite',
    name: 'Ice Bite',
    description: 'Frigid jaws strike.',
    ctCost: 32,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['physical', 'single-target'],
    effects: [
      { kind: 'damage', description: 'Cold-bite damage.', magnitude: 1.7, damageType: 'ice' },
    ],
  },
  {
    id: 'boss.rimefang.frostbite_aegis',
    name: 'Frostbite Aegis',
    description: 'Self-buff: damage reduction shield for 10s.',
    ctCost: 55,
    cooldownSec: 18,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['defense_break', 'buff'],
    effects: [
      {
        kind: 'shield',
        description: 'Absorb a chunk of incoming damage.',
        magnitude: 0.25,
        magnitudeUnit: 'max_hp_percent',
        durationSec: 10,
      },
      {
        kind: 'buff',
        description: 'Defense +20% during the shield.',
        magnitude: 0.20,
        magnitudeUnit: 'percent',
        durationSec: 10,
        statTag: 'defense',
      },
    ],
  },
  {
    id: 'boss.rimefang.regrow_head',
    name: 'Regrow Head',
    description: 'Restore some HP. Mythos: "regrows on fire kill" — currently a flat heal.',
    ctCost: 70,
    cooldownSec: 24,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['heal'],
    effects: [
      {
        kind: 'heal',
        description: 'Heal 15% max HP.',
        magnitude: 0.15,
        magnitudeUnit: 'max_hp_percent',
      },
    ],
  },
  {
    id: 'boss.rimefang.tail_whip',
    name: 'Tail Whip',
    description: 'Sweeping ice tail strike with knockback debuff.',
    ctCost: 45,
    cooldownSec: 10,
    resource: { type: 'none', cost: 0 },
    target: 'cone',
    tags: ['cone', 'physical', 'knockback'],
    effects: [
      { kind: 'damage', description: 'Ice tail damage.', magnitude: 1.3, damageType: 'ice' },
      {
        kind: 'debuff',
        description: 'Speed −20% for 6s.',
        magnitude: 0.20,
        magnitudeUnit: 'percent',
        durationSec: 6,
        statTag: 'speed',
      },
    ],
  },
];
