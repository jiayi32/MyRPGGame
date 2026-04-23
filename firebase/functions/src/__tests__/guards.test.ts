import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateRewardBundle, validateRewardPlausibility, CHECKPOINT_STAGES } from '../shared/guards.js';

describe('validateRewardBundle', () => {
  const valid = { gold: 10, ascensionCells: 1, xpScrollMinor: 0, xpScrollStandard: 0, xpScrollGrand: 0, gearIds: [] };

  it('accepts a valid bundle', () => {
    assert.doesNotThrow(() => validateRewardBundle(valid));
  });

  it('rejects non-object', () => {
    assert.throws(() => validateRewardBundle(null), /must be an object/);
    assert.throws(() => validateRewardBundle(42), /must be an object/);
  });

  it('rejects negative numeric field', () => {
    assert.throws(() => validateRewardBundle({ ...valid, gold: -1 }), /non-negative integer/);
  });

  it('rejects fractional numeric field', () => {
    assert.throws(() => validateRewardBundle({ ...valid, gold: 1.5 }), /non-negative integer/);
  });

  it('rejects non-array gearIds', () => {
    assert.throws(() => validateRewardBundle({ ...valid, gearIds: 'sword' }), /must be an array/);
  });

  it('rejects empty string in gearIds', () => {
    assert.throws(() => validateRewardBundle({ ...valid, gearIds: [''] }), /non-empty strings/);
  });
});

describe('validateRewardPlausibility', () => {
  const valid = { gold: 100, ascensionCells: 5, xpScrollMinor: 10, xpScrollStandard: 5, xpScrollGrand: 1, gearIds: ['a', 'b'] };

  it('accepts values within caps', () => {
    assert.doesNotThrow(() => validateRewardPlausibility(valid as Record<string, unknown>));
  });

  it('rejects gold exceeding cap', () => {
    assert.throws(() => validateRewardPlausibility({ ...valid, gold: 99999 } as Record<string, unknown>), /plausibility cap/);
  });

  it('rejects too many gearIds', () => {
    const tooMany = { ...valid, gearIds: ['a', 'b', 'c', 'd', 'e', 'f'] };
    assert.throws(() => validateRewardPlausibility(tooMany as Record<string, unknown>), /plausibility cap/);
  });
});

describe('CHECKPOINT_STAGES', () => {
  it('contains exactly stages 10, 20, 30', () => {
    assert.ok(CHECKPOINT_STAGES.has(10));
    assert.ok(CHECKPOINT_STAGES.has(20));
    assert.ok(CHECKPOINT_STAGES.has(30));
    assert.equal(CHECKPOINT_STAGES.size, 3);
  });
});
