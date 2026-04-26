import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRewardBundle,
  validateRewardPlausibility,
  CHECKPOINT_STAGES,
  requirePayloadSize,
  requireRateLimit,
  __resetRateLimitsForTest,
} from '../shared/guards.js';

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

describe('requirePayloadSize', () => {
  it('accepts payload within cap', () => {
    assert.doesNotThrow(() => requirePayloadSize({ a: 1 }, 1024));
  });

  it('rejects payload exceeding cap', () => {
    const big = { blob: 'x'.repeat(2048) };
    assert.throws(() => requirePayloadSize(big, 1024), /exceeds cap/);
  });

  it('accepts null and undefined', () => {
    assert.doesNotThrow(() => requirePayloadSize(null, 16));
    assert.doesNotThrow(() => requirePayloadSize(undefined, 16));
  });

  it('rejects non-serializable payload (circular)', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    assert.throws(() => requirePayloadSize(obj, 1024), /not JSON-serializable/);
  });

  it('counts UTF-8 multi-byte characters correctly', () => {
    // "𝄞" is 4 bytes in UTF-8; JSON-serialized as "\"𝄞\"" = 6 bytes.
    assert.throws(() => requirePayloadSize('𝄞'.repeat(10), 16), /exceeds cap/);
  });
});

describe('requireRateLimit', () => {
  it('allows calls under the cap', () => {
    __resetRateLimitsForTest();
    for (let i = 0; i < 5; i++) {
      assert.doesNotThrow(() => requireRateLimit('user:a', 5, 60_000));
    }
  });

  it('rejects the call that crosses the cap', () => {
    __resetRateLimitsForTest();
    for (let i = 0; i < 3; i++) requireRateLimit('user:b', 3, 60_000);
    assert.throws(() => requireRateLimit('user:b', 3, 60_000), /Rate limit exceeded/);
  });

  it('isolates different keys', () => {
    __resetRateLimitsForTest();
    for (let i = 0; i < 2; i++) requireRateLimit('user:c', 2, 60_000);
    assert.doesNotThrow(() => requireRateLimit('user:d', 2, 60_000));
  });

  it('resets after the window rolls over', async () => {
    __resetRateLimitsForTest();
    requireRateLimit('user:e', 1, 50);
    assert.throws(() => requireRateLimit('user:e', 1, 50), /Rate limit exceeded/);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.doesNotThrow(() => requireRateLimit('user:e', 1, 50));
  });
});
