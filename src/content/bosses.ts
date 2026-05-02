import { UNSPECIFIED, type BossDef, type BossId, type LineageId } from './types';

const miniBossStage5: BossDef = {
  id: 'boss.drakehorn_pyre_warden',
  name: 'Pyre Warden',
  bossType: 'mini',
  stage: 5,
  hp: 420,
  atk: 26,
  def: 12,
  speed: 75,
  basicAttackSkillId: 'boss.pyre.scorch',
  skillIds: ['boss.pyre.heat_surge', 'boss.pyre.ignite_aura'],
  phases: [
    {
      hpThreshold: 0.5,
      description: 'Heat Surge: gains Heat stacks faster below 50% HP.',
      mechanicChanges: ['doubles Heat stack generation', 'adds AoE ignite attack'],
    },
  ],
  mechanics: [
    {
      name: 'Heat Stack',
      description: 'Gains a Heat stack on hit; each stack increases outgoing fire damage.',
      magnitude: 0.02,
      magnitudeUnit: 'percent',
    },
  ],
  description:
    'Stage-5 mini-boss foreshadowing Drakehorn Forge mechanics. Scaled-up DPS-race archetype.',
};

const gateBossStage10: BossDef = {
  id: 'boss.vortex_colossus',
  name: 'Vortex Colossus',
  bossType: 'standard',
  stage: 10,
  hp: 900,
  atk: 36,
  def: 20,
  speed: 70,
  basicAttackSkillId: 'boss.vortex.crush',
  skillIds: ['boss.vortex.ct_rewind', 'boss.vortex.gravity_well'],
  phases: [
    {
      hpThreshold: 0.66,
      description: 'Phase 2 — CT rewind tempo increases.',
      mechanicChanges: ['rewind interval reduced', 'adds secondary pull mechanic'],
    },
    {
      hpThreshold: 0.33,
      description: 'Phase 3 — global CT-drain aura.',
      mechanicChanges: ['applies sustained player CT drain'],
    },
  ],
  mechanics: [
    {
      name: 'CT Rewind',
      description: 'Periodically rewinds one random target by a fixed CT amount.',
      magnitude: 30,
    },
  ],
  description: 'Stage-10 gate boss — generic boss pool representative with CT-manipulation theme.',
};

const counterBossStage30: BossDef = {
  id: 'boss.rimefang_hydra',
  name: 'Rimefang Hydra',
  bossType: 'counter',
  stage: 30,
  lineageCounter: 'drakehorn_forge',
  hp: 2200,
  atk: 50,
  def: 30,
  speed: 85,
  basicAttackSkillId: 'boss.rimefang.ice_bite',
  skillIds: [
    'boss.rimefang.frostbite_aegis',
    'boss.rimefang.regrow_head',
    'boss.rimefang.tail_whip',
  ],
  phases: [
    {
      hpThreshold: 0.75,
      description: 'Phase 1 — ice shells nullify fire DoT ticks.',
      mechanicChanges: ['fire-damage resistance window'],
    },
    {
      hpThreshold: 0.4,
      description: 'Phase 2 — regrows heads on fire kill.',
      mechanicChanges: ['fire-kill revival'],
    },
  ],
  mechanics: [
    {
      name: 'Frostbite Aegis',
      description: 'Incoming fire damage is capped per hit; punishes Drakehorn ramp builds.',
      magnitude: 50,
    },
  ],
  description:
    'Stage-30 counter boss targeting Drakehorn Forge — the 1/12 "correct counter" roll for Ignis runs.',
};

function stubBoss(
  id: BossId,
  name: string,
  stage: 5 | 10 | 30,
  bossType: BossDef['bossType'],
  lineageCounter?: LineageId,
): BossDef {
  return {
    id,
    name,
    bossType,
    stage,
    ...(lineageCounter !== undefined ? { lineageCounter } : {}),
    hp: UNSPECIFIED,
    atk: UNSPECIFIED,
    def: UNSPECIFIED,
    phases: [],
    mechanics: [],
    description: `Stub for ${name}. Authored in P1.5.`,
    isStub: true,
  };
}

const STUB_MINI_BOSSES: readonly BossDef[] = [
  stubBoss('boss.stone_basilisk', 'Stone Basilisk', 5, 'mini'),
  stubBoss('boss.tempest_harrier', 'Tempest Harrier', 5, 'mini'),
  stubBoss('boss.nullshield_keeper', 'Nullshield Keeper', 5, 'mini'),
  stubBoss('boss.chaos_doppelganger', 'Chaos Doppelganger', 5, 'mini'),
  stubBoss('boss.oracle_of_false_paths', 'Oracle of False Paths', 5, 'mini'),
  stubBoss('boss.zone_engineer', 'Zone Engineer', 5, 'mini'),
  stubBoss('boss.sustain_denier', 'Sustain Denier', 5, 'mini'),
  stubBoss('boss.summon_matron', 'Summon Matron', 5, 'mini'),
  stubBoss('boss.stat_wall_elder', 'Stat Wall Elder', 5, 'mini'),
];

const STUB_GATE_BOSSES: readonly BossDef[] = [
  stubBoss('boss.gate_stat_check', 'Aegis Bulwark', 10, 'standard'),
  stubBoss('boss.gate_pattern', 'Celestial Conductor', 10, 'standard'),
  stubBoss('boss.gate_hybrid', 'Twin-Aspect Warden', 10, 'standard'),
  stubBoss('boss.gate_environment', 'Storm Cradle', 10, 'standard'),
];

const STUB_COUNTER_BOSSES: readonly BossDef[] = [
  stubBoss('boss.counter_bull_cathedral', 'Rampaging Titan', 30, 'counter', 'bull_cathedral'),
  stubBoss('boss.counter_twin_mirror', 'Null Construct', 30, 'counter', 'twin_mirror'),
  stubBoss('boss.counter_tide_shell', 'Tidelock Sentinel', 30, 'counter', 'tide_shell'),
  stubBoss('boss.counter_sunfang_court', 'Eclipse Tyrant', 30, 'counter', 'sunfang_court'),
  stubBoss('boss.counter_thorn_ledger', 'Antivenom Golem', 30, 'counter', 'thorn_ledger'),
  stubBoss('boss.counter_balance_reins', 'Dissonance Herald', 30, 'counter', 'balance_reins'),
  stubBoss('boss.counter_black_nest', 'Dawnlit Sovereign', 30, 'counter', 'black_nest'),
  stubBoss('boss.counter_arrow_creed', 'Gustbreaker Colossus', 30, 'counter', 'arrow_creed'),
  stubBoss('boss.counter_iron_covenant', 'Oathbreaker Wyrm', 30, 'counter', 'iron_covenant'),
  stubBoss('boss.counter_star_circuit', 'Timeseal Warden', 30, 'counter', 'star_circuit'),
  stubBoss('boss.counter_dream_ocean', 'Waking Inquisitor', 30, 'counter', 'dream_ocean'),
];

export const BOSSES: readonly BossDef[] = [
  miniBossStage5,
  gateBossStage10,
  counterBossStage30,
  ...STUB_MINI_BOSSES,
  ...STUB_GATE_BOSSES,
  ...STUB_COUNTER_BOSSES,
];

export const BOSS_BY_ID: ReadonlyMap<BossId, BossDef> = new Map(BOSSES.map((b) => [b.id, b]));
