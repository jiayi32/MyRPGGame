import type { Skill } from '../types';

/**
 * Item skills — one per stim/consumable.
 * These are resolved via skillLookup(itemSkillId) in useItemInternal().
 * CT cost and cooldown are overridden by the engine (ITEM_CT_COST=15, ITEM_COOLDOWN_SEC=30).
 */

export const ITEM_SKILLS: readonly Skill[] = [
  // ── Common Stims ──────────────────────────────────────────────
  {
    id: 'item.adrenal_stim',
    name: 'Adrenal Stim',
    description: 'Next attack deals +40% damage.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'buff',
        description: '+40% damage on next attack',
        magnitude: 40,
        magnitudeUnit: 'percent',
        durationSec: 15,
        statTag: 'damageBoost',
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.nano_repair',
    name: 'Nano-Repair Patch',
    description: 'Instantly heal 25% of max HP.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['heal'],
    effects: [
      {
        kind: 'heal',
        description: 'Heal 25% max HP',
        magnitude: 25,
        magnitudeUnit: 'max_hp_percent',
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.barrier_injector',
    name: 'Barrier Injector',
    description: 'Gain shield equal to 15% of max HP.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'shield',
        description: 'Shield for 15% max HP',
        magnitude: 15,
        magnitudeUnit: 'max_hp_percent',
        durationSec: 20,
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.mp_cell',
    name: 'MP Capacitor Cell',
    description: 'Restore 30% of max MP.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'buff',
        description: 'Restore 30% MP',
        magnitude: 30,
        magnitudeUnit: 'mp_percent',
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.cleanse_ampoule',
    name: 'Cleanse Ampoule',
    description: 'Remove 1 random debuff.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['cleanse'],
    effects: [
      {
        kind: 'cleanse',
        description: 'Remove 1 debuff',
        magnitude: 1,
        magnitudeUnit: 'flat',
      },
    ],
    neverMiss: true,
  },

  // ── Uncommon Stims ────────────────────────────────────────────
  {
    id: 'item.overclock_injector',
    name: 'Overclock Injector',
    description: 'Instantly reset CT to 0 — act again immediately.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['ct_manipulation'],
    effects: [
      {
        kind: 'ct_shift',
        description: 'Reset CT to 0',
        magnitude: -999,
        magnitudeUnit: 'flat',
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.emp_grenade',
    name: 'EMP Grenade',
    description: 'Stun target enemy for 1 full turn.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['control'],
    effects: [
      {
        kind: 'debuff',
        description: 'Stun target for 1 turn',
        magnitude: 1,
        magnitudeUnit: 'flat',
        durationSec: 8,
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.phase_shift',
    name: 'Phase Shift Module',
    description: 'Dodge the next incoming attack entirely.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'utility',
        description: 'Dodge next attack',
        magnitude: 1,
        magnitudeUnit: 'flat',
        durationSec: 12,
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.data_spike',
    name: 'Data Spike',
    description: 'Reveal target enemy intent for 3 turns.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['debuff'],
    effects: [
      {
        kind: 'debuff',
        description: 'Reveal intent for 3 turns',
        magnitude: 3,
        magnitudeUnit: 'flat',
        durationSec: 18,
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.ct_scrambler',
    name: 'CT Scrambler',
    description: 'Delay target enemy CT by +25 ticks.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['ct_manipulation'],
    effects: [
      {
        kind: 'ct_shift',
        description: 'Delay enemy CT +25',
        magnitude: 25,
        magnitudeUnit: 'flat',
      },
    ],
    neverMiss: true,
  },

  // ── Rare Stims ────────────────────────────────────────────────
  {
    id: 'item.precision_calibrator',
    name: 'Precision Calibrator',
    description: 'Next 2 attacks are guaranteed critical hits.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'buff',
        description: 'Next 2 attacks: guaranteed crit',
        magnitude: 100,
        magnitudeUnit: 'percent',
        durationSec: 20,
        stacks: 2,
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.cooldown_bypass',
    name: 'Cooldown Bypass',
    description: 'Reset all skill cooldowns to 0.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['utility'],
    effects: [
      {
        kind: 'utility',
        description: 'Reset all cooldowns',
        magnitude: 0,
        magnitudeUnit: 'flat',
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.full_restore',
    name: 'Full Restore Ampoule',
    description: 'Heal 50% HP, restore 50% MP, and cleanse all debuffs.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['heal', 'buff', 'cleanse'],
    effects: [
      {
        kind: 'heal',
        description: 'Heal 50% max HP',
        magnitude: 50,
        magnitudeUnit: 'max_hp_percent',
      },
      {
        kind: 'buff',
        description: 'Restore 50% MP',
        magnitude: 50,
        magnitudeUnit: 'mp_percent',
      },
      {
        kind: 'cleanse',
        description: 'Cleanse all debuffs',
        magnitude: 99,
        magnitudeUnit: 'flat',
      },
    ],
    neverMiss: true,
  },
  {
    id: 'item.phantom_drive',
    name: 'Phantom Drive',
    description: 'Gain Stealth and +30% damage for 2 turns.',
    ctCost: 0,
    cooldownSec: 0,
    resource: { type: 'none', cost: 0 },
    target: 'self',
    tags: ['buff'],
    effects: [
      {
        kind: 'buff',
        description: '+30% damage for 2 turns',
        magnitude: 30,
        magnitudeUnit: 'percent',
        durationSec: 12,
      },
      {
        kind: 'utility',
        description: 'Stealth for 2 turns',
        magnitude: 1,
        magnitudeUnit: 'flat',
        durationSec: 12,
      },
    ],
    neverMiss: true,
  },
];

/** Lookup map: item SkillId → Skill. */
export const ITEM_SKILL_BY_ID: ReadonlyMap<string, Skill> = new Map(
  ITEM_SKILLS.map((s) => [s.id, s]),
);
