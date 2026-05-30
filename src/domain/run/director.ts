import { ANOMALY_CATEGORIES, BOSSES, ENCOUNTERS, ENCOUNTER_COMPOSITION_TEMPLATES } from '../../content';
import type {
  AnomalyCategoryKind,
  AnomalyId,
  BossDef,
  Encounter,
  EncounterCompositionTemplate,
} from '../../content/types';
import { FORCED_ROOM_BY_STAGE } from './map';
import type {
  EncounterEnemyEntry,
  RewardBundle,
  ResolvedEncounter,
  RunDirectorInput,
  StageRoomType,
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

const roomTypeSalt = (roomType: StageRoomType): number => {
  let acc = 0;
  for (let i = 0; i < roomType.length; i += 1) {
    acc = (acc + roomType.charCodeAt(i) * (i + 3)) | 0;
  }
  return acc;
};

const defaultRoomTypeForStage = (stage: number): StageRoomType =>
  FORCED_ROOM_BY_STAGE[stage] ?? 'normal';

const preferredTemplateTagsForRoomType = (roomType: StageRoomType): readonly string[] => {
  switch (roomType) {
    case 'elite':
      return ['burst', 'control', 'counterplay', 'chaos'];
    case 'event':
      return ['mixed', 'chaos', 'control'];
    case 'treasure':
      return ['defense_check', 'attrition', 'mixed'];
    case 'rest':
      return ['attrition', 'defense_check'];
    case 'merchant':
      return ['tempo', 'attrition'];
    case 'anomaly':
      return ['chaos', 'swarm', 'control'];
    case 'gate':
      return ['control', 'counterplay', 'mixed'];
    case 'mini_boss':
    case 'counter':
      return ['burst', 'control'];
    default:
      return [];
  }
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

const compositionTemplatesForStage = (stage: number): readonly EncounterCompositionTemplate[] =>
  ENCOUNTER_COMPOSITION_TEMPLATES.filter(
    (template) => stage >= template.stageMin && stage <= template.stageMax,
  );

const resolveEncounterTemplate = (
  seed: number,
  stage: number,
  classId: string,
  roomType: StageRoomType,
): EncounterCompositionTemplate => {
  const candidates = compositionTemplatesForStage(stage);
  if (candidates.length === 0) {
    throw new Error(`No encounter composition template authored for stage ${stage}.`);
  }

  const preferredTags = preferredTemplateTagsForRoomType(roomType);
  const taggedCandidates =
    preferredTags.length === 0
      ? candidates
      : candidates.filter((candidate) =>
          preferredTags.some((tag) => candidate.tags.includes(tag)),
        );

  const pool = taggedCandidates.length > 0 ? taggedCandidates : candidates;
  return pool[
    pickIndex(seed, stage * 17 + classSalt(classId) + roomTypeSalt(roomType), pool.length)
  ] as EncounterCompositionTemplate;
};

const stageTier = (stage: number): 1 | 2 | 3 | 4 => {
  if (stage <= 4) return 1;
  if (stage <= 9) return 2;
  if (stage <= 20) return 3;
  return 4;
};

const resolveProceduralEnemies = (
  stage: number,
  template: EncounterCompositionTemplate,
  roomType: StageRoomType,
): readonly EncounterEnemyEntry[] => {
  const tier = stageTier(stage);

  const entries = template.entries.map((entry) => ({ ...entry }));
  const widestIndex = entries
    .map((entry, idx) => ({ idx, count: entry.count }))
    .sort((a, b) => b.count - a.count || a.idx - b.idx)[0]?.idx;

  if (widestIndex !== undefined) {
    const current = entries[widestIndex];
    if (current !== undefined) {
      if (roomType === 'elite' || roomType === 'mini_boss' || roomType === 'counter') {
        current.count = Math.min(4, current.count + 1);
      }
      if (roomType === 'gate' && stage >= 15) {
        current.count = Math.min(4, current.count + 1);
      }
      if (roomType === 'treasure' || roomType === 'rest' || roomType === 'merchant') {
        if (current.count > 1) {
          current.count -= 1;
        }
      }
    }
  }

  return entries.map((entry) => ({
    archetypeId: entry.archetypeId,
    count: entry.count,
    tier,
  }));
};

const anomalyChanceForRoomType = (roomType: StageRoomType): number => {
  switch (roomType) {
    case 'anomaly':
      return 100;
    case 'event':
      return 18;
    case 'elite':
      return 15;
    case 'treasure':
    case 'rest':
    case 'merchant':
      return 8;
    case 'gate':
      return 5;
    default:
      return 12;
  }
};

const resolveStageAnomaly = (
  seed: number,
  stage: number,
  classId: string,
  roomType: StageRoomType,
): { anomalyId: AnomalyId; anomalyKind: AnomalyCategoryKind } | null => {
  if (stage <= 4 || isCheckpointStage(stage) || ANOMALY_CATEGORIES.length === 0) {
    return null;
  }

  const roll = hash(seed, stage * 131 + classSalt(classId)) % 100;
  if (roll >= anomalyChanceForRoomType(roomType)) {
    return null;
  }

  const anomaly = ANOMALY_CATEGORIES[
    pickIndex(seed, stage * 223 + classSalt(classId), ANOMALY_CATEGORIES.length)
  ];
  if (anomaly === undefined) {
    return null;
  }

  return {
    anomalyId: anomaly.id,
    anomalyKind: anomaly.kind,
  };
};

const withExtraGearRoll = (
  reward: RewardBundle,
  extra: string | null,
): RewardBundle => {
  if (extra === null || extra.length === 0 || reward.gearIds.includes(extra) || reward.gearIds.length >= 5) {
    return reward;
  }
  return {
    ...reward,
    gearIds: [...reward.gearIds, extra],
  };
};

const resolveProceduralRewards = (stage: number, roomType: StageRoomType): RewardBundle => {
  const tier = stageTier(stage);
  const gearRollPrefix = `gear.roll.t${tier}`;

  let base: RewardBundle;

  if (stage <= 4) {
    base = {
      gold: 50 + stage * 10,
      ascensionCells: 0,
      xpScrollMinor: 1,
      xpScrollStandard: 0,
      xpScrollGrand: 0,
      gearIds: [`${gearRollPrefix}.common`],
    };
  } else if (stage <= 9) {
    base = {
      gold: 120 + stage * 15,
      ascensionCells: 1,
      xpScrollMinor: 1,
      xpScrollStandard: 1,
      xpScrollGrand: 0,
      gearIds: [`${gearRollPrefix}.common`, `${gearRollPrefix}.rare`],
    };
  } else {
    base = {
      gold: 260 + stage * 20,
      ascensionCells: stage >= 20 ? 4 : 2,
      xpScrollMinor: 0,
      xpScrollStandard: 1,
      xpScrollGrand: stage >= 20 ? 1 : 0,
      gearIds: [`${gearRollPrefix}.rare`, `${gearRollPrefix}.epic`],
    };
  }

  if (roomType === 'normal') return base;

  if (roomType === 'elite' || roomType === 'mini_boss' || roomType === 'counter') {
    return withExtraGearRoll(
      {
        ...base,
        gold: Math.round(base.gold * 1.35),
        ascensionCells: Math.min(10, base.ascensionCells + 1),
        xpScrollStandard: base.xpScrollStandard + 1,
      },
      `${gearRollPrefix}.elite`,
    );
  }

  if (roomType === 'event') {
    return {
      ...base,
      gold: base.gold + 40,
      xpScrollMinor: base.xpScrollMinor + 1,
    };
  }

  if (roomType === 'treasure') {
    return withExtraGearRoll(
      {
        ...base,
        gold: base.gold + 80,
      },
      `${gearRollPrefix}.cache`,
    );
  }

  if (roomType === 'rest') {
    return {
      ...base,
      gold: base.gold + 20,
      xpScrollMinor: base.xpScrollMinor + 1,
    };
  }

  if (roomType === 'merchant') {
    return {
      ...base,
      gold: base.gold + 110,
    };
  }

  if (roomType === 'anomaly') {
    return {
      ...base,
      gold: base.gold + 60,
      ascensionCells: Math.min(10, base.ascensionCells + 1),
      xpScrollStandard: base.xpScrollStandard + 1,
    };
  }

  if (roomType === 'gate') {
    return {
      ...base,
      gold: base.gold + 180,
      ascensionCells: Math.min(10, base.ascensionCells + 1),
      xpScrollStandard: base.xpScrollStandard + 1,
    };
  }

  return base;
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

const resolveProceduralStage = (
  seed: number,
  stage: number,
  classId: string,
  roomType: StageRoomType,
  roomNodeId?: string,
): ResolvedEncounter => {
  const encounter = resolveEncounterByStage(seed, stage, classId);
  const template = resolveEncounterTemplate(seed, stage, classId, roomType);
  const anomaly = resolveStageAnomaly(seed, stage, classId, roomType);
  return {
    encounterId: encounter.id,
    roomType,
    ...(roomNodeId !== undefined ? { roomNodeId } : {}),
    templateId: template.id,
    templateTags: template.tags,
    ...(anomaly ?? {}),
    enemies: resolveProceduralEnemies(stage, template, roomType),
    rewards: resolveProceduralRewards(stage, roomType),
  };
};

export const selectStage = (input: RunDirectorInput): StageSelection => {
  const stage = Math.trunc(input.stage);
  if (stage < MIN_STAGE || stage > MAX_STAGE) {
    throw new Error(`Invalid stage ${input.stage}. Stage must be between ${MIN_STAGE} and ${MAX_STAGE}.`);
  }

  const roomType = input.roomType ?? defaultRoomTypeForStage(stage);

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
    encounter: resolveProceduralStage(
      input.seed,
      stage,
      input.activeClassId,
      roomType,
      input.roomNodeId,
    ),
  };
};

export const RUN_DIRECTOR_PRIVATE = {
  hash,
  isBossStage,
  isCheckpointStage,
  defaultRoomTypeForStage,
  resolveEncounterTemplate,
  resolveStageAnomaly,
  resolveCounterBossId,
  resolveProceduralEnemies,
  resolveProceduralRewards,
};
