import type {
  BossId,
  ClassId,
  EncounterId,
  EnemyArchetypeId,
  LineageId,
} from '../../content/types';

export type RunResult = 'won' | 'lost' | 'fled';

export interface RewardBundle {
  gold: number;
  ascensionCells: number;
  xpScrollMinor: number;
  xpScrollStandard: number;
  xpScrollGrand: number;
  gearIds: readonly string[];
}

export const EMPTY_REWARD_BUNDLE: RewardBundle = {
  gold: 0,
  ascensionCells: 0,
  xpScrollMinor: 0,
  xpScrollStandard: 0,
  xpScrollGrand: 0,
  gearIds: [],
};

export interface EncounterEnemyEntry {
  archetypeId: EnemyArchetypeId;
  count: number;
  tier: 1 | 2 | 3 | 4;
}

export interface ResolvedEncounter {
  encounterId: EncounterId;
  enemies: readonly EncounterEnemyEntry[];
  rewards: RewardBundle;
}

export interface RunDirectorInput {
  seed: number;
  stage: number;
  activeClassId: ClassId;
  activeLineageId: LineageId;
}

export interface StageSelection {
  stage: number;
  isCheckpoint: boolean;
  kind: 'procedural' | 'boss';
  encounter?: ResolvedEncounter;
  bossId?: BossId;
}

export interface ProgressionPlayerState {
  ownedClassIds: readonly ClassId[];
  lineageRanks: Readonly<Record<LineageId, number>>;
  ascensionCells: number;
}

export interface ProgressionInput {
  playerState: ProgressionPlayerState;
  activeClassId: ClassId;
  stageCompleted: number;
  runResult: RunResult;
  requestedEvolutionTargetClassId?: ClassId;
  allowCrossLineageEvolution?: boolean;
}

export interface ProgressionResult {
  playerState: ProgressionPlayerState;
  lineageRankDelta: number;
  awardedAscensionCells: number;
  newlyUnlockedClassIds: readonly ClassId[];
  rejectedEvolutionTargetClassId?: ClassId;
  rejectionReason?: 'cross_lineage_locked' | 'invalid_target';
}

export interface RewardLedger {
  banked: RewardBundle;
  vaulted: RewardBundle;
}

export interface StageRewardSplit {
  baseline: RewardBundle;
  vaulted: RewardBundle;
}
