export interface RewardBundle {
  credits: number;
  quantumCores: number;
  scrap: number;
  dataCacheMinor: number;
  dataCacheStandard: number;
  dataCacheGrand: number;
  gearIds: string[];
}

export const EMPTY_REWARD_BUNDLE: RewardBundle = {
  credits: 0,
  quantumCores: 0,
  scrap: 0,
  dataCacheMinor: 0,
  dataCacheStandard: 0,
  dataCacheGrand: 0,
  gearIds: [],
};

export interface DataCachePouch {
  minor: number;
  standard: number;
  grand: number;
}

export const EMPTY_DATA_CACHES: DataCachePouch = {
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
  selectedRiskContractIds: string[];
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
  awardedQuantumCores: number;
  corpRankDelta: number;
  newlyUnlockedSpecIds: string[];
  playerTotals: {
    credits: number;
    quantumCores: number;
    scrap: number;
    dataCaches: DataCachePouch;
    unlockedSpecIds: string[];
    corpRanks: Record<string, number>;
    specRanks: Record<string, number>;
  };
  gearInstancesCreated: number;
  /** Total augments picked across all runs after this settlement. */
  augmentsPicked?: number;
}

export type VaultSettlementDisposition = 'merged' | 'forfeited';

export interface EndRunSettlementLedger {
  finalResult: StageOutcomeResult;
  preSettleBanked: RewardBundle;
  preSettleVaulted: RewardBundle;
  vaultDisposition: VaultSettlementDisposition;
  vaultedTransferredToBank: RewardBundle;
  vaultForfeited: RewardBundle;
  postSettleBanked: RewardBundle;
  progressionAwarded: {
    quantumCores: number;
    corpRankDelta: number;
    newlyUnlockedSpecIds: string[];
  };
}

export interface EndRunResponse {
  settled: boolean;
  bankedRewards: RewardBundle;
  progression: ProgressionDelta;
  settlementLedger: EndRunSettlementLedger;
}

export type RunFinalResult = 'ongoing' | 'won' | 'lost';

export interface RunSnapshot {
  id: string;
  playerId?: string;
  seed: number;
  stage: number;
  turn?: number;
  vaultStreak: number;
  activeClassId: string;
  activeLineageId: string;
  evolutionTargetClassId: string | null;
  selectedRiskContractIds: string[];
  runPassiveIds: string[];
  draftedSkillIds?: string[];
  augmentIds: string[];
  pendingInnDecisionId?: string | null;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  /** Local: risk meter (0-100) for push-your-luck mechanic. */
  riskMeter?: number;
  /** Local: accumulated rewards before risk deduction. */
  totalRewards?: RewardBundle;
  /** Local: run map graph for current run. */
  currentMapGraph?: any;
  /** Local: chosen nodes per stage. */
  mapPathByStage?: Record<number, string>;
  /** Local: total augments picked by player (for tier unlocks). */
  augmentsPicked?: number;
  result: RunFinalResult;
}

export interface PlayerSnapshot {
  uid: string;
  credits: number;
  dataCaches: DataCachePouch;
  quantumCores: number;
  scrap: number;
  corpRanks: Record<string, number>;
  specRanks: Record<string, number>;
  unlockedSpecIds: string[];
  currentRunId: string | null;
  /** Total augments picked across all runs. Drives tier unlocks (Bronze→Silver→Gold→Prismatic). */
  augmentsPicked: number;
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
  unlockedSpecIds: string[];
}

export interface DevResetPlayerResponse {
  ok: boolean;
  runsDeleted: number;
  gearDeleted: number;
}

export interface DevSetCurrenciesPayload {
  credits?: number;
  quantumCores?: number;
  scrap?: number;
  dataCacheMinor?: number;
  dataCacheStandard?: number;
  dataCacheGrand?: number;
}

export interface DevSetCurrenciesResponse {
  ok: boolean;
  credits: number;
  quantumCores: number;
  scrap: number;
  dataCaches: DataCachePouch;
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
    quantumCores: number;
    dataCacheKind: keyof DataCachePouch;
    dataCacheCost: number;
  };
  player: PlayerSnapshot;
}
