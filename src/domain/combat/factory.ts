import {
  isSpecified,
  type BossDef,
  type ClassData,
  type ClassTier,
  type EnemyArchetype,
  type EnemyTier,
  type Skill,
  type SkillId,
} from '../../content/types';
import { sortedTurnOrder } from './queue';
import { makeBaseStats } from './stats';
import {
  toInstanceId,
  type BattleState,
  type InstanceId,
  type ResolvedStats,
  type Team,
  type Unit,
} from './types';

export const SYNTHETIC_BASIC_ATTACK_ID = '__synthetic.basic_attack' as SkillId;

export const SYNTHETIC_BASIC_ATTACK: Skill = {
  id: SYNTHETIC_BASIC_ATTACK_ID,
  name: 'Basic Attack',
  description: 'Generic weapon strike. Used when a class has no basic-attack skill.',
  ctCost: 40,
  cooldownSec: 0,
  resource: { type: 'none', cost: 0 },
  target: 'single',
  tags: ['physical', 'single-target'],
  neverMiss: true,
  effects: [
    {
      kind: 'damage',
      description: 'Weapon strike.',
      magnitude: 1,
      magnitudeUnit: 'multiplier',
      damageType: 'physical',
    },
  ],
};

const CLASS_TIER_BASELINE: Readonly<Record<ClassTier, Partial<ResolvedStats>>> = {
  1: { strength: 80, intellect: 80, agility: 60, stamina: 80, defense: 40, magicDefense: 40, speed: 80, critChance: 0.15, critMultiplier: 1.75 },
  2: { strength: 60, intellect: 60, agility: 55, stamina: 65, defense: 30, magicDefense: 30, speed: 70, critChance: 0.12, critMultiplier: 1.65 },
  3: { strength: 48, intellect: 48, agility: 50, stamina: 55, defense: 25, magicDefense: 25, speed: 65, critChance: 0.1, critMultiplier: 1.55 },
  4: { strength: 38, intellect: 38, agility: 45, stamina: 45, defense: 20, magicDefense: 20, speed: 60, critChance: 0.08, critMultiplier: 1.5 },
  5: { strength: 30, intellect: 30, agility: 40, stamina: 40, defense: 15, magicDefense: 15, speed: 55, critChance: 0.05, critMultiplier: 1.5 },
};

const HP_PER_STAMINA = 4;
const MP_PER_INTELLECT = 0.5;

export interface PlayerUnitOptions {
  readonly instanceId: string;
  readonly team?: Team;
  readonly insertionIndex?: number;
  readonly classRank?: number;
  readonly statOverlays?: Partial<ResolvedStats>;
}

export const buildPlayerUnit = (
  classData: ClassData,
  opts: PlayerUnitOptions,
): Unit => {
  const classRank = Math.max(0, Math.trunc(opts.classRank ?? 0));
  const passiveScale = 1 + classRank * 0.02;
  const baseline = CLASS_TIER_BASELINE[classData.tier];
  const overlays: Partial<ResolvedStats> = { ...baseline };

  for (const passive of classData.passives) {
    if (!isSpecified(passive.magnitude)) continue;
    const tag = passive.statTag?.toLowerCase();
    if (tag === undefined) continue;
    const unit = passive.magnitudeUnit;
    if (unit === 'seconds' || unit === 'max_hp_percent') continue;
    const baselineValue =
      tag in baseline ? (baseline as Record<string, number>)[tag] ?? 0 : 0;
    const delta =
      unit === 'flat'
        ? passive.magnitude * passiveScale
        : baselineValue * passive.magnitude * passiveScale;
    const key = tag as keyof ResolvedStats;
    if (key === 'resistances') continue;
    const prior = (overlays as Record<string, number>)[key] ?? baselineValue;
    (overlays as Record<string, number>)[key] = prior + delta;
  }

  if (opts.statOverlays !== undefined) {
    const keys: ReadonlyArray<keyof Omit<ResolvedStats, 'resistances'>> = [
      'strength',
      'intellect',
      'agility',
      'stamina',
      'defense',
      'magicDefense',
      'speed',
      'critChance',
      'critMultiplier',
      'ctReductionPct',
    ];
    for (const key of keys) {
      const bonus = opts.statOverlays[key] ?? 0;
      if (bonus === 0) continue;
      const prior = (overlays as Record<string, number>)[key] ?? 0;
      (overlays as Record<string, number>)[key] = prior + bonus;
    }
  }

  const stats = makeBaseStats(overlays);
  const hpMax = Math.round(stats.stamina * HP_PER_STAMINA + classData.tier * 50);
  const mpMax =
    classData.primaryResource === 'MP'
      ? Math.round(20 + stats.intellect * MP_PER_INTELLECT)
      : 0;

  const instanceId = toInstanceId(opts.instanceId);
  const unit: Unit = {
    id: instanceId,
    team: opts.team ?? 'player',
    classId: classData.id,
    displayName: classData.name,
    hp: hpMax,
    hpMax,
    mp: mpMax,
    mpMax,
    ct: 0,
    baseStats: stats,
    skillIds: classData.skillIds,
    cooldowns: {},
    statuses: [],
    insertionIndex: opts.insertionIndex ?? 0,
    isDead: false,
  };
  if (isSpecified(classData.basicAttackSkillId)) {
    return { ...unit, basicAttackSkillId: classData.basicAttackSkillId };
  }
  return { ...unit, basicAttackSkillId: SYNTHETIC_BASIC_ATTACK_ID };
};

