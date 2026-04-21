import type { EnemyArchetype, EnemyArchetypeId, EnemyTierScaling } from './types';

const SCALING_BY_TIER: readonly EnemyTierScaling[] = [
  { tier: 1, hp: 100, atk: 12, def: 5, ctPerTick: 1.0 },
  { tier: 2, hp: 220, atk: 26, def: 11, ctPerTick: 1.05 },
  { tier: 3, hp: 480, atk: 56, def: 24, ctPerTick: 1.1 },
  { tier: 4, hp: 1050, atk: 120, def: 52, ctPerTick: 1.15 },
];

function scalingWith(notes: Partial<Record<1 | 2 | 3 | 4, string>>): EnemyTierScaling[] {
  return SCALING_BY_TIER.map((row) => {
    const note = notes[row.tier];
    return note === undefined ? { ...row } : { ...row, notes: note };
  });
}

const archetypes: readonly EnemyArchetype[] = [
  {
    id: 'stat_wall',
    name: 'Stat Wall',
    role: 'Damage cap',
    signature: 'Caps damage taken per hit at maxHitPct% of max HP.',
    stressAxis: 'Forces multi-hit / DoT responses.',
    foreshadowsBossRole: 'stat_wall',
    scaling: scalingWith({
      1: 'maxHitPct=20',
      2: 'maxHitPct=18',
      3: 'maxHitPct=15',
      4: 'maxHitPct=12',
    }),
    description: 'Blunt-force wall that punishes single-hit burst builds.',
  },
  {
    id: 'speed_pressure',
    name: 'Speed Pressure',
    role: 'Initiative bully',
    signature: 'Always acts first every initiativeCycle CT cycles.',
    stressAxis: 'Forces burst to outpace first-strike.',
    foreshadowsBossRole: 'speed_pressure',
    scaling: scalingWith({
      1: 'initiativeCycle=3',
      2: 'initiativeCycle=3',
      3: 'initiativeCycle=2',
      4: 'initiativeCycle=2',
    }),
    description: 'Tempo aggressor with guaranteed opening strikes.',
  },
  {
    id: 'sustain_denial',
    name: 'Sustain Denial',
    role: 'Heal suppressor',
    signature: 'Reduces incoming heals by healReductionPct%.',
    stressAxis: 'Forces shield/burst lines over recovery.',
    foreshadowsBossRole: 'sustain_denial',
    scaling: scalingWith({
      1: 'healReductionPct=40',
      2: 'healReductionPct=50',
      3: 'healReductionPct=60',
      4: 'healReductionPct=70',
    }),
    description: 'Silences healing-based builds; heals itself on player CT gain.',
  },
  {
    id: 'dps_race',
    name: 'DPS Race',
    role: 'Damage ramp',
    signature: 'Damage scales +rampPerTurnPct% per turn.',
    stressAxis: 'Forces stun/control windows.',
    foreshadowsBossRole: 'dps_race',
    scaling: scalingWith({
      1: 'rampPerTurnPct=8',
      2: 'rampPerTurnPct=10',
      3: 'rampPerTurnPct=12',
      4: 'rampPerTurnPct=14',
    }),
    description: 'Wins if the fight runs long — control or die.',
  },
  {
    id: 'ct_manipulator',
    name: 'CT Manipulator',
    role: 'Tempo disruptor',
    signature: 'Rewinds one random target by rewindCT every manipulateIntervalCT.',
    stressAxis: 'Breaks planned rotations.',
    foreshadowsBossRole: 'ct_manipulator',
    scaling: scalingWith({
      1: 'interval=60 rewind=10',
      2: 'interval=50 rewind=15',
      3: 'interval=40 rewind=20',
      4: 'interval=30 rewind=25',
    }),
    description: 'Directly manipulates the CT clock — the defining Chrono-style threat.',
  },
  {
    id: 'summoner',
    name: 'Summoner',
    role: 'Minion generator',
    signature: 'Spawns a minion every spawnIntervalTurns; cap minionCap.',
    stressAxis: 'Forces AoE coverage.',
    foreshadowsBossRole: 'summoner',
    scaling: scalingWith({
      1: 'interval=4 cap=1',
      2: 'interval=4 cap=2',
      3: 'interval=3 cap=2',
      4: 'interval=3 cap=3',
    }),
    description: 'Grows more dangerous the longer it lives; minions clutter the CT queue.',
  },
  {
    id: 'nullshield',
    name: 'Nullshield',
    role: 'Defensive puzzle',
    signature: 'Rotating damage-type immunity; rotates every shieldRotateCT CT.',
    stressAxis: 'Forces flexible skill loadouts.',
    foreshadowsBossRole: 'nullshield',
    scaling: scalingWith({
      1: 'shieldRotateCT=80',
      2: 'shieldRotateCT=70',
      3: 'shieldRotateCT=60',
      4: 'shieldRotateCT=50',
    }),
    description: 'Shifts elemental immunity — punishes mono-element builds.',
  },
  {
    id: 'chaos_dps',
    name: 'Chaos DPS',
    role: 'Variance attacker',
    signature: 'doubleActionChance% chance to double-act per turn.',
    stressAxis: 'Forces defensive safety margins.',
    foreshadowsBossRole: 'chaos_dps',
    scaling: scalingWith({
      1: 'doubleActionChance=10',
      2: 'doubleActionChance=15',
      3: 'doubleActionChance=20',
      4: 'doubleActionChance=25',
    }),
    description: 'Unpredictable bursts — CT variance spikes without warning.',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    role: 'Prediction distortion',
    signature: 'Telegraphs false skill outcomes deceptionChance% of the time.',
    stressAxis: 'Forces adaptive, reactive play.',
    foreshadowsBossRole: 'oracle',
    scaling: scalingWith({
      1: 'deceptionChance=15',
      2: 'deceptionChance=20',
      3: 'deceptionChance=25',
      4: 'deceptionChance=30',
    }),
    description: 'Misleads UI telegraphs; CT-delays player actions on deception proc.',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'Battlefield controller',
    signature: 'Field debuff: slows player CT gain by ctSlowPct% within zone.',
    stressAxis: 'Forces high CT-efficiency skills.',
    foreshadowsBossRole: 'engineer',
    scaling: scalingWith({
      1: 'ctSlowPct=8',
      2: 'ctSlowPct=10',
      3: 'ctSlowPct=12 (clamp to 10)',
      4: 'ctSlowPct=15 (clamp to 10)',
    }),
    description: 'Zone control — tier 3–4 values clamp to global CT-reduction cap (10%).',
  },
  {
    id: 'harrier',
    name: 'Harrier',
    role: 'Pressure + evasion (reserve)',
    signature: 'evasionPct% dodge while any ally alive.',
    stressAxis: 'Forces execute / focus-fire.',
    scaling: scalingWith({
      1: 'evasionPct=20',
      2: 'evasionPct=25',
      3: 'evasionPct=30',
      4: 'evasionPct=35',
    }),
    description: 'Reserve archetype; ally-dependent dodge stacking.',
  },
  {
    id: 'resonator',
    name: 'Resonator',
    role: 'Buff carrier (reserve)',
    signature: 'Buffs ally damage by resonancePct% per turn.',
    stressAxis: 'Forces priority-kill target selection.',
    scaling: scalingWith({
      1: 'resonancePct=10',
      2: 'resonancePct=12',
      3: 'resonancePct=15',
      4: 'resonancePct=18',
    }),
    description: 'Reserve archetype; passive tempo manipulator.',
  },
];

export const ENEMY_ARCHETYPES: readonly EnemyArchetype[] = archetypes;

export const ENEMY_ARCHETYPE_BY_ID: ReadonlyMap<EnemyArchetypeId, EnemyArchetype> = new Map(
  ENEMY_ARCHETYPES.map((a) => [a.id, a]),
);
