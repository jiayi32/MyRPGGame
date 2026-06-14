import {
  applyStageRewards,
  bankVaultedRewards,
  isCheckpointStage,
  settleCheckpoint,
  splitStageRewards,
} from '../checkpoint';
import { EMPTY_REWARD_BUNDLE, type RewardLedger } from '../types';

describe('checkpoint engine', () => {
  it('splits rewards into baseline and vaulted buckets', () => {
    const split = splitStageRewards({
      credits: 101,
      quantumCores: 5,
      dataCacheMinor: 3,
      dataCacheStandard: 2,
      dataCacheGrand: 1,
      gearIds: ['a', 'b', 'c'],
    });

    expect(split.baseline.credits).toBe(50);
    expect(split.vaulted.credits).toBe(51);
    expect(split.baseline.gearIds).toEqual(['a', 'c']);
    expect(split.vaulted.gearIds).toEqual(['b']);
  });

  it('applies stage rewards and then banks vaulted rewards on checkpoint', () => {
    const start: RewardLedger = {
      banked: EMPTY_REWARD_BUNDLE,
      vaulted: EMPTY_REWARD_BUNDLE,
    };

    const afterStage = applyStageRewards(start, {
      credits: 100,
      quantumCores: 2,
      dataCacheMinor: 0,
      dataCacheStandard: 1,
      dataCacheGrand: 0,
      gearIds: ['x1', 'x2'],
    });
    const settled = settleCheckpoint(afterStage, 10);

    expect(isCheckpointStage(10)).toBe(true);
    expect(settled.banked.credits).toBe(100);
    expect(settled.vaulted.credits).toBe(0);
    expect(settled.banked.gearIds).toEqual(expect.arrayContaining(['x1', 'x2']));
  });

  it('keeps rewards unchanged when banking empty vault', () => {
    const start: RewardLedger = {
      banked: EMPTY_REWARD_BUNDLE,
      vaulted: EMPTY_REWARD_BUNDLE,
    };

    const next = bankVaultedRewards(start);
    expect(next).toEqual(start);
  });
});