export interface EnemyUnitOptions {
  readonly instanceId: string;
  readonly tier: EnemyTier;
  readonly team?: Team;
  readonly insertionIndex?: number;
}

export const buildEnemyUnit = (
  archetype: EnemyArchetype,
  opts: EnemyUnitOptions,
): Unit => {
  const row = archetype.scaling.find((r) => r.tier === opts.tier);
  if (row === undefined) {
    throw new Error(
      `enemy archetype ${archetype.id} has no scaling row for tier ${opts.tier}`,
    );
  }
  const hp = isSpecified(row.hp) ? row.hp : 100 * opts.tier;
  const atk = isSpecified(row.atk) ? row.atk : 10 * opts.tier;
  const def = isSpecified(row.def) ? row.def : 5 * opts.tier;
  const ctPerTick = isSpecified(row.ctPerTick) ? row.ctPerTick : 1;

  const stats = makeBaseStats({
    strength: atk,
    intellect: atk,
    agility: 30,
    stamina: Math.round(hp / HP_PER_STAMINA),
    defense: def,
    magicDefense: def,
    speed: Math.round(50 * ctPerTick),
    critChance: 0.05,
    critMultiplier: 1.5,
  });

  const id = toInstanceId(opts.instanceId);
  return {
    id,
    team: opts.team ?? 'enemy',
    archetypeId: archetype.id,
    displayName: archetype.name,
    hp,
    hpMax: hp,
    mp: 0,
    mpMax: 0,
    ct: 0,
    baseStats: stats,
    skillIds: [],
    basicAttackSkillId: SYNTHETIC_BASIC_ATTACK_ID,
    cooldowns: {},
    statuses: [],
    insertionIndex: opts.insertionIndex ?? 0,
    isDead: false,
  };
};

export interface BossUnitOptions {
  readonly instanceId: string;
  readonly team?: Team;
  readonly insertionIndex?: number;
}

/**
 * Build a Unit from a `BossDef`. Falls back to sane defaults if any of hp/atk/def
 * is `UNSPECIFIED` so stub bosses don't crash the engine.
 *
 * The boss takes its skillIds + basicAttackSkillId directly from BossDef. If
 * basicAttackSkillId is missing, the synthetic basic attack is used.
 */
export const buildBossUnit = (boss: BossDef, opts: BossUnitOptions): Unit => {
  const stageScale = boss.stage; // 5/10/30
  const hp = isSpecified(boss.hp) ? boss.hp : 200 * stageScale;
  const atk = isSpecified(boss.atk) ? boss.atk : 12 + stageScale;
  const def = isSpecified(boss.def) ? boss.def : 6 + Math.floor(stageScale / 2);
  const speed = boss.speed ?? 80;

  const stats = makeBaseStats({
    strength: atk,
    intellect: atk,
    agility: 30,
    stamina: Math.round(hp / HP_PER_STAMINA),
    defense: def,
    magicDefense: def,
    speed,
    critChance: 0.08,
    critMultiplier: 1.6,
  });

  const id = toInstanceId(opts.instanceId);
  const rawBasic = boss.basicAttackSkillId;
  const basicAttackSkillId: SkillId =
    rawBasic !== undefined && isSpecified(rawBasic) ? rawBasic : SYNTHETIC_BASIC_ATTACK_ID;

  return {
    id,
    team: opts.team ?? 'enemy',
    displayName: boss.name,
    hp,
    hpMax: hp,
    mp: 0,
    mpMax: 0,
    ct: 0,
    baseStats: stats,
    skillIds: boss.skillIds ?? [],
    basicAttackSkillId,
    cooldowns: {},
    statuses: [],
    insertionIndex: opts.insertionIndex ?? 0,
    isDead: false,
  };
};

export interface BattleInitParams {
  readonly seed: number;
  readonly units: readonly Unit[];
}

export const buildBattleState = (params: BattleInitParams): BattleState => {
  const units: Record<InstanceId, Unit> = {};
  params.units.forEach((u, idx) => {
    units[u.id] = { ...u, insertionIndex: u.insertionIndex ?? idx };
  });
  const turnOrder = sortedTurnOrder(units);
  return {
    seed: params.seed,
    rngCursor: 0,
    tick: 0,
    elapsedSec: 0,
    units,
    turnOrder,
    log: [{ tick: 0, type: 'battle_started', seed: params.seed }],
    result: 'ongoing',
  };
};

export const resolveSkillOrSynthetic = (
  skillId: SkillId,
  lookup: (id: SkillId) => Skill | undefined,
): Skill => {
  if (skillId === SYNTHETIC_BASIC_ATTACK_ID) return SYNTHETIC_BASIC_ATTACK;
  const skill = lookup(skillId);
  if (skill === undefined) {
    throw new Error(`skill ${skillId} not found in content tables`);
  }
  return skill;
};
