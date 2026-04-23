import type { Timestamp } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Reward primitives
// ---------------------------------------------------------------------------

export interface RewardBundle {
  gold: number;
  ascensionCells: number;
  xpScrollMinor: number;
  xpScrollStandard: number;
  xpScrollGrand: number;
  gearIds: string[];
}

export const EMPTY_REWARD: RewardBundle = {
  gold: 0,
  ascensionCells: 0,
  xpScrollMinor: 0,
  xpScrollStandard: 0,
  xpScrollGrand: 0,
  gearIds: [],
};

// ---------------------------------------------------------------------------
// Firestore document shapes (authoritative per §5 of INTEGRATION_REPORT.md)
// ---------------------------------------------------------------------------

export interface RunDoc {
  playerId: string;
  seed: number;
  stage: number;
  turn: number;
  activeClassId: string;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  result?: 'ongoing' | 'won' | 'lost';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StageOutcomeDoc {
  playerId: string;
  runId: string;
  stageIndex: number;      // 1..30
  result: 'won' | 'lost' | 'fled';
  rewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
  clientSubmittedAt: Timestamp;
  serverCommittedAt: Timestamp;
}

export interface PlayerDoc {
  uid: string;
  ascensionCells: number;
  lineageRanks: Record<string, number>;
  ownedClassIds: string[];
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Callable payload and response contracts
// ---------------------------------------------------------------------------

export interface StartRunPayload {
  activeClassId: string;
}

export interface StartRunResponse {
  runId: string;
  seed: number;
  activeClassId: string;
}

export interface SubmitStageOutcomePayload {
  runId: string;
  stageIndex: number;
  result: 'won' | 'lost' | 'fled';
  rewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
}

export interface SubmitStageOutcomeResponse {
  committed: boolean;
  nextStage: number;
}

export interface BankCheckpointPayload {
  runId: string;
}

export interface BankCheckpointResponse {
  banked: RewardBundle;
}

export interface EndRunPayload {
  runId: string;
  finalResult: 'won' | 'lost' | 'fled';
}

export interface EndRunResponse {
  settled: boolean;
  bankedRewards: RewardBundle;
}
