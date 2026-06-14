import type {
  AnomalyCategoryKind,
  AnomalyId,
  BossId,
  ClassId,
  EncounterId,
  EnemyArchetypeId,
  LineageId,
} from '../../content/types';

export type RunResult = 'won' | 'lost' | 'fled';

export interface RewardBundle {
  credits: number;
  quantumCores: number;
  dataCacheMinor: number;
  dataCacheStandard: number;
  dataCacheGrand: number;
  gearIds: readonly string[];
}

export const EMPTY_REWARD_BUNDLE: RewardBundle = {
  credits: 0,
  quantumCores: 0,
  dataCacheMinor: 0,
  dataCacheStandard: 0,
  dataCacheGrand: 0,
  gearIds: [],
};

export interface EncounterEnemyEntry {
  archetypeId: EnemyArchetypeId;
  count: number;
  tier: 1 | 2 | 3 | 4;
}

export type StageRoomType =
  | 'normal'
  | 'elite'
  | 'event'
  | 'treasure'
  | 'rest'
  | 'merchant'
  | 'anomaly'
  | 'mini_boss'
  | 'gate'
  | 'counter';

export interface ResolvedEncounter {
  encounterId: EncounterId;
  roomType: StageRoomType;
  roomNodeId?: string;
  templateId: string;
  templateTags: readonly string[];
  anomalyId?: AnomalyId;
  anomalyKind?: AnomalyCategoryKind;
  enemies: readonly EncounterEnemyEntry[];
  rewards: RewardBundle;
}

export interface RunDirectorInput {
  seed: number;
  stage: number;
  activeClassId: ClassId;
  activeCorpId: LineageId;
  roomType?: StageRoomType;
  roomNodeId?: string;
}

export interface StageSelection {
  stage: number;
  isCheckpoint: boolean;
  kind: 'procedural' | 'boss';
  encounter?: ResolvedEncounter;
  bossId?: BossId;
}

export interface ProgressionPlayerState {
  unlockedSpecIds: readonly ClassId[];
  corpRanks: Readonly<Record<LineageId, number>>;
  quantumCores: number;
}

export interface ProgressionInput {
  playerState: ProgressionPlayerState;
  activeClassId: ClassId;
  stageCompleted: number;
  runResult: RunResult;
  requestedEvolutionTargetClassId?: ClassId;
  allowCrossCorpEvolution?: boolean;
}

export interface ProgressionResult {
  playerState: ProgressionPlayerState;
  corpRankDelta: number;
  awardedQuantumCores: number;
  newlyUnlockedSpecIds: readonly ClassId[];
  rejectedEvolutionTargetClassId?: ClassId;
  rejectionReason?: 'cross_corp_locked' | 'invalid_target';
}

export interface RewardLedger {
  banked: RewardBundle;
  vaulted: RewardBundle;
}

export interface StageRewardSplit {
  baseline: RewardBundle;
  vaulted: RewardBundle;
}
