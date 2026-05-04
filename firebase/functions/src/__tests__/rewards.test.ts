import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { applyVaultMultiplier, splitRewards } from '../shared/rewards.js';

describe('applyVaultMultiplier', () => {
  const base = {
    gold: 101,
    ascensionCells: 7,
    sigilShards: 0,
    xpScrollMinor: 5,
    xpScrollStandard: 3,
    xpScrollGrand: 2,
    gearIds: ['a', 'b'],
  };

  it('keeps values unchanged at 1.0x', () => {
    const out = applyVaultMultiplier(base, 1);
    assert.deepEqual(out, base);
  });

  it('floors scaled numeric values', () => {
    const out = applyVaultMultiplier(base, 1.2);
    assert.equal(out.gold, 121);
    assert.equal(out.ascensionCells, 8);
    assert.equal(out.xpScrollMinor, 6);
    assert.equal(out.xpScrollStandard, 3);
    assert.equal(out.xpScrollGrand, 2);
    assert.deepEqual(out.gearIds, ['a', 'b']);
  });

  it('clamps non-finite multipliers to 1.0x', () => {
    const out = applyVaultMultiplier(base, Number.NaN);
    assert.deepEqual(out, base);
  });

  it('does not allow multipliers below 1.0x', () => {
    const out = applyVaultMultiplier(base, 0.5);
    assert.deepEqual(out, base);
  });
});

describe('splitRewards + multiplier integration', () => {
  it('multiplies only the vaulted share and leaves baseline untouched', () => {
    const rewards = {
      gold: 100,
      ascensionCells: 10,
      sigilShards: 0,
      xpScrollMinor: 10,
      xpScrollStandard: 10,
      xpScrollGrand: 10,
      gearIds: ['g1'],
    };

    const { baseline, vaulted } = splitRewards(rewards);
    const boosted = applyVaultMultiplier(vaulted, 2);

    assert.equal(baseline.gold, 30);
    assert.equal(vaulted.gold, 70);
    assert.equal(boosted.gold, 140);
    assert.equal(baseline.ascensionCells, 3);
    assert.equal(boosted.ascensionCells, 14);
    assert.deepEqual(boosted.gearIds, ['g1']);
  });
});
