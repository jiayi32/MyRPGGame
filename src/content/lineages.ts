import { UNSPECIFIED, type Lineage, type LineageId, type LineageUniqueMechanic } from './types';

export const LINEAGE_IDS = [
  'drakehorn_forge',
  'bull_cathedral',
  'twin_mirror',
  'tide_shell',
  'sunfang_court',
  'thorn_ledger',
  'balance_reins',
  'black_nest',
  'arrow_creed',
  'iron_covenant',
  'star_circuit',
  'dream_ocean',
] as const satisfies readonly LineageId[];

export type KnownLineageId = (typeof LINEAGE_IDS)[number];

const drakehornForge: Lineage = {
  id: 'drakehorn_forge',
  name: 'Drakehorn Forge',
  archetype: 'ignis',
  zodiac: 'dragon',
  themeTags: ['fire', 'burst', 'ramp', 'momentum'],
  adjacentLineageIds: ['tide_shell', 'thorn_ledger'],
  description:
    'Burst DPS lineage harnessing flames and explosive power. Sacrifices defense for damage ramp; HP-cost and overheat mechanics are common. CT profile leans medium to slow.',
  uniqueMechanic: {
    id: 'heat',
    name: 'Heat',
    shortDescription:
      'Drakehorn classes accumulate Heat from basics and DoTs, then spend it for amplified bursts, HP-cost refunds, and cooldown resets.',
    evolutionByTier: {
      1: 'Heat introduced as a ramp buff: consecutive casts boost the next skill; simple stack -> spend pattern.',
      2: 'Heat starts taxing resources: skills cost HP instead of MP, and Rage Fuel / Berserker\'s Pact refund HP on proc.',
      3: 'Heat becomes dual-system: buffs amplify AoE damage while multi-hit Dragon’s Breath refreshes cooldowns.',
      4: 'Heat converts to execution pressure: Executioner\'s Flame / Final Blaze punish low-HP targets and chain kills.',
      5: 'Heat masters tempo: End of Days resets every cooldown on multi-kill, ultimates loop via Phoenix Heart revival.',
    },
  },
  upgradeBonuses: [
    {
      rank: 1,
      effect: 'Fire damage mastery — flat bonus to fire-tagged damage output.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 2,
      effect: 'Burn duration extended on DoT effects applied by Drakehorn classes.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 3,
      effect: 'Heat-stack decay rate reduced, sustaining ramp mechanics longer.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 4,
      effect: 'HP-cost skills refund a portion of HP spent on hit.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 5,
      effect: 'Crit chance bonus when above a momentum threshold.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 6,
      effect: 'Basic attacks apply a small ignite stack.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'flat',
    },
    {
      rank: 7,
      effect: 'AoE fire skills gain additional radius.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 8,
      effect: 'Cooldown reduction on ultimate-tag skills.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 9,
      effect: 'Self-revive effects restore additional HP on proc.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
    {
      rank: 10,
      effect: 'Apex: fire-tagged damage ignores a portion of enemy fire resistance.',
      magnitude: UNSPECIFIED,
      magnitudeUnit: 'percent',
    },
  ],
};

const seededMechanic = (
  id: string,
  name: string,
  shortDescription: string,
  evolutionByTier: Record<1 | 2 | 3 | 4 | 5, string>,
): LineageUniqueMechanic => ({
  id,
  name,
  shortDescription,
  evolutionByTier,
});

const bullCathedralMechanic = seededMechanic(
  'guard_stacks',
  'Guard Stacks',
  'Taking hits builds Guard. Guard improves defense and scales retaliation / pillar finisher damage.',
  {
    1: 'Guard stacks introduced; taking hits builds Guard and slightly reduces incoming damage.',
    2: 'Guard starts scaling offense; heavy strikes deal bonus damage per Guard stack.',
    3: 'Guard shares to allies; shield effects propagate and CT costs drop while shielded.',
    4: 'Guard becomes control; taunts cannot be ignored and attackers lose CT progress.',
    5: 'Guard becomes law; once-per-battle unbreakable-shield window and ally shields scale from yours.',
  },
);

const twinMirrorMechanic = seededMechanic(
  'echo',
  'Echo',
  'The last active skill can echo at reduced power; decoys absorb hits and mirrored effects amplify outcomes.',
  {
    1: 'Echo introduced; decoy draws one hit and basic repeat-skill bonus comes online.',
    2: 'Echo amplifies; alternating skills gain bonus damage and copied skills cost less CT.',
    3: 'Echo shares effects; buffs/debuffs can mirror between targets and ally skills can be repeated.',
    4: 'Echo predicts; copied skills cannot miss and enemy effects can be redirected.',
    5: 'Echo dominates; once-per-battle window where every skill duplicates.',
  },
);

const tideShellMechanic = seededMechanic(
  'flow_stacks',
  'Flow Stacks',
  'Successful evasions and shield rebounds feed Flow, enabling CT refunds, damage bonuses, and counter-windows.',
  {
    1: 'Flow introduced; dodging refunds CT and first shield each battle is cheaper.',
    2: 'Flow accelerates; post-dodge attacks gain speed and damage, movement empowers next skill.',
    3: 'Flow protects allies; part of allied incoming damage is absorbed and partially reflected.',
    4: 'Flow becomes pressure; hits steal enemy CT and shield breaks create splash pressure.',
    5: 'Flow masters tempo; broad reposition tools and emergency full-recovery shield triggers unlock.',
  },
);

const sunfangCourtMechanic = seededMechanic(
  'pride_stacks',
  'Pride Stacks',
  'Attacking while buffed builds Pride; marked or blinded targets feed crit windows and execute pressure.',
  {
    1: 'Pride introduced; attacking builds Pride and low-HP conditions raise crit chance.',
    2: 'Pride marks targets; marked enemies take extra damage and buffs empower attacks.',
    3: 'Pride supports team tempo; solar buffs share and blinded targets feed CT refunds.',
    4: 'Pride dominates exchanges; mixed ally-buff and enemy-debuff casts open team kill windows.',
    5: 'Pride masters authority; enemy buffs can invert into debuffs and parade windows protect allies.',
  },
);

const thornLedgerMechanic = seededMechanic(
  'marks',
  'Marks',
  'Damage scales with debuff density on the target; execute windows open when debuff thresholds are crossed.',
  {
    1: 'Marks introduced; bleed stacks and marked targets take bonus damage.',
    2: 'Marks amplify with poison; healing reduction and poison-count scaling come online.',
    3: 'Marks spread and stick; execute thresholds appear and cleansing resistance improves.',
    4: 'Marks punish control states; debuffed enemies become easier to finish and thorn fields pressure movement.',
    5: 'Marks become doctrine; branded targets feed CT and first debuff-kill sustain spikes unlock.',
  },
);

const balanceReinsMechanic = seededMechanic(
  'symmetry',
  'Symmetry',
  'Bonuses trigger when party stats, buffs, or HP are balanced; paired actions scale harder than isolated actions.',
  {
    1: 'Symmetry introduced; balanced offense/defense pairings create baseline stat gains.',
    2: 'Symmetry amplifies alternating cadence; acting after allies empowers follow-up skills.',
    3: 'Symmetry equalizes party tempo; ally speed normalization and weaker-ally buff amplification.',
    4: 'Symmetry protects through accordance; strongest ally buff can be copied and healing scales with HP evenness.',
    5: 'Symmetry enforces law; once-per-battle action-cost discount window for balanced parties.',
  },
);

const blackNestMechanic = seededMechanic(
  'stealth_bleed',
  'Stealth + Bleed Execute',
  'Opening from stealth hits harder, bleed pressure spreads across targets, and low-HP enemies feed execute windows.',
  {
    1: 'Stealth introduced; first stealth hit deals bonus damage and basics apply bleed.',
    2: 'Bleed pressure amplifies; stacked bleeds and kill-trigger sustain loops unlock.',
    3: 'Marks and execute windows come online; marked kills refund CT and dodges boost damage.',
    4: 'Decay pressure expands; healing reduction plus burst reaping on debuffed targets.',
    5: 'Stealth masters tempo; once-per-battle fast-cast shadow window and darkness-zone field pressure.',
  },
);

const arrowCreedMechanic = seededMechanic(
  'mark_range',
  'Mark + Range Discipline',
  'Damage scales from mark density, distance discipline, and stillness between shots; multi-mark windows feed execute.',
  {
    1: 'Marks introduced; accuracy rises against marked targets and first battle mark is automatic.',
    2: 'Oath marks amplify crit windows; stillness between actions boosts ranged damage.',
    3: 'Range scaling deepens; sustained distance and chained ranged hits increase throughput.',
    4: 'Ally guard interactions unlock; projectile interception and support shots improve team survivability.',
    5: 'Range masters judgment; once-per-battle defense-layer bypass shot becomes available.',
  },
);

const ironCovenantMechanic = seededMechanic(
  'hp_cost_corruption',
  'HP-Cost Corruption',
  'Sacrifice HP or accept debuffs for amplified effects; corrupted states fuel offensive spikes.',
  {
    1: 'HP-cost introduced; player can pay HP to empower self/ally effects.',
    2: 'Corruption amplifies defenses; healing conversion and survival contracts improve uptime.',
    3: 'Corruption feeds offense; debuffs can grant mitigation and amplify contract damage patterns.',
    4: 'Devil\'s bargain windows unlock; accept debuff for offensive spike and low-HP gear amplification.',
    5: 'Corruption mastery capstone; once-per-battle defense-ignore sequence and kill-based damage-ceiling growth.',
  },
);

const starCircuitMechanic = seededMechanic(
  'voltage_patterns',
  'Voltage / Pattern Stacks',
  'Specific skill sequences generate Voltage, enabling CT discounts, accuracy bonuses, and scaling pattern payoffs.',
  {
    1: 'Voltage introduced; repeated patterns build charge and first buff each battle is stronger.',
    2: 'Voltage amplifies precision flow; stored charge empowers the next skill cast.',
    3: 'Voltage syncs team cadence; ally CT discounts and ordered-skill efficiency gains.',
    4: 'Voltage destabilizes enemies; adaptive mirroring and overclock speed windows at CT cost.',
    5: 'Voltage masters timeline design; one skill can ignore CT penalty during capstone window.',
  },
);

const dreamOceanMechanic = seededMechanic(
  'calm_overflow',
  'Calm / Overflow-to-Shield',
  'Overhealing converts to shields while lull effects suppress enemy CT gain and stabilize reactive support play.',
  {
    1: 'Calm introduced; lull reduces enemy damage and support skills add small shields.',
    2: 'Overflow activates; overheal converts to shields and sleeping targets take bonus damage.',
    3: 'Calm shapes the field; mist barriers reduce incoming damage and shields improve recovery.',
    4: 'Prediction layer unlocks; enemy CT visibility and low-HP ally healing amplification.',
    5: 'Calm masters ocean tempo; once-per-battle reduced CT-cost window for support actions.',
  },
);

const stubLineage = (
  id: LineageId,
  name: string,
  archetype: Lineage['archetype'],
  zodiac: Lineage['zodiac'],
  themeTags: string[],
  adjacentLineageIds: LineageId[],
  description: string,
  uniqueMechanic: Lineage['uniqueMechanic'] = UNSPECIFIED,
): Lineage => ({
  id,
  name,
  archetype,
  zodiac,
  themeTags,
  adjacentLineageIds,
  description,
  upgradeBonuses: UNSPECIFIED,
  uniqueMechanic,
});

export const LINEAGES: readonly Lineage[] = [
  drakehornForge,
  stubLineage(
    'bull_cathedral',
    'Bull Cathedral',
    'aegis',
    'ox',
    ['defense', 'sanctuary', 'retaliation'],
    ['iron_covenant', 'arrow_creed'],
    'Defense-first lineage built on sanctuary, retaliation, and immovable presence.',
    bullCathedralMechanic,
  ),
  stubLineage(
    'twin_mirror',
    'Twin Mirror',
    'arcana',
    'monkey',
    ['duplication', 'misdirection', 'adaptive'],
    ['balance_reins', 'star_circuit', 'black_nest'],
    'Adaptive spellcasters leveraging duplication and misdirection; hub of the adjacency graph with Black Nest branching from it.',
    twinMirrorMechanic,
  ),
  stubLineage(
    'tide_shell',
    'Tide Shell',
    'rift',
    'rabbit',
    ['evasion', 'phase', 'ct-skip'],
    ['star_circuit', 'drakehorn_forge'],
    'Moonlit evasion lineage: phase drift, CT-skipping, unpredictable positioning.',
    tideShellMechanic,
  ),
  stubLineage(
    'sunfang_court',
    'Sunfang Court',
    'solaris',
    'rooster',
    ['radiance', 'royal', 'crit'],
    ['balance_reins', 'arrow_creed'],
    'Radiant royal-burst lineage. Precision crits, commanding presence, front-line burst.',
    sunfangCourtMechanic,
  ),
  stubLineage(
    'thorn_ledger',
    'Thorn Ledger',
    'nox',
    'snake',
    ['precision', 'dot', 'venom'],
    ['drakehorn_forge', 'dream_ocean'],
    'Precision / DoT / venom-stacking lineage. Inevitability through accumulation.',
    thornLedgerMechanic,
  ),
  stubLineage(
    'balance_reins',
    'Balance Reins',
    'seraph',
    'goat',
    ['support', 'symmetry', 'equalization'],
    ['sunfang_court', 'twin_mirror'],
    'Control-via-symmetry support lineage. Equalization and team sustain.',
    balanceReinsMechanic,
  ),
  stubLineage(
    'black_nest',
    'Black Nest',
    'umbra',
    'rat',
    ['stealth', 'death', 'ct-theft'],
    ['twin_mirror'],
    'Stealth, death, and CT theft. Branches from Twin Mirror in the adjacency graph.',
    blackNestMechanic,
  ),
  stubLineage(
    'arrow_creed',
    'Arrow Creed',
    'tempest',
    'horse',
    ['discipline', 'long-range', 'momentum'],
    ['bull_cathedral', 'sunfang_court'],
    'Discipline, long-range precision, momentum-based damage.',
    arrowCreedMechanic,
  ),
  stubLineage(
    'iron_covenant',
    'Iron Covenant',
    'terra',
    'pig',
    ['oath', 'endurance', 'heavy'],
    ['dream_ocean', 'bull_cathedral'],
    'Oath-bound endurance lineage. Heavy power and steady sustain.',
    ironCovenantMechanic,
  ),
  stubLineage(
    'star_circuit',
    'Star Circuit',
    'chrono',
    'tiger',
    ['ct-manipulation', 'resource-cycling'],
    ['twin_mirror', 'tide_shell'],
    'CT manipulation and resource cycling lineage. Alters the combat tempo itself.',
    starCircuitMechanic,
  ),
  stubLineage(
    'dream_ocean',
    'Dream Ocean',
    'spirit',
    'dog',
    ['moon', 'illusion', 'heal', 'summon', 'reactive'],
    ['thorn_ledger', 'iron_covenant'],
    'Moonlit illusion, healing, and spirit-summon lineage. Reactive rather than proactive.',
    dreamOceanMechanic,
  ),
];

export const LINEAGE_BY_ID: ReadonlyMap<LineageId, Lineage> = new Map(
  LINEAGES.map((l) => [l.id, l]),
);
