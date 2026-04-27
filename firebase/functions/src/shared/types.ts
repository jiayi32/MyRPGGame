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
  activeClassId: string;
  activeLineageId: string;
  /** Same-lineage next-tier evolution target the client computed at startRun.
   *  Server reads this directly on endRun to apply the unlock without a content lookup.
   *  null when the active class is already T1 (apex) and has no same-lineage upgrade. */
  evolutionTargetClassId: string | null;
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
  /** Persistent currencies — survive run loss/flee. */
  goldBank: number;
  xpScrolls: XpScrollPouch;
  ascensionCells: number;
  /** Per-lineage rank, 0..10, +1 per completed run (won/lost). */
  lineageRanks: Record<string, number>;
  /** Per-class mastery rank, 0..10, spent from currencies via upgradeClass. */
  classRanks: Record<string, number>;
  /** Class IDs the player has unlocked. New profiles start with the canonical T5 starter. */
  ownedClassIds: string[];
  /** ID of an in-progress run, or null. Set by startRun, cleared by endRun. */
  currentRunId: string | null;
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
    xpScrolls: XpScrollPouch;
    ownedClassIds: string[];
    lineageRanks: Record<string, number>;
    classRanks: Record<string, number>;
  };
  /** Number of gear instance docs the server created in this settle. */
  gearInstancesCreated: number;
}

export interface EndRunResponse {
  settled: boolean;
  bankedRewards: RewardBundle;
  progression: ProgressionDelta;
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
  player: Pick<PlayerDoc, 'uid' | 'goldBank' | 'xpScrolls' | 'ascensionCells' | 'lineageRanks' | 'classRanks' | 'ownedClassIds' | 'currentRunId'>;
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
  player: Pick<PlayerDoc, 'uid' | 'goldBank' | 'xpScrolls' | 'ascensionCells' | 'lineageRanks' | 'classRanks' | 'ownedClassIds' | 'currentRunId'>;
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
  xpScrollMinor?: number;
  xpScrollStandard?: number;
  xpScrollGrand?: number;
}

export interface DevSetCurrenciesResponse {
  ok: boolean;
  goldBank: number;
  ascensionCells: number;
  xpScrolls: XpScrollPouch;
}
