import {
  UNSPECIFIED,
  type GearId,
  type GearItem,
  type GearRole,
  type GearSlot,
  type GearTemplate,
  type GearTier,
} from './types';

const worldbreakerFang: GearItem = {
  id: 'drakehorn_forge.worldbreaker_fang',
  name: 'Worldbreaker Fang',
  slot: 'weapon',
  tier: 5,
  lineageId: 'drakehorn_forge',
  rarity: 'mythic',
  baseStats: { strength: 18, intellect: 8, constitution: 12, dexterity: 10 },
  multStats: { strength: 1.25 },
  passives: [
    {
      category: 'momentum',
      effect: 'Damage increases per consecutive hit (stacks up to 10).',
      magnitude: 0.05,
      magnitudeUnit: 'percent',
    },
  ],
  triggers: [],
  tradeoffs: { constitution: -0.05 },
  upgradeLevels: [
    { level: 0, cost: 0, addStats: {}, addMults: {} },
    { level: 1, cost: 100, addStats: { strength: 2 }, addMults: { strength: 0.05 } },
    { level: 2, cost: 250, addStats: { strength: 4 }, addMults: { strength: 0.10 } },
  ],
  description: 'Scaling dominance through relentless consecutive hits.',
};

const moltenSovereignPlate: GearItem = {
  id: 'drakehorn_forge.molten_sovereign_plate',
  name: 'Molten Sovereign Plate',
  slot: 'armor',
  tier: 5,
  lineageId: 'drakehorn_forge',
  rarity: 'mythic',
  baseStats: { strength: 12, intellect: 6, constitution: 16, dexterity: 8 },
  multStats: { constitution: 1.2, dexterity: 0.95 },
  passives: [
    {
      category: 'bias',
      effect: 'Offensive bias up, defensive bias down.',
      magnitude: 0.15,
      magnitudeUnit: 'percent',
    },
    {
      category: 'heat_stack',
      effect: 'On hit: gain Heat stack. Each stack grants bonus damage; decays slowly.',
      magnitude: 0.02,
      magnitudeUnit: 'percent',
    },
  ],
  triggers: [],
  tradeoffs: { defensive_bias: -0.1 },
  upgradeLevels: [
    { level: 0, cost: 0, addStats: {}, addMults: {} },
    { level: 1, cost: 100, addStats: { constitution: 2 }, addMults: {} },
    { level: 2, cost: 250, addStats: { constitution: 4 }, addMults: { constitution: 0.08 } },
  ],
  description: 'Momentum-stacking plate that trades defense for runaway damage.',
};

const ashfireSigil: GearItem = {
  id: 'drakehorn_forge.ashfire_sigil',
  name: 'Ashfire Sigil',
  slot: 'accessory',
  tier: 5,
  lineageId: 'drakehorn_forge',
  rarity: 'mythic',
  baseStats: { intellect: 12, dexterity: 10, constitution: 8, strength: 6 },
  multStats: { intellect: 1.15 },
  passives: [
    {
      category: 'rule_breaker',
      effect: 'When final active skill kills, +50% damage to next skill for 8s.',
      magnitude: 0.5,
    },
  ],
  triggers: [],
  tradeoffs: { strength: -0.08 },
  upgradeLevels: [
    { level: 0, cost: 0, addStats: {}, addMults: {} },
    { level: 1, cost: 100, addStats: { intellect: 2 }, addMults: {} },
    { level: 2, cost: 250, addStats: { intellect: 4 }, addMults: { intellect: 0.08 } },
  ],
  description:
    'Accessory slot completing the Dragon set; rule-breaker passive pending balance pass.',
};

export const DRAGON_T5_SET: readonly GearItem[] = [
  worldbreakerFang,
  moltenSovereignPlate,
  ashfireSigil,
];

const ROLES: readonly GearRole[] = ['tank', 'dps', 'support', 'hybrid', 'control'];
const SLOTS: readonly GearSlot[] = ['weapon', 'armor', 'accessory'];
const T1_4_TIERS: readonly Exclude<GearTier, 5>[] = [1, 2, 3, 4];

function makeTemplate(role: GearRole, tier: Exclude<GearTier, 5>, slot: GearSlot): GearTemplate {
  return {
    id: `${role}.t${tier}.${slot}`,
    tier,
    role,
    slot,
    description: `Procedural template: ${role} ${slot} at tier ${tier}.`,
    baseStatsHint: UNSPECIFIED,
    passives: [],
    triggers: [],
  };
}

export const GEAR_TEMPLATES: readonly GearTemplate[] = ROLES.flatMap((role) =>
  T1_4_TIERS.flatMap((tier) => SLOTS.map((slot) => makeTemplate(role, tier, slot))),
);

export const GEAR_ITEMS: readonly GearItem[] = [...DRAGON_T5_SET];

export const GEAR_BY_ID: ReadonlyMap<GearId, GearItem> = new Map(GEAR_ITEMS.map((g) => [g.id, g]));
