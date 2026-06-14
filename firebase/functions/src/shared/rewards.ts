import type { RewardBundle } from './types';
import { EMPTY_REWARD } from './types';

/** Add two RewardBundles together, concatenating gearIds. */
export function addRewards(a: RewardBundle, b: RewardBundle): RewardBundle {
  return {
    credits: a.credits + b.credits,
    quantumCores: a.quantumCores + b.quantumCores,
    scrap: a.scrap + b.scrap,
    dataCacheMinor: a.dataCacheMinor + b.dataCacheMinor,
    dataCacheStandard: a.dataCacheStandard + b.dataCacheStandard,
    dataCacheGrand: a.dataCacheGrand + b.dataCacheGrand,
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
      credits: floor(rewards.credits),
      quantumCores: floor(rewards.quantumCores),
      scrap: 0,
      dataCacheMinor: floor(rewards.dataCacheMinor),
      dataCacheStandard: floor(rewards.dataCacheStandard),
      dataCacheGrand: floor(rewards.dataCacheGrand),
      gearIds: [],  // gear always vaulted
    },
    vaulted: {
      credits: ceil(rewards.credits),
      quantumCores: ceil(rewards.quantumCores),
      scrap: rewards.scrap,
      dataCacheMinor: ceil(rewards.dataCacheMinor),
      dataCacheStandard: ceil(rewards.dataCacheStandard),
      dataCacheGrand: ceil(rewards.dataCacheGrand),
      gearIds: [...rewards.gearIds],
    },
  };
}

/**
 * Multiplies only numeric vaulted reward fields by a scalar, flooring each
 * value. Gear count is not scaled.
 */
export function applyVaultMultiplier(
  vaulted: RewardBundle,
  multiplier: number
): RewardBundle {
  const m = Number.isFinite(multiplier) ? Math.max(1, multiplier) : 1;
  const scaled = (n: number) => Math.floor(n * m);
  return {
    credits: scaled(vaulted.credits),
    quantumCores: scaled(vaulted.quantumCores),
    scrap: scaled(vaulted.scrap),
    dataCacheMinor: scaled(vaulted.dataCacheMinor),
    dataCacheStandard: scaled(vaulted.dataCacheStandard),
    dataCacheGrand: scaled(vaulted.dataCacheGrand),
    gearIds: [...vaulted.gearIds],
  };
}
