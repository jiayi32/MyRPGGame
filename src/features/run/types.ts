export interface RewardBundle {
  gold: number;
  ascensionCells: number;
  /** Rare drop from stage-5 mini-boss and stage-10 gate boss only. Used for cross-lineage unlocks. */
  sigilShards: number;
  xpScrollMinor: number;
  xpScrollStandard: number;
  xpScrollGrand: number;
  gearIds: string[];
}

export const EMPTY_REWARD_BUNDLE: RewardBundle = {
  gold: 0,
  ascensionCells: 0,
  sigilShards: 0,
  xpScrollMinor: 0,
  xpScrollStandard: 0,
  xpScrollGrand: 0,
  gearIds: [],
};

export interface XpScrollPouch {
  minor: number;
  standard: number;
  grand: number;
}

export const EMPTY_XP_SCROLLS: XpScrollPouch = {
  minor: 0,
  standard: 0,
  grand: 0,
};

export type StageOutcomeResult = 'won' | 'lost' | 'fled';

export interface StartRunPayload {
  activeClassId: string;
  activeLineageId: string;
  /** null when the active class is T1 (apex). */
  evolutionTargetClassId: string | null;
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

export interface BankCheckpointPayload {
  runId: string;
}

export interface BankCheckpointResponse {
  banked: RewardBundle;
}

export interface EndRunPayload {
  runId: string;
  finalResult: StageOutcomeResult;
}

export interface ProgressionDelta {
  awardedAscensionCells: number;
  lineageRankDelta: number;
  newlyUnlockedClassIds: string[];
  playerTotals: {
    goldBank: number;
    ascensionCells: number;
    sigilShards: number;
    xpScrolls: XpScrollPouch;
    ownedClassIds: string[];
    lineageRanks: Record<string, number>;
    classRanks: Record<string, number>;
  };
  gearInstancesCreated: number;
}

export interface EndRunResponse {
  settled: boolean;
  bankedRewards: RewardBundle;
  progression: ProgressionDelta;
}

export type RunFinalResult = 'ongoing' | 'won' | 'lost';

export interface RunSnapshot {
  id: string;
  playerId: string;
  seed: number;
  stage: number;
  turn: number;
  vaultStreak: number;
  activeClassId: string;
  activeLineageId: string;
  evolutionTargetClassId: string | null;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  result: RunFinalResult;
}

export interface PlayerSnapshot {
  uid: string;
  goldBank: number;
  xpScrolls: XpScrollPouch;
  ascensionCells: number;
  sigilShards: number;
  lineageRanks: Record<string, number>;
  classRanks: Record<string, number>;
  ownedClassIds: string[];
  currentRunId: string | null;
}

export interface GetOrCreatePlayerResponse {
  player: PlayerSnapshot;
  created: boolean;
}

// ---------------------------------------------------------------------------
// Dev tooling response shapes (mirror firebase/functions/src/shared/types.ts)
// ---------------------------------------------------------------------------

export interface DevSkipStageResponse {
  ok: boolean;
  newStage: number;
}

export interface DevGrantAllClassesResponse {
  ok: boolean;
  ownedClassIds: string[];
}

export interface DevResetPlayerResponse {
  ok: boolean;
  runsDeleted: number;
  gearDeleted: number;
}

export interface DevSetCurrenciesPayload {
  goldBank?: number;
  ascensionCells?: number;
  sigilShards?: number;
  xpScrollMinor?: number;
  xpScrollStandard?: number;
  xpScrollGrand?: number;
}

export interface DevSetCurrenciesResponse {
  ok: boolean;
  goldBank: number;
  ascensionCells: number;
  sigilShards: number;
  xpScrolls: XpScrollPouch;
}

export interface ShopOffer {
  templateId: string;
  priceGold: number;
}

export interface GetShopOfferResponse {
  offers: ShopOffer[];
}

export interface BuyGearPayload {
  templateId: string;
}

export interface BuyGearResponse {
  ok: boolean;
  purchasedInstanceId: string;
  templateId: string;
  goldSpent: number;
  player: PlayerSnapshot;
}

export interface UpgradeClassPayload {
  classId: string;
}

export interface UpgradeClassResponse {
  ok: boolean;
  classId: string;
  newRank: number;
  costs: {
    gold: number;
    ascensionCells: number;
    xpScrollKind: keyof XpScrollPouch;
    xpScrollCost: number;
  };
  player: PlayerSnapshot;
}
