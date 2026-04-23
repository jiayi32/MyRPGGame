export interface RewardBundle {
  gold: number;
  ascensionCells: number;
  xpScrollMinor: number;
  xpScrollStandard: number;
  xpScrollGrand: number;
  gearIds: string[];
}

export const EMPTY_REWARD_BUNDLE: RewardBundle = {
  gold: 0,
  ascensionCells: 0,
  xpScrollMinor: 0,
  xpScrollStandard: 0,
  xpScrollGrand: 0,
  gearIds: [],
};

export type StageOutcomeResult = 'won' | 'lost' | 'fled';

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
  result: StageOutcomeResult;
  rewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
}

export interface SubmitStageOutcomeResponse {
  committed: boolean;
  nextStage: number;
}

export interface EndRunPayload {
  runId: string;
  finalResult: StageOutcomeResult;
}

export interface EndRunResponse {
  settled: boolean;
  bankedRewards: RewardBundle;
}

export type RunFinalResult = 'ongoing' | 'won' | 'lost';

export interface RunSnapshot {
  id: string;
  playerId: string;
  seed: number;
  stage: number;
  turn: number;
  activeClassId: string;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  result: RunFinalResult;
}
