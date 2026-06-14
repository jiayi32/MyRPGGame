import type { Timestamp } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Reward primitives
// ---------------------------------------------------------------------------

export interface RewardBundle {
  credits: number;
  quantumCores: number;
  /** Rare drop from stage-5 mini-boss and stage-10 gate boss only. Used for cross-lineage unlocks. */
  scrap: number;
  dataCacheMinor: number;
  dataCacheStandard: number;
  dataCacheGrand: number;
  gearIds: string[];
}

export const EMPTY_REWARD: RewardBundle = {
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

// ---------------------------------------------------------------------------
// Firestore document shapes (authoritative per §5 of INTEGRATION_REPORT.md)
// ---------------------------------------------------------------------------

export interface RunDoc {
  playerId: string;
  seed: number;
  stage: number;
  turn: number;
  /** Consecutive won stages without banking; drives vault reward multiplier. */
  vaultStreak: number;
  activeClassId: string;
  activeCorpId: string;
  /** Same-corp next-tier evolution target the client computed at startRun.
   *  Server reads this directly on endRun to apply the unlock without a content lookup.
   *  null when the active spec is already T1 (apex) and has no same-corp upgrade. */
  evolutionTargetSpecId: string | null;
  selectedRiskContractIds?: string[];
  runPassiveIds?: string[];
  augmentIds?: string[];
  pendingInnDecisionId?: string | null;
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
  /** Persistent currencies — survive encounter losses. */
  credits: number;
  dataCaches: DataCachePouch;
  quantumCores: number;
  scrap: number;
  corpRanks: Record<string, number>;
  specRanks: Record<string, number>;
  unlockedSpecIds: string[];
  currentRunId: string | null;
  augmentsPicked?: number;

  // ── Persistent World Fields (Phase D — June 2026) ──
  /** Display name. Default "Runner". */
  characterName?: string;
  /** Character level, 1-250. */
  level?: number;
  /** Total XP accumulated. */
  xp?: number;
  /** Currently active specialization ID (sci-fi class). */
  activeSpecId?: string | null;
  /** Premium currency for specialization unlocks (like Orna's Orns). */
  techPoints?: number;
  /** Currently equipped weapon instance ID. */
  equippedWeaponId?: string | null;
  /** Currently equipped armor instance ID. */
  equippedArmorId?: string | null;
  /** Currently equipped accessory instance IDs (max 2). */
  equippedAccessoryIds?: string[];
  /** All owned gear instance IDs. */
  inventoryIds?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Per-instance gear doc — stored at `players/{uid}/gear/{instanceId}`. */
export interface GearInstanceDoc {
  /** Template ID from src/content/gear.ts (e.g. 'gear.t1.armor.helm'). */
  templateId: string;
  /** runId that produced this instance, or null for starter/grant gear. */
  obtainedFromRunId: string | null;
  obtainedAt: Timestamp;
  /** True when currently equipped; written by client via EquipmentScreen. */
  equipped: boolean;
  /** Tempering level (0 = untempered). Each level adds 1.5% stat bonus. */
  temperLevel?: number;
  /** Timestamp of the last successful temper attempt. */
  lastTemperedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Callable payload and response contracts
// ---------------------------------------------------------------------------

export interface GetOrCreatePlayerPayload {
  // Empty — uid is taken from the authenticated request context.
}

export interface GetOrCreatePlayerResponse {
  player: PlayerDoc;
  /** True when this call created the doc (first ever sign-in for this uid). */
  created: boolean;
}

export interface StartRunPayload {
  activeClassId: string;
  activeCorpId: string;
  /** null when the active spec is T1 (apex) and has no same-corp upgrade. */
  evolutionTargetSpecId: string | null;
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

/** Progression deltas the server applied — surfaced so the client can show "+25 cells, +1 lineage rank". */
export interface ProgressionDelta {
  awardedQuantumCores: number;
  corpRankDelta: number;
  newlyUnlockedSpecIds: string[];
  /** Snapshot of player totals AFTER settle, so the client doesn't need a second read. */
  playerTotals: {
    credits: number;
    quantumCores: number;
    scrap: number;
    dataCaches: DataCachePouch;
    unlockedSpecIds: string[];
    corpRanks: Record<string, number>;
    specRanks: Record<string, number>;
  };
  /** Number of gear instance docs the server created in this settle. */
  gearInstancesCreated: number;
}

export type VaultSettlementDisposition = 'merged' | 'forfeited';

export interface EndRunSettlementLedger {
  finalResult: 'won' | 'lost' | 'fled';
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

export interface ShopOffer {
  templateId: string;
  priceGold: number;
}

export interface GetShopOfferPayload {
  // Empty.
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
  player: Pick<PlayerDoc, 'uid' | 'credits' | 'dataCaches' | 'quantumCores' | 'scrap' | 'corpRanks' | 'specRanks' | 'unlockedSpecIds' | 'currentRunId'>;
}

// ── Phase D: World Map Encounters ─────────────────────────────────

export interface SubmitEncounterPayload {
  spawnId: string;
  spawnType?: string;
  tier?: number;
  outcome?: string;
  xpGained?: number;
  creditsGained?: number;
  lootIds?: string[];
  hpRemaining?: number;
  elapsedSeconds?: number;
}

export interface SubmitEncounterResponse {
  committed: boolean;
  levelUps: number;
  newUnlocks: string[];
}

export type DataCacheKind = keyof DataCachePouch;

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
    dataCacheKind: DataCacheKind;
    dataCacheCost: number;
  };
  player: Pick<PlayerDoc, 'uid' | 'credits' | 'dataCaches' | 'quantumCores' | 'scrap' | 'corpRanks' | 'specRanks' | 'unlockedSpecIds' | 'currentRunId'>;
}

// ---------------------------------------------------------------------------
// Dev tooling callables (gated by ALLOW_DEV_TOOLS env flag)
// ---------------------------------------------------------------------------

export interface DevSkipStagePayload {
  runId: string;
  /** Target stage index, 1..30. Player still needs to submit stage outcomes from there. */
  targetStage: number;
}

export interface DevSkipStageResponse {
  ok: boolean;
  newStage: number;
}

export interface DevGrantAllClassesPayload {
  // Empty.
}

export interface DevGrantAllClassesResponse {
  ok: boolean;
  unlockedSpecIds: string[];
}

export interface DevResetPlayerPayload {
  // Empty.
}

export interface DevResetPlayerResponse {
  ok: boolean;
  /** Number of run docs deleted. */
  runsDeleted: number;
  /** Number of gear instances deleted. */
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
