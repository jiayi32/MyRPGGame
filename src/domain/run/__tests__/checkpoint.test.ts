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
      gold: 101,
      ascensionCells: 5,
      xpScrollMinor: 3,
      xpScrollStandard: 2,
      xpScrollGrand: 1,
      gearIds: ['a', 'b', 'c'],
    });

    expect(split.baseline.gold).toBe(50);
    expect(split.vaulted.gold).toBe(51);
    expect(split.baseline.gearIds).toEqual(['a', 'c']);
    expect(split.vaulted.gearIds).toEqual(['b']);
  });

  it('applies stage rewards and then banks vaulted rewards on checkpoint', () => {
    const start: RewardLedger = {
      banked: EMPTY_REWARD_BUNDLE,
      vaulted: EMPTY_REWARD_BUNDLE,
    };

    const afterStage = applyStageRewards(start, {
      gold: 100,
      ascensionCells: 2,
      xpScrollMinor: 0,
      xpScrollStandard: 1,
      xpScrollGrand: 0,
      gearIds: ['x1', 'x2'],
    });
    const settled = settleCheckpoint(afterStage, 10);

    expect(isCheckpointStage(10)).toBe(true);
    expect(settled.banked.gold).toBe(100);
    expect(settled.vaulted.gold).toBe(0);
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
