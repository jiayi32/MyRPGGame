import type { RewardBundle } from './types';
import { EMPTY_REWARD } from './types';

/** Add two RewardBundles together, concatenating gearIds. */
export function addRewards(a: RewardBundle, b: RewardBundle): RewardBundle {
  return {
    gold: a.gold + b.gold,
    ascensionCells: a.ascensionCells + b.ascensionCells,
    xpScrollMinor: a.xpScrollMinor + b.xpScrollMinor,
    xpScrollStandard: a.xpScrollStandard + b.xpScrollStandard,
    xpScrollGrand: a.xpScrollGrand + b.xpScrollGrand,
    gearIds: [...a.gearIds, ...b.gearIds],
  };
}

/** Returns a copy of a RewardBundle (for Firestore writes). */
export function copyReward(r: RewardBundle): RewardBundle {
  return { ...r, gearIds: [...r.gearIds] };
}

/** Returns an empty RewardBundle. */
export function emptyReward(): RewardBundle {
  return { ...EMPTY_REWARD, gearIds: [] };
}

/**
 * Settle vaulted rewards into banked on successful bank or run-won.
 * Returns new banked with vault merged in, and empty vault.
 */
export function mergeVaultIntoBank(
  banked: RewardBundle,
  vaulted: RewardBundle
): { banked: RewardBundle; vaulted: RewardBundle } {
  return {
    banked: addRewards(banked, vaulted),
    vaulted: emptyReward(),
  };
}

/**
 * Settle on flee or loss: banked stays, vault is forfeited.
 */
export function forfeitVault(banked: RewardBundle): {
  banked: RewardBundle;
  vaulted: RewardBundle;
} {
  return {
    banked: copyReward(banked),
    vaulted: emptyReward(),
  };
}

/**
 * Split incoming stage rewards into baseline (always banked) and vaulted
 * (at-risk). Baseline is a fixed 30% floor; remaining 70% is vaulted.
 * All values are integer-floored.
 */
export function splitRewards(rewards: RewardBundle): {
  baseline: RewardBundle;
  vaulted: RewardBundle;
} {
  const floor = (n: number) => Math.floor(n * 0.3);
  const ceil = (n: number) => n - Math.floor(n * 0.3);
  return {
    baseline: {
      gold: floor(rewards.gold),
      ascensionCells: floor(rewards.ascensionCells),
      xpScrollMinor: floor(rewards.xpScrollMinor),
      xpScrollStandard: floor(rewards.xpScrollStandard),
      xpScrollGrand: floor(rewards.xpScrollGrand),
      gearIds: [],  // gear always vaulted
    },
    vaulted: {
      gold: ceil(rewards.gold),
      ascensionCells: ceil(rewards.ascensionCells),
      xpScrollMinor: ceil(rewards.xpScrollMinor),
      xpScrollStandard: ceil(rewards.xpScrollStandard),
      xpScrollGrand: ceil(rewards.xpScrollGrand),
      gearIds: [...rewards.gearIds],
    },
  };
}
