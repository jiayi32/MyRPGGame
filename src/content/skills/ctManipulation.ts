import type { Skill } from '../types';

/**
 * Neutral CT-manipulation abilities — draftable by any corporation.
 * These skills interact with the CT timeline, the game's unique mechanic.
 */
export const CT_MANIPULATION_SKILLS: readonly Skill[] = [
  {
    id: 'skill.ct_overclock',
    name: 'CT Overclock',
    description: 'Voluntarily delay your next turn by +25 CT for +40% damage on this attack.',
    ctCost: 25,
    cooldownSec: 8,
    resource: { type: 'none', cost: 0 },
    target: 'single',
    tags: ['burst', 'ct_manipulation', 'self-damage'],
    effects: [
      {
        kind: 'damage',
        description: 'Overclocked strike.',
        magnitude: 3.0,
        damageType: 'physical',
      },
    ],
  },
  {
    id: 'skill.ct_theft',
    name: 'Chrono Siphon',
    description: 'Deal damage AND steal 15 CT from the target, accelerating your next action.',
    ctCost: 30,
    cooldownSec: 12,
    resource: { type: 'MP', cost: 20 },
    target: 'single',
    tags: ['ct_manipulation', 'control'],
    effects: [
      {
        kind: 'damage',
        description: 'Chrono-laced strike.',
        magnitude: 1.8,
        damageType: 'arcane',
      },
      {
        kind: 'ct_shift',
        description: 'Steal 15 CT from target.',
        magnitude: 15,
        magnitudeUnit: 'flat',
      },
    ],
  },
  {
    id: 'skill.ct_freeze',
    name: 'Temporal Lock',
    description: 'Freeze the target in time — skip their next CT tick entirely.',
    ctCost: 45,
    cooldownSec: 18,
    resource: { type: 'MP', cost: 28 },
    target: 'single',
    tags: ['ct_manipulation', 'control'],
    effects: [
      {
        kind: 'ct_shift',
        description: 'Push target +40 CT (skip a turn).',
        magnitude: 40,
        magnitudeUnit: 'flat',
      },
    ],
  },
  {
    id: 'skill.ct_haste',
    name: 'Temporal Acceleration',
    description: 'Accelerate your own timeline. Gain −20 CT on your next action.',
    ctCost: 15,
    cooldownSec: 10,
    resource: { type: 'MP', cost: 15 },
    target: 'self',
    tags: ['ct_manipulation', 'buff'],
    effects: [
      {
        kind: 'ct_shift',
        description: 'Reduce own CT by 20.',
        magnitude: -20,
        magnitudeUnit: 'flat',
      },
      {
        kind: 'buff',
        description: '+15% CT speed for 8s.',
        magnitude: 15,
        magnitudeUnit: 'percent',
        durationSec: 8,
        statTag: 'ct_speed',
      },
    ],
  },
  {
    id: 'skill.ct_rewind',
    name: 'System Restore',
    description: 'Rewind your CT to 0 — act again immediately. High cooldown.',
    ctCost: 0,
    cooldownSec: 30,
    resource: { type: 'MP', cost: 35 },
    target: 'self',
    tags: ['ct_manipulation', 'ultimate'],
    effects: [
      {
        kind: 'ct_shift',
        description: 'Reset CT to 0.',
        magnitude: -999,
        magnitudeUnit: 'flat',
      },
    ],
  },
];
