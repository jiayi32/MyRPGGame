import type { AugmentDef, AugmentTier, AugmentCategory, AugmentId } from './types';

// ---------------------------------------------------------------------------
// Catalog — 36 augments (9 per tier × 4 tiers)
// See documentation/New/GAMEPLAY_LOOP.md P4.5 for the design document.
// ---------------------------------------------------------------------------

export const AUGMENTS: readonly AugmentDef[] = [
  // ===== BRONZE (9) =====
  // -- Neutral --
  {
    id: 'augment.bronze.lucky_find',
    name: 'Lucky Find',
    description: 'Rare gear drops are twice as likely for the rest of this run.',
    effectLabel: '2× rare gear drop rate',
    category: 'neutral',
    tier: 'bronze',
  },
  {
    id: 'augment.bronze.well_connected',
    name: 'Well Connected',
    description: 'Merchant rooms appear twice as often on the Run Map.',
    effectLabel: 'Merchant rooms 2× more frequent',
    category: 'neutral',
    tier: 'bronze',
  },
  {
    id: 'augment.bronze.scavenger',
    name: 'Scavenger',
    description: 'Elite room rewards include one bonus gear drop.',
    effectLabel: '+1 bonus gear from elite rooms',
    category: 'neutral',
    tier: 'bronze',
  },
  // -- Positive --
  {
    id: 'augment.bronze.hardy',
    name: 'Hardy',
    description: 'Slightly increase max HP for the rest of this run.',
    effectLabel: '+8% max HP',
    category: 'positive',
    tier: 'bronze',
  },
  {
    id: 'augment.bronze.swift',
    name: 'Swift',
    description: 'Slightly faster combat tempo.',
    effectLabel: '+5% CT speed',
    category: 'positive',
    tier: 'bronze',
  },
  {
    id: 'augment.bronze.focused',
    name: 'Focused',
    description: 'Improved critical hit consistency.',
    effectLabel: '+8% crit chance',
    category: 'positive',
    tier: 'bronze',
  },
  // -- Sacrificial --
  {
    id: 'augment.bronze.glass_cannon',
    name: 'Glass Cannon',
    description: 'Deal more damage but become more fragile.',
    effectLabel: '+20% damage dealt / −15% max HP',
    category: 'sacrificial',
    tier: 'bronze',
  },
  {
    id: 'augment.bronze.last_stand',
    name: 'Last Stand',
    description: 'Cheat death once per battle — but lose a gear slot.',
    effectLabel: 'Revive at 1 HP once per battle / −1 gear slot',
    category: 'sacrificial',
    tier: 'bronze',
  },
  {
    id: 'augment.bronze.berserkers_gambit',
    name: "Berserker's Gambit",
    description: 'Harder critical hits at the cost of resistances.',
    effectLabel: '+15% crit damage / −10% all resistances',
    category: 'sacrificial',
    tier: 'bronze',
  },

  // ===== SILVER (9) =====
  // -- Neutral --
  {
    id: 'augment.silver.master_trader',
    name: 'Master Trader',
    description: 'Shops stock more items at better prices.',
    effectLabel: 'Shops +2 items, prices −20%',
    category: 'neutral',
    tier: 'silver',
  },
  {
    id: 'augment.silver.treasure_map',
    name: 'Treasure Map',
    description: 'Treasure rooms always appear on the map when routing allows.',
    effectLabel: 'Treasure rooms guaranteed when possible',
    category: 'neutral',
    tier: 'silver',
  },
  {
    id: 'augment.silver.recycler',
    name: 'Recycler',
    description: 'Sell unwanted gear for half its purchase price at any rest node.',
    effectLabel: 'Sell gear for 50% of purchase price',
    category: 'neutral',
    tier: 'silver',
  },
  // -- Positive --
  {
    id: 'augment.silver.fortified',
    name: 'Fortified',
    description: 'Sturdier and better defended.',
    effectLabel: '+15% max HP, +10% defense',
    category: 'positive',
    tier: 'silver',
  },
  {
    id: 'augment.silver.accelerated',
    name: 'Accelerated',
    description: 'Significantly faster combat tempo and quicker basic attacks.',
    effectLabel: '+10% CT speed, −5 CT on basic attacks',
    category: 'positive',
    tier: 'silver',
  },
  {
    id: 'augment.silver.lifestealer',
    name: 'Lifestealer',
    description: 'Recover a portion of all damage dealt.',
    effectLabel: '5% lifesteal on all damage',
    category: 'positive',
    tier: 'silver',
  },
  // -- Sacrificial --
  {
    id: 'augment.silver.blood_magic',
    name: 'Blood Magic',
    description: 'Cast from your life force instead of mana — but healing is less effective.',
    effectLabel: 'Skills cost HP instead of MP, +25% spell damage / −20% healing received',
    category: 'sacrificial',
    tier: 'silver',
  },
  {
    id: 'augment.silver.unstable_power',
    name: 'Unstable Power',
    description: 'Overwhelming power that fades quickly.',
    effectLabel: '+30% damage for first 3 turns / −10% damage after turn 3',
    category: 'sacrificial',
    tier: 'silver',
  },
  {
    id: 'augment.silver.cursed_athame',
    name: 'Cursed Athame',
    description: 'Uncanny critical precision at a heavy cost.',
    effectLabel: '+25% crit chance / −15% max HP, −10% defense',
    category: 'sacrificial',
    tier: 'silver',
  },

  // ===== GOLD (9) =====
  // -- Neutral --
  {
    id: 'augment.gold.dragons_hoard',
    name: "Dragon's Hoard",
    description: 'All gold rewards are doubled.',
    effectLabel: 'All gold rewards ×2',
    category: 'neutral',
    tier: 'gold',
  },
  {
    id: 'augment.gold.vault_master',
    name: 'Vault Master',
    description: 'Your vault multiplier starts higher.',
    effectLabel: 'Vault multiplier starts at 1.5× instead of 1.0×',
    category: 'neutral',
    tier: 'gold',
  },
  {
    id: 'augment.gold.forgemaster',
    name: 'Forgemaster',
    description: 'Free gear upgrade available at every rest node.',
    effectLabel: 'Free gear upgrade at every rest node',
    category: 'neutral',
    tier: 'gold',
  },
  // -- Positive --
  {
    id: 'augment.gold.ascendant',
    name: 'Ascendant',
    description: 'All attributes significantly increased.',
    effectLabel: '+20% all stats',
    category: 'positive',
    tier: 'gold',
  },
  {
    id: 'augment.gold.dual_wielder',
    name: 'Dual Wielder',
    description: 'Gain an extra gear slot and deal more damage.',
    effectLabel: '+1 gear slot, +10% damage',
    category: 'positive',
    tier: 'gold',
  },
  {
    id: 'augment.gold.untouchable',
    name: 'Untouchable',
    description: 'A chance to completely avoid incoming attacks.',
    effectLabel: '+15% dodge chance (10% chance to fully avoid damage)',
    category: 'positive',
    tier: 'gold',
  },
  // -- Sacrificial --
  {
    id: 'augment.gold.soul_bond',
    name: 'Soul Bond',
    description: 'Your synergy bonuses are doubled — but you carry fewer items.',
    effectLabel: 'Double all synergy bonuses / −2 gear slots',
    category: 'sacrificial',
    tier: 'gold',
  },
  {
    id: 'augment.gold.phoenix_pact',
    name: 'Phoenix Pact',
    description: 'Rise from defeat once per battle — at a permanent cost.',
    effectLabel: 'Revive at 50% HP on first death / −25% max HP',
    category: 'sacrificial',
    tier: 'gold',
  },
  {
    id: 'augment.gold.overload',
    name: 'Overload',
    description: 'Devastating power surge followed by burnout.',
    effectLabel: '+40% damage for 5 turns, then stunned for 2 turns / after buff: CT cost ×2 for 10s',
    category: 'sacrificial',
    tier: 'gold',
  },

  // ===== PRISMATIC (9) =====
  // -- Neutral --
  {
    id: 'augment.prismatic.fortunes_favorite',
    name: "Fortune's Favorite",
    description: 'Every room reward is doubled.',
    effectLabel: 'All room rewards doubled',
    category: 'neutral',
    tier: 'prismatic',
  },
  {
    id: 'augment.prismatic.infinite_pockets',
    name: 'Infinite Pockets',
    description: 'No limit on equipped gear slots.',
    effectLabel: 'No gear slot limit',
    category: 'neutral',
    tier: 'prismatic',
  },
  {
    id: 'augment.prismatic.fate_weaver',
    name: 'Fate Weaver',
    description: 'One free re-roll on any future augment or passive draft.',
    effectLabel: 'Re-roll one augment or passive choice per draft (one-time)',
    category: 'neutral',
    tier: 'prismatic',
  },
  // -- Positive --
  {
    id: 'augment.prismatic.godlike',
    name: 'Godlike',
    description: 'Transcendent power across all attributes.',
    effectLabel: '+30% all stats, +15% CT speed',
    category: 'positive',
    tier: 'prismatic',
  },
  {
    id: 'augment.prismatic.second_wind',
    name: 'Second Wind',
    description: 'Full recovery at the brink of death once per battle.',
    effectLabel: 'Full heal + cleanse all debuffs at 0 HP once per battle',
    category: 'positive',
    tier: 'prismatic',
  },
  {
    id: 'augment.prismatic.perfect_form',
    name: 'Perfect Form',
    description: 'All passive effects are doubled in strength.',
    effectLabel: 'All passives have double effect',
    category: 'positive',
    tier: 'prismatic',
  },
  // -- Sacrificial --
  {
    id: 'augment.prismatic.double_edged',
    name: 'Double-Edged',
    description: 'Everything hits twice as hard — including you.',
    effectLabel: 'All damage ×2 dealt AND received',
    category: 'sacrificial',
    tier: 'prismatic',
  },
  {
    id: 'augment.prismatic.forbidden_knowledge',
    name: 'Forbidden Knowledge',
    description: 'More choices at future drafts — at immense personal cost.',
    effectLabel: '+1 draft pick at every future draft / −30% max HP, −20% all stats',
    category: 'sacrificial',
    tier: 'prismatic',
  },
  {
    id: 'augment.prismatic.apocalypse_engine',
    name: 'Apocalypse Engine',
    description: 'The world burns — but so do you.',
    effectLabel: 'All enemies start at 50% HP (bosses 75%) / You start each battle at 50% HP',
    category: 'sacrificial',
    tier: 'prismatic',
  },
];

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------

