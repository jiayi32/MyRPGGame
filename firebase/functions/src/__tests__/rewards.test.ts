import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { applyVaultMultiplier, splitRewards } from '../shared/rewards.js';

describe('applyVaultMultiplier', () => {
  const base = {
    credits: 101,
    quantumCores: 7,
    scrap: 0,
    dataCacheMinor: 5,
    dataCacheStandard: 3,
    dataCacheGrand: 2,
    gearIds: ['a', 'b'],
  };

  it('keeps values unchanged at 1.0x', () => {
    const out = applyVaultMultiplier(base, 1);
    assert.deepEqual(out, base);
  });

  it('floors scaled numeric values', () => {
    const out = applyVaultMultiplier(base, 1.2);
    assert.equal(out.credits, 121);
    assert.equal(out.quantumCores, 8);
    assert.equal(out.dataCacheMinor, 6);
    assert.equal(out.dataCacheStandard, 3);
    assert.equal(out.dataCacheGrand, 2);
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
      credits: 100,
      quantumCores: 10,
      scrap: 0,
      dataCacheMinor: 10,
      dataCacheStandard: 10,
      dataCacheGrand: 10,
      gearIds: ['g1'],
    };

    const { baseline, vaulted } = splitRewards(rewards);
    const boosted = applyVaultMultiplier(vaulted, 2);

    assert.equal(baseline.credits, 30);
    assert.equal(vaulted.credits, 70);
    assert.equal(boosted.credits, 140);
    assert.equal(baseline.quantumCores, 3);
    assert.equal(boosted.quantumCores, 14);
    assert.deepEqual(boosted.gearIds, ['g1']);
  });
});
