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
    // High HP + def, low atk, slightly slower — must be ground down over multiple hits.
    scaling: [
      { tier: 1, hp: 160,  atk: 8,   def: 9,  ctPerTick: 0.95, notes: 'maxHitPct=20' },
      { tier: 2, hp: 350,  atk: 18,  def: 20, ctPerTick: 1.0,  notes: 'maxHitPct=18' },
      { tier: 3, hp: 770,  atk: 40,  def: 43, ctPerTick: 1.05, notes: 'maxHitPct=15' },
      { tier: 4, hp: 1680, atk: 84,  def: 94, ctPerTick: 1.1,  notes: 'maxHitPct=12' },
    ],
    description: 'Blunt-force wall that punishes single-hit burst builds.',
  },
  {
    id: 'speed_pressure',
    name: 'Speed Pressure',
    role: 'Initiative bully',
    signature: 'Always acts first every initiativeCycle CT cycles.',
    stressAxis: 'Forces burst to outpace first-strike.',
    foreshadowsBossRole: 'speed_pressure',
    // Low HP + def, moderate atk, high ctPerTick — acts frequently but can't absorb punishment.
    scaling: [
      { tier: 1, hp: 70,  atk: 14,  def: 4,  ctPerTick: 1.25, notes: 'initiativeCycle=3' },
      { tier: 2, hp: 155, atk: 29,  def: 9,  ctPerTick: 1.3,  notes: 'initiativeCycle=3' },
      { tier: 3, hp: 340, atk: 62,  def: 19, ctPerTick: 1.35, notes: 'initiativeCycle=2' },
      { tier: 4, hp: 740, atk: 132, def: 42, ctPerTick: 1.4,  notes: 'initiativeCycle=2' },
    ],
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
    // High atk, low HP + def, slightly fast — glass cannon that punishes low defense.
    scaling: [
      { tier: 1, hp: 85,  atk: 16,  def: 4,  ctPerTick: 1.05, notes: 'doubleActionChance=10' },
      { tier: 2, hp: 190, atk: 34,  def: 8,  ctPerTick: 1.1,  notes: 'doubleActionChance=15' },
      { tier: 3, hp: 410, atk: 73,  def: 17, ctPerTick: 1.1,  notes: 'doubleActionChance=20' },
      { tier: 4, hp: 890, atk: 156, def: 36, ctPerTick: 1.15, notes: 'doubleActionChance=25' },
    ],
    description: 'Unpredictable bursts — CT variance spikes without warning.',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    role: 'Prediction distortion',
    signature: 'Telegraphs false skill outcomes deceptionChance% of the time.',
    stressAxis: 'Forces adaptive, reactive play.',
    foreshadowsBossRole: 'oracle',
    // Slightly lower atk, slightly higher def — wins via deception not raw power.
    scaling: [
      { tier: 1, hp: 100,  atk: 11,  def: 6,  ctPerTick: 1.0,  notes: 'deceptionChance=15' },
      { tier: 2, hp: 220,  atk: 24,  def: 12, ctPerTick: 1.05, notes: 'deceptionChance=20' },
      { tier: 3, hp: 480,  atk: 51,  def: 26, ctPerTick: 1.1,  notes: 'deceptionChance=25' },
      { tier: 4, hp: 1050, atk: 108, def: 57, ctPerTick: 1.15, notes: 'deceptionChance=30' },
    ],
    description: 'Misleads UI telegraphs; CT-delays player actions on deception proc.',
  },
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'Battlefield controller',
    signature: 'Field debuff: slows player CT gain by ctSlowPct% within zone.',
    stressAxis: 'Forces high CT-efficiency skills.',
    foreshadowsBossRole: 'engineer',
    // Durable (higher HP + def), low atk — wins through zone control not damage output.
    scaling: [
      { tier: 1, hp: 110,  atk: 10, def: 7,  ctPerTick: 1.0,  notes: 'ctSlowPct=8' },
      { tier: 2, hp: 240,  atk: 21, def: 14, ctPerTick: 1.05, notes: 'ctSlowPct=10' },
      { tier: 3, hp: 530,  atk: 45, def: 31, ctPerTick: 1.1,  notes: 'ctSlowPct=12 (clamp to 10)' },
      { tier: 4, hp: 1160, atk: 96, def: 68, ctPerTick: 1.15, notes: 'ctSlowPct=15 (clamp to 10)' },
    ],
    description: 'Zone control — tier 3–4 values clamp to global CT-reduction cap (10%).',
  },
  {
    id: 'harrier',
    name: 'Harrier',
    role: 'Pressure + evasion (reserve)',
    signature: 'evasionPct% dodge while any ally alive.',
    stressAxis: 'Forces execute / focus-fire.',
    // Low HP + def, moderate atk, moderately fast — fragile by stats; evasion is intended real defense.
    scaling: [
      { tier: 1, hp: 75,  atk: 14,  def: 4,  ctPerTick: 1.15, notes: 'evasionPct=20' },
      { tier: 2, hp: 165, atk: 29,  def: 8,  ctPerTick: 1.2,  notes: 'evasionPct=25' },
      { tier: 3, hp: 360, atk: 62,  def: 18, ctPerTick: 1.25, notes: 'evasionPct=30' },
      { tier: 4, hp: 790, atk: 132, def: 39, ctPerTick: 1.3,  notes: 'evasionPct=35' },
    ],
    description: 'Reserve archetype; ally-dependent dodge stacking.',
  },
  {
    id: 'resonator',
    name: 'Resonator',
    role: 'Buff carrier (reserve)',
    signature: 'Buffs ally damage by resonancePct% per turn.',
    stressAxis: 'Forces priority-kill target selection.',
    // Very low atk, modest HP + def — a support role that is fragile when isolated.
    scaling: [
      { tier: 1, hp: 85,  atk: 7,  def: 5,  ctPerTick: 1.0,  notes: 'resonancePct=10' },
      { tier: 2, hp: 190, atk: 16, def: 10, ctPerTick: 1.05, notes: 'resonancePct=12' },
      { tier: 3, hp: 410, atk: 34, def: 22, ctPerTick: 1.1,  notes: 'resonancePct=15' },
      { tier: 4, hp: 895, atk: 72, def: 47, ctPerTick: 1.15, notes: 'resonancePct=18' },
    ],
    description: 'Reserve archetype; passive tempo manipulator.',
  },
];

export const ENEMY_ARCHETYPES: readonly EnemyArchetype[] = archetypes;

export const ENEMY_ARCHETYPE_BY_ID: ReadonlyMap<EnemyArchetypeId, EnemyArchetype> = new Map(
  ENEMY_ARCHETYPES.map((a) => [a.id, a]),
);
