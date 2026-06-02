import type { Timestamp } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Reward primitives
// ---------------------------------------------------------------------------

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

export const EMPTY_REWARD: RewardBundle = {
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
  activeLineageId: string;
  /** Same-lineage next-tier evolution target the client computed at startRun.
   *  Server reads this directly on endRun to apply the unlock without a content lookup.
   *  null when the active class is already T1 (apex) and has no same-lineage upgrade. */
  evolutionTargetClassId: string | null;
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
  goldBank: number;
  xpScrolls: XpScrollPouch;
  ascensionCells: number;
  sigilShards: number;
  lineageRanks: Record<string, number>;
  classRanks: Record<string, number>;
  ownedClassIds: string[];
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
  /** All permanently unlocked specialization IDs. */
  unlockedSpecIds?: string[];
  /** Corporation mastery ranks (0-10 per corp). */
  corpRanks?: Record<string, number>;
  /** Standard credits. */
  credits?: number;
  /** Premium currency for specialization unlocks (like Orna's Orns). */
  techPoints?: number;
  /** Dismantling materials. */
  scrap?: number;
  /** Rare crafting components. */
  quantumCores?: number;
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
  activeLineageId: string;
  /** null when the active class is T1 (apex) and has no same-lineage upgrade. */
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
  awardedAscensionCells: number;
  lineageRankDelta: number;
  newlyUnlockedClassIds: string[];
  /** Snapshot of player totals AFTER settle, so the client doesn't need a second read. */
  playerTotals: {
    goldBank: number;
    ascensionCells: number;
    sigilShards: number;
    xpScrolls: XpScrollPouch;
    ownedClassIds: string[];
    lineageRanks: Record<string, number>;
    classRanks: Record<string, number>;
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
    ascensionCells: number;
    lineageRankDelta: number;
    newlyUnlockedClassIds: string[];
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
  player: Pick<PlayerDoc, 'uid' | 'goldBank' | 'xpScrolls' | 'ascensionCells' | 'sigilShards' | 'lineageRanks' | 'classRanks' | 'ownedClassIds' | 'currentRunId'>;
}

export type XpScrollKind = keyof XpScrollPouch;

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
    xpScrollKind: XpScrollKind;
    xpScrollCost: number;
  };
  player: Pick<PlayerDoc, 'uid' | 'goldBank' | 'xpScrolls' | 'ascensionCells' | 'sigilShards' | 'lineageRanks' | 'classRanks' | 'ownedClassIds' | 'currentRunId'>;
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
  ownedClassIds: string[];
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
