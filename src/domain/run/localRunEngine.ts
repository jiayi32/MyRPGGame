// ─── Local Run Engine ─────────────────────────────────────────────
// Local-first run lifecycle — no server round-trips for validation.
// Seeds are generated locally. Stage outcomes are applied locally.
// Firebase is only used for cross-device player profile sync at end of run.

import type { ClassId, RiskContractId } from '../../content/types';
import {
  EMPTY_REWARD_BUNDLE,
  type RewardBundle,
  type RunSnapshot,
  type StageOutcomeResult,
  type XpScrollPouch,
} from '../../features/run/types';
import { createRunMapGraph } from '../../domain/run/map';
import { isCheckpointStage } from '../../domain/run/checkpoint';

// ─── Seeded Hash ──────────────────────────────────────────────────

const hashString = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
};

// ─── Run Lifecycle ─────────────────────────────────────────────────

export interface LocalStartRunInput {
  activeClassId: ClassId;
  activeLineageId: string;
  selectedRiskContractIds: RiskContractId[];
}

export interface LocalStartRunOutput {
  runId: string;
  seed: number;
  snapshot: RunSnapshot;
}

/** Start a new run locally — no server call. Seed derived from timestamp + class + random. */
export const startRunLocal = (input: LocalStartRunInput): LocalStartRunOutput => {
  const ts = Date.now();
  const runId = `local_${ts}_${Math.random().toString(36).slice(2, 8)}`;
  const seed = hashString(`${runId}_${input.activeClassId}_${ts}`);

  const mapGraph = createRunMapGraph(seed, 30);

  const snapshot: RunSnapshot = {
    id: runId,
    seed,
    stage: 0,
    activeClassId: input.activeClassId,
    activeLineageId: input.activeLineageId,
    evolutionTargetClassId: null,
    selectedRiskContractIds: input.selectedRiskContractIds,
    runPassiveIds: [],
    draftedSkillIds: [],
    augmentIds: [],
    bankedRewards: { ...EMPTY_REWARD_BUNDLE },
    vaultedRewards: { ...EMPTY_REWARD_BUNDLE },
    riskMeter: 0,
    totalRewards: { ...EMPTY_REWARD_BUNDLE },
    vaultStreak: 0,
    result: 'ongoing',
    currentMapGraph: mapGraph,
    mapPathByStage: {},
    augmentsPicked: 0,
  };

  return { runId, seed, snapshot };
};

export interface LocalSubmitStageInput {
  stageIndex: number;
  result: StageOutcomeResult;
  rewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
}

export interface LocalSubmitStageOutput {
  isCheckpoint: boolean;
  /** Next stage number or -1 if run ended. */
  nextStage: number;
  /** Whether the run reached a terminal state. */
  runEnded: boolean;
  /** Final result if run ended. */
  finalResult: StageOutcomeResult | null;
}

/** Submit a stage outcome locally. Returns progression info. */
export const submitStageOutcomeLocal = (
  currentSnapshot: RunSnapshot,
  input: LocalSubmitStageInput,
): { snapshot: RunSnapshot; output: LocalSubmitStageOutput } => {
  const isCheckpoint = isCheckpointStage(input.stageIndex);
  const nextStage = input.stageIndex + 1;

  // Determine if run ended
  const won = nextStage > 30;
  const lost = input.result === 'lost';
  const runEnded = won || lost;
  const finalResult: StageOutcomeResult | null = won ? 'won' : lost ? 'lost' : null;

  // Accumulate total rewards for risk meter
  const totalRewards: RewardBundle = {
    gold: currentSnapshot.totalRewards.gold + input.rewards.gold,
    ascensionCells: currentSnapshot.totalRewards.ascensionCells + input.rewards.ascensionCells,
    sigilShards: currentSnapshot.totalRewards.sigilShards + input.rewards.sigilShards,
    xpScrollMinor: currentSnapshot.totalRewards.xpScrollMinor + input.rewards.xpScrollMinor,
    xpScrollStandard: currentSnapshot.totalRewards.xpScrollStandard + input.rewards.xpScrollStandard,
    xpScrollGrand: currentSnapshot.totalRewards.xpScrollGrand + input.rewards.xpScrollGrand,
    gearIds: [...currentSnapshot.totalRewards.gearIds, ...input.rewards.gearIds],
  };

  // Keep banked rewards safe; vaulted tracks risk
  const bankedRewards: RewardBundle = input.result === 'won'
    ? {
        gold: currentSnapshot.bankedRewards.gold + input.rewards.gold,
        ascensionCells: currentSnapshot.bankedRewards.ascensionCells + input.rewards.ascensionCells,
        sigilShards: currentSnapshot.bankedRewards.sigilShards + input.rewards.sigilShards,
        xpScrollMinor: currentSnapshot.bankedRewards.xpScrollMinor + input.rewards.xpScrollMinor,
        xpScrollStandard: currentSnapshot.bankedRewards.xpScrollStandard + input.rewards.xpScrollStandard,
        xpScrollGrand: currentSnapshot.bankedRewards.xpScrollGrand + input.rewards.xpScrollGrand,
        gearIds: [...currentSnapshot.bankedRewards.gearIds, ...input.rewards.gearIds],
      }
    : currentSnapshot.bankedRewards;

  const updatedSnapshot: RunSnapshot = {
    ...currentSnapshot,
    stage: nextStage,
    result: runEnded ? (finalResult as RunSnapshot['result']) : 'ongoing',
    totalRewards,
    bankedRewards,
    vaultStreak: input.result === 'won' ? currentSnapshot.vaultStreak + 1 : currentSnapshot.vaultStreak,
  };

  return {
    snapshot: updatedSnapshot,
    output: { isCheckpoint, nextStage, runEnded, finalResult },
  };
};

export interface LocalEndRunOutput {
  totalGoldKept: number;
  totalCellsKept: number;
  xpGained: XpScrollPouch;
  riskMeterAtEnd: number;
  totalGearKept: string[];
}

/** End a run locally. Apply risk meter to determine kept rewards. */
export const endRunLocal = (
  snapshot: RunSnapshot,
  finalResult: StageOutcomeResult,
): LocalEndRunOutput => {
  const { riskMeter, totalRewards } = snapshot;

  // Won: keep 100%. Fled/Lost: keep (100 - riskMeter)% of total
  const keepRatio = finalResult === 'won' ? 1.0 : Math.max(0, (100 - riskMeter) / 100);

  return {
    totalGoldKept: Math.round(totalRewards.gold * keepRatio),
    totalCellsKept: Math.round(totalRewards.ascensionCells * keepRatio),
    xpGained: {
      minor: Math.round(totalRewards.xpScrollMinor * keepRatio),
      standard: Math.round(totalRewards.xpScrollStandard * keepRatio),
      grand: Math.round(totalRewards.xpScrollGrand * keepRatio),
    },
    riskMeterAtEnd: riskMeter,
    totalGearKept: totalRewards.gearIds,
  };
};
