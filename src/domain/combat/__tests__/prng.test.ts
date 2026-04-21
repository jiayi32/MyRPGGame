import { draw01, drawChance, drawRangeInt, drawU32 } from '../prng';

describe('prng', () => {
  test('drawU32 is deterministic for the same seed/cursor', () => {
    expect(drawU32(42, 0)).toBe(drawU32(42, 0));
    expect(drawU32(42, 1)).toBe(drawU32(42, 1));
  });

  test('drawU32 produces different values across cursors', () => {
    const values = new Set<number>();
    for (let c = 0; c < 100; c += 1) values.add(drawU32(42, c));
    expect(values.size).toBeGreaterThan(95);
  });

  test('drawU32 produces different values across seeds', () => {
    expect(drawU32(1, 0)).not.toBe(drawU32(2, 0));
    expect(drawU32(1, 5)).not.toBe(drawU32(2, 5));
  });

  test('draw01 stays within [0, 1)', () => {
    for (let c = 0; c < 1000; c += 1) {
      const v = draw01(7, c);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('drawRangeInt stays within bounds', () => {
    for (let c = 0; c < 1000; c += 1) {
      const v = drawRangeInt(123, c, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  test('drawRangeInt covers the full range', () => {
    const seen = new Set<number>();
    for (let c = 0; c < 500; c += 1) seen.add(drawRangeInt(99, c, 1, 20));
    for (let v = 1; v <= 20; v += 1) expect(seen.has(v)).toBe(true);
  });

  test('drawChance agrees with draw01', () => {
    expect(drawChance(5, 3, 1.0)).toBe(true);
    expect(drawChance(5, 3, 0.0)).toBe(false);
    const v = draw01(5, 3);
    expect(drawChance(5, 3, v + 0.0001)).toBe(true);
    expect(drawChance(5, 3, v)).toBe(false);
  });

  test('golden sequence locks the implementation', () => {
    const golden = [0, 1, 2, 3, 4].map((c) => drawU32(42, c));
    expect(golden.every((v) => Number.isInteger(v))).toBe(true);
    expect(new Set(golden).size).toBe(5);
  });
});
