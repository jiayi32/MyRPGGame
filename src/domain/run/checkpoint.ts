import { EMPTY_REWARD_BUNDLE } from './types';
import type { RewardBundle, RewardLedger, StageRewardSplit } from './types';

const CHECKPOINT_STAGES = new Set<number>([10, 20, 30]);

const mergeRewards = (a: RewardBundle, b: RewardBundle): RewardBundle => ({
  gold: a.gold + b.gold,
  ascensionCells: a.ascensionCells + b.ascensionCells,
  xpScrollMinor: a.xpScrollMinor + b.xpScrollMinor,
  xpScrollStandard: a.xpScrollStandard + b.xpScrollStandard,
  xpScrollGrand: a.xpScrollGrand + b.xpScrollGrand,
  gearIds: [...a.gearIds, ...b.gearIds],
});

const splitGearIds = (gearIds: readonly string[]): { baseline: readonly string[]; vaulted: readonly string[] } => {
  const baseline: string[] = [];
  const vaulted: string[] = [];
  for (let i = 0; i < gearIds.length; i += 1) {
    const id = gearIds[i];
    if (id === undefined) continue;
    if (i % 2 === 0) baseline.push(id);
    else vaulted.push(id);
  }
  return { baseline, vaulted };
};

export const isCheckpointStage = (stage: number): boolean => CHECKPOINT_STAGES.has(Math.trunc(stage));

export const splitStageRewards = (
  rewards: RewardBundle,
  baselineRatio = 0.5,
): StageRewardSplit => {
  const ratio = Math.max(0, Math.min(1, baselineRatio));
  const baselineGold = Math.floor(rewards.gold * ratio);
  const baselineCells = Math.floor(rewards.ascensionCells * ratio);
  const baselineMinor = Math.floor(rewards.xpScrollMinor * ratio);
  const baselineStandard = Math.floor(rewards.xpScrollStandard * ratio);
  const baselineGrand = Math.floor(rewards.xpScrollGrand * ratio);
  const splitGear = splitGearIds(rewards.gearIds);

  const baseline: RewardBundle = {
    gold: baselineGold,
    ascensionCells: baselineCells,
    xpScrollMinor: baselineMinor,
    xpScrollStandard: baselineStandard,
    xpScrollGrand: baselineGrand,
    gearIds: splitGear.baseline,
  };

  const vaulted: RewardBundle = {
    gold: rewards.gold - baselineGold,
    ascensionCells: rewards.ascensionCells - baselineCells,
    xpScrollMinor: rewards.xpScrollMinor - baselineMinor,
    xpScrollStandard: rewards.xpScrollStandard - baselineStandard,
    xpScrollGrand: rewards.xpScrollGrand - baselineGrand,
    gearIds: splitGear.vaulted,
  };

  return { baseline, vaulted };
};

export const applyStageRewards = (
  ledger: RewardLedger,
  rewards: RewardBundle,
  baselineRatio = 0.5,
): RewardLedger => {
  const split = splitStageRewards(rewards, baselineRatio);
  return {
    banked: mergeRewards(ledger.banked, split.baseline),
    vaulted: mergeRewards(ledger.vaulted, split.vaulted),
  };
};

export const bankVaultedRewards = (ledger: RewardLedger): RewardLedger => {
  if (
    ledger.vaulted.gold === 0 &&
    ledger.vaulted.ascensionCells === 0 &&
    ledger.vaulted.xpScrollMinor === 0 &&
    ledger.vaulted.xpScrollStandard === 0 &&
    ledger.vaulted.xpScrollGrand === 0 &&
    ledger.vaulted.gearIds.length === 0
  ) {
    return ledger;
  }

  return {
    banked: mergeRewards(ledger.banked, ledger.vaulted),
    vaulted: EMPTY_REWARD_BUNDLE,
  };
};

export const settleCheckpoint = (ledger: RewardLedger, stage: number): RewardLedger => {
  if (!isCheckpointStage(stage)) return ledger;
  return bankVaultedRewards(ledger);
};
