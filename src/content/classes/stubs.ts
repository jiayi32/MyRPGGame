import { UNSPECIFIED, type ClassData, type ClassTier, type LineageId } from '../types';

type StubTuple = readonly [tier: ClassTier, idSuffix: string, displayName: string];

const LINEAGE_CLASS_TABLE: readonly (readonly [LineageId, readonly StubTuple[]])[] = [
  [
    'bull_cathedral',
    [
      [5, 'shield_initiate', 'Shield Initiate'],
      [4, 'bastion_guard', 'Bastion Guard'],
      [3, 'fortress_knight', 'Fortress Knight'],
      [2, 'iron_warder', 'Iron Warder'],
      [1, 'immutable_wall', 'Immutable Wall'],
    ],
  ],
  [
    'twin_mirror',
    [
      [5, 'arcane_initiate', 'Arcane Initiate'],
      [4, 'spellbinder', 'Spellbinder'],
      [3, 'chaos_mage', 'Chaos Mage'],
      [2, 'reality_weaver', 'Reality Weaver'],
      [1, 'probability_architect', 'Probability Architect'],
    ],
  ],
  [
    'tide_shell',
    [
      [5, 'rift_initiate', 'Rift Initiate'],
      [4, 'blink_assassin', 'Blink Assassin'],
      [3, 'phase_walker', 'Phase Walker'],
      [2, 'dimensional_hunter', 'Dimensional Hunter'],
      [1, 'singularity_fracture', 'Singularity Fracture'],
    ],
  ],
  [
    'sunfang_court',
    [
      [5, 'aspirant_radiant', 'Aspirant Radiant'],
      [4, 'dawnblade_initiate', 'Dawnblade Initiate'],
      [3, 'solarian_vanguard', 'Solarian Vanguard'],
      [2, 'lumen_judge', 'Lumen Judge'],
      [1, 'helios_arbiter', 'Helios Arbiter'],
    ],
  ],
  [
    'thorn_ledger',
    [
      [5, 'venom_initiate', 'Venom Initiate'],
      [4, 'plague_hunter', 'Plague Hunter'],
      [3, 'rot_alchemist', 'Rot Alchemist'],
      [2, 'blight_tyrant', 'Blight Tyrant'],
      [1, 'death_bloom_entity', 'Death Bloom Entity'],
    ],
  ],
  [
    'balance_reins',
    [
      [5, 'grace_initiate', 'Grace Initiate'],
      [4, 'light_herald', 'Light Herald'],
      [3, 'sanctum_protector', 'Sanctum Protector'],
      [2, 'divine_ascendant', 'Divine Ascendant'],
      [1, 'judgment_vessel', 'Judgment Vessel'],
    ],
  ],
  [
    'black_nest',
    [
      [5, 'shade_initiate', 'Shade Initiate'],
      [4, 'nightblade', 'Nightblade'],
      [3, 'eclipse_stalker', 'Eclipse Stalker'],
      [2, 'void_reaver', 'Void Reaver'],
      [1, 'abyss_sovereign', 'Abyss Sovereign'],
    ],
  ],
  [
    'arrow_creed',
    [
      [5, 'gale_initiate', 'Gale Initiate'],
      [4, 'wind_striker', 'Wind Striker'],
      [3, 'storm_runner', 'Storm Runner'],
      [2, 'cyclone_duelist', 'Cyclone Duelist'],
      [1, 'skyfracture_herald', 'Skyfracture Herald'],
    ],
  ],
  [
    'iron_covenant',
    [
      [5, 'stone_initiate', 'Stone Initiate'],
      [4, 'earthbreaker', 'Earthbreaker'],
      [3, 'mountain_sentinel', 'Mountain Sentinel'],
      [2, 'world_anchor', 'World Anchor'],
      [1, 'titan_core', 'Titan Core'],
    ],
  ],
  [
    'star_circuit',
    [
      [5, 'time_initiate', 'Time Initiate'],
      [4, 'temporal_slicer', 'Temporal Slicer'],
      [3, 'ct_strategist', 'CT Strategist'],
      [2, 'chrono_breaker', 'Chrono Breaker'],
      [1, 'timeline_disruptor', 'Timeline Disruptor'],
    ],
  ],
  [
    'dream_ocean',
    [
      [5, 'fang_initiate', 'Fang Initiate'],
      [4, 'predator_warrior', 'Predator Warrior'],
      [3, 'apex_hunter', 'Apex Hunter'],
      [2, 'alpha_devourer', 'Alpha Devourer'],
      [1, 'primal_overlord', 'Primal Overlord'],
    ],
  ],
];

function stubClass(
  lineageId: LineageId,
  tier: ClassTier,
  idSuffix: string,
  name: string,
): ClassData {
  return {
    id: `${lineageId}.${idSuffix}`,
    name,
    lineageId,
    tier,
    role: 'DPS',
    combatArchetype: 'burst_dps',
    ctProfile: 'Medium',
    ctRange: UNSPECIFIED,
    primaryResource: 'None',
    basicAttackSkillId: UNSPECIFIED,
    skillIds: [],
    passives: [],
    evolutionTargetClassIds: [],
    description: `Stub for ${name} (${lineageId} T${tier}). Authored in P1.5.`,
    gearSynergy: '',
    isStub: true,
  };
}

export const STUB_CLASSES: readonly ClassData[] = LINEAGE_CLASS_TABLE.flatMap(
  ([lineageId, entries]) =>
    entries.map(([tier, idSuffix, name]) => stubClass(lineageId, tier, idSuffix, name)),
);