export const AUGMENT_BY_ID: ReadonlyMap<AugmentId, AugmentDef> = new Map(
  AUGMENTS.map((a) => [a.id, a]),
);

const TIER_ORDER: readonly AugmentTier[] = ['bronze', 'silver', 'gold', 'prismatic'];

export const AUGMENTS_BY_TIER: Record<AugmentTier, readonly AugmentDef[]> = {
  bronze: AUGMENTS.filter((a) => a.tier === 'bronze'),
  silver: AUGMENTS.filter((a) => a.tier === 'silver'),
  gold: AUGMENTS.filter((a) => a.tier === 'gold'),
  prismatic: AUGMENTS.filter((a) => a.tier === 'prismatic'),
};

export const AUGMENTS_BY_TIER_AND_CATEGORY: Record<
  AugmentTier,
  Record<AugmentCategory, readonly AugmentDef[]>
> = {
  bronze: {
    neutral: AUGMENTS.filter((a) => a.tier === 'bronze' && a.category === 'neutral'),
    positive: AUGMENTS.filter((a) => a.tier === 'bronze' && a.category === 'positive'),
    sacrificial: AUGMENTS.filter((a) => a.tier === 'bronze' && a.category === 'sacrificial'),
  },
  silver: {
    neutral: AUGMENTS.filter((a) => a.tier === 'silver' && a.category === 'neutral'),
    positive: AUGMENTS.filter((a) => a.tier === 'silver' && a.category === 'positive'),
    sacrificial: AUGMENTS.filter((a) => a.tier === 'silver' && a.category === 'sacrificial'),
  },
  gold: {
    neutral: AUGMENTS.filter((a) => a.tier === 'gold' && a.category === 'neutral'),
    positive: AUGMENTS.filter((a) => a.tier === 'gold' && a.category === 'positive'),
    sacrificial: AUGMENTS.filter((a) => a.tier === 'gold' && a.category === 'sacrificial'),
  },
  prismatic: {
    neutral: AUGMENTS.filter((a) => a.tier === 'prismatic' && a.category === 'neutral'),
    positive: AUGMENTS.filter((a) => a.tier === 'prismatic' && a.category === 'positive'),
    sacrificial: AUGMENTS.filter((a) => a.tier === 'prismatic' && a.category === 'sacrificial'),
  },
};

