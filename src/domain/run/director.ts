import { BOSSES, ENCOUNTERS } from '../../content';
import type { BossDef, Encounter } from '../../content/types';
import type {
  EncounterEnemyEntry,
  RewardBundle,
  ResolvedEncounter,
  RunDirectorInput,
  StageSelection,
} from './types';

const MIN_STAGE = 1;
const MAX_STAGE = 30;

const isCheckpointStage = (stage: number): boolean => stage === 10 || stage === 20 || stage === 30;

const isBossStage = (stage: number): stage is 5 | 10 | 30 => stage === 5 || stage === 10 || stage === 30;

const normalizeSeed = (seed: number): number => {
  if (!Number.isFinite(seed)) return 0;
  return Math.trunc(Math.abs(seed)) >>> 0;
};

const hash = (seed: number, salt: number): number => {
  let x = (normalizeSeed(seed) ^ Math.imul(salt | 0, 0x45d9f3b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x45d9f3b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
};

const pickIndex = (seed: number, salt: number, length: number): number => {
  if (length <= 0) return 0;
  return hash(seed, salt) % length;
};

const classSalt = (classId: string): number => {
  let acc = 0;
  for (let i = 0; i < classId.length; i += 1) {
    acc = (acc + classId.charCodeAt(i) * (i + 1)) | 0;
  }
  return acc;
};

const proceduralEncountersForStage = (stage: number): readonly Encounter[] =>
  ENCOUNTERS.filter((enc) => stage >= enc.stageMin && stage <= enc.stageMax);

const resolveEncounterByStage = (seed: number, stage: number, classId: string): Encounter => {
  const candidates = proceduralEncountersForStage(stage);
  if (candidates.length === 0) {
    throw new Error(`No procedural encounter authored for stage ${stage}.`);
  }
  return candidates[pickIndex(seed, stage + classSalt(classId), candidates.length)] as Encounter;
};

const stageTier = (stage: number): 1 | 2 | 3 | 4 => {
  if (stage <= 4) return 1;
  if (stage <= 9) return 2;
  if (stage <= 20) return 3;
  return 4;
};

const resolveProceduralEnemies = (
  seed: number,
  stage: number,
  classId: string,
): readonly EncounterEnemyEntry[] => {
  const tier = stageTier(stage);
  const variant = pickIndex(seed, stage * 17 + classSalt(classId), 3);

  if (stage <= 4) {
    if (variant === 0) {
      return [
        { archetypeId: 'dps_race', count: 2, tier },
        { archetypeId: 'speed_pressure', count: 1, tier },
      ];
    }
    if (variant === 1) {
      return [
        { archetypeId: 'dps_race', count: 1, tier },
        { archetypeId: 'sustain_denial', count: 1, tier },
      ];
    }
    return [
      { archetypeId: 'speed_pressure', count: 1, tier },
      { archetypeId: 'stat_wall', count: 1, tier },
    ];
  }

  if (stage <= 9) {
    if (variant === 0) {
      return [
        { archetypeId: 'dps_race', count: 2, tier },
        { archetypeId: 'sustain_denial', count: 1, tier },
      ];
    }
    if (variant === 1) {
      return [
        { archetypeId: 'speed_pressure', count: 2, tier },
        { archetypeId: 'ct_manipulator', count: 1, tier },
      ];
    }
    return [
      { archetypeId: 'stat_wall', count: 1, tier },
      { archetypeId: 'dps_race', count: 1, tier },
      { archetypeId: 'sustain_denial', count: 1, tier },
    ];
  }

  if (variant === 0) {
    return [
      { archetypeId: 'ct_manipulator', count: 1, tier },
      { archetypeId: 'summoner', count: 1, tier },
      { archetypeId: 'dps_race', count: 2, tier },
    ];
  }
  if (variant === 1) {
    return [
      { archetypeId: 'nullshield', count: 1, tier },
      { archetypeId: 'speed_pressure', count: 2, tier },
      { archetypeId: 'sustain_denial', count: 1, tier },
    ];
  }
  return [
    { archetypeId: 'chaos_dps', count: 2, tier },
    { archetypeId: 'engineer', count: 1, tier },
    { archetypeId: 'dps_race', count: 1, tier },
  ];
};

const resolveProceduralRewards = (stage: number): RewardBundle => {
  const tier = stageTier(stage);
  const gearRollPrefix = `gear.roll.t${tier}`;

  if (stage <= 4) {
    return {
      gold: 50 + stage * 10,
      ascensionCells: 0,
      xpScrollMinor: 1,
      xpScrollStandard: 0,
      xpScrollGrand: 0,
      gearIds: [`${gearRollPrefix}.common`],
    };
  }

  if (stage <= 9) {
    return {
      gold: 120 + stage * 15,
      ascensionCells: 1,
      xpScrollMinor: 1,
      xpScrollStandard: 1,
      xpScrollGrand: 0,
      gearIds: [`${gearRollPrefix}.common`, `${gearRollPrefix}.rare`],
    };
  }

  return {
    gold: 260 + stage * 20,
    ascensionCells: stage >= 20 ? 4 : 2,
    xpScrollMinor: 0,
    xpScrollStandard: 1,
    xpScrollGrand: stage >= 20 ? 1 : 0,
    gearIds: [`${gearRollPrefix}.rare`, `${gearRollPrefix}.epic`],
  };
};

const resolveCounterBossId = (seed: number, activeLineageId: string): string => {
  const counterBosses = BOSSES.filter((b) => b.bossType === 'counter');
  if (counterBosses.length === 0) {
    throw new Error('No counter bosses authored in content tables.');
  }
  const fallbackBossId = counterBosses[0]?.id;
  if (fallbackBossId === undefined) {
    throw new Error('No fallback counter boss available.');
  }

  const lineageCounter = counterBosses.find((b) => b.lineageCounter === activeLineageId);
  const nonMatching = counterBosses.filter((b) => b.lineageCounter !== activeLineageId);

  const hitsTrueCounter = hash(seed, 30) % 12 === 0;
  if (hitsTrueCounter && lineageCounter !== undefined) return lineageCounter.id;

  if (nonMatching.length > 0) {
    return nonMatching[pickIndex(seed, 30 * 97, nonMatching.length)]?.id ?? fallbackBossId;
  }

  return lineageCounter?.id ?? fallbackBossId;
};

const bossForStage = (seed: number, stage: 5 | 10 | 30, activeLineageId: string): BossDef => {
  if (stage === 5) {
    const mini = BOSSES.find((b) => b.stage === 5 && b.bossType === 'mini' && !b.isStub);
    if (mini === undefined) throw new Error('Missing authored stage-5 mini-boss.');
    return mini;
  }

  if (stage === 10) {
    const gate = BOSSES.find((b) => b.stage === 10 && b.bossType === 'standard' && !b.isStub);
    if (gate === undefined) throw new Error('Missing authored stage-10 gate boss.');
    return gate;
  }

  const id = resolveCounterBossId(seed, activeLineageId);
  const boss = BOSSES.find((b) => b.id === id);
  if (boss === undefined) throw new Error(`Counter-boss ${id} not found.`);
  return boss;
};

const resolveProceduralStage = (seed: number, stage: number, classId: string): ResolvedEncounter => {
  const encounter = resolveEncounterByStage(seed, stage, classId);
  return {
    encounterId: encounter.id,
    enemies: resolveProceduralEnemies(seed, stage, classId),
    rewards: resolveProceduralRewards(stage),
  };
};

export const selectStage = (input: RunDirectorInput): StageSelection => {
  const stage = Math.trunc(input.stage);
  if (stage < MIN_STAGE || stage > MAX_STAGE) {
    throw new Error(`Invalid stage ${input.stage}. Stage must be between ${MIN_STAGE} and ${MAX_STAGE}.`);
  }

  if (isBossStage(stage)) {
    const boss = bossForStage(input.seed, stage, input.activeLineageId);
    return {
      stage,
      isCheckpoint: isCheckpointStage(stage),
      kind: 'boss',
      bossId: boss.id,
    };
  }

  return {
    stage,
    isCheckpoint: isCheckpointStage(stage),
    kind: 'procedural',
    encounter: resolveProceduralStage(input.seed, stage, input.activeClassId),
  };
};

export const RUN_DIRECTOR_PRIVATE = {
  hash,
  isBossStage,
  isCheckpointStage,
  resolveCounterBossId,
  resolveProceduralEnemies,
  resolveProceduralRewards,
};
