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
  baseStats: UNSPECIFIED,
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
  tradeoffs: UNSPECIFIED,
  upgradeLevels: UNSPECIFIED,
  description: 'Scaling dominance through relentless consecutive hits.',
};

const moltenSovereignPlate: GearItem = {
  id: 'drakehorn_forge.molten_sovereign_plate',
  name: 'Molten Sovereign Plate',
  slot: 'armor',
  tier: 5,
  lineageId: 'drakehorn_forge',
  rarity: 'mythic',
  baseStats: UNSPECIFIED,
  multStats: UNSPECIFIED,
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
  upgradeLevels: UNSPECIFIED,
  description: 'Momentum-stacking plate that trades defense for runaway damage.',
};

const ashfireSigil: GearItem = {
  id: 'drakehorn_forge.ashfire_sigil',
  name: 'Ashfire Sigil',
  slot: 'accessory',
  tier: 5,
  lineageId: 'drakehorn_forge',
  rarity: 'mythic',
  baseStats: UNSPECIFIED,
  multStats: UNSPECIFIED,
  passives: [
    {
      category: 'rule_breaker',
      effect: 'Dragon set rule-breaker passive (design TBD).',
      magnitude: UNSPECIFIED,
    },
  ],
  triggers: [],
  tradeoffs: UNSPECIFIED,
  upgradeLevels: UNSPECIFIED,
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