// ---------------------------------------------------------------------------
// Tier unlock logic
// ---------------------------------------------------------------------------

/** Total augment picks across all runs needed to unlock each tier. */
export const AUGMENT_TIER_UNLOCK_THRESHOLDS: Record<AugmentTier, number> = {
  bronze: 0,
  silver: 6,
  gold: 18,
  prismatic: 36,
};

/** Returns tiers unlocked for a given total augment pick count. */
export const getUnlockedTiers = (augmentsPicked: number): AugmentTier[] =>
  TIER_ORDER.filter((tier) => augmentsPicked >= AUGMENT_TIER_UNLOCK_THRESHOLDS[tier]);

/** Stage-weighted probability table for tier selection. Returns unnormalized weights. */
export const getTierWeightsForStage = (
  stage: number,
): Record<AugmentTier, number> => {
  // Stage bands: 1-12 → bronze-heavy, 8-20 → silver-introduced, 16-28 → gold, 24-30 → prismatic
  const bronzeWt = stage <= 8 ? 70 : stage <= 16 ? 30 : stage <= 24 ? 10 : 5;
  const silverWt = stage <= 8 ? 20 : stage <= 16 ? 50 : stage <= 24 ? 30 : 15;
  const goldWt = stage <= 12 ? 5 : stage <= 20 ? 30 : stage <= 28 ? 40 : 30;
  const prismaticWt = stage <= 16 ? 0 : stage <= 24 ? 15 : stage <= 28 ? 30 : 50;
  return {
    bronze: bronzeWt,
    silver: silverWt,
    gold: goldWt,
    prismatic: prismaticWt,
  };
};
