import { applyResistance, mitigate, rollHit } from '../d20';
import { drawRangeInt } from '../prng';

describe('d20', () => {
  test('tier boundaries map to expected tiers', () => {
    const cases: { d20: number; tier: string }[] = [
      { d20: 1, tier: 'fail' },
      { d20: 9, tier: 'fail' },
      { d20: 10, tier: 'normal' },
      { d20: 17, tier: 'normal' },
      { d20: 18, tier: 'strong' },
      { d20: 19, tier: 'strong' },
      { d20: 20, tier: 'critical' },
    ];
    for (const { d20, tier } of cases) {
      let cursor = 0;
      let seed = 0;
      while (cursor < 10_000) {
        if (drawRangeInt(seed, cursor, 1, 20) === d20) break;
        cursor += 1;
        if (cursor === 10_000) {
          seed += 1;
          cursor = 0;
        }
      }
      const roll = rollHit(seed, cursor);
      expect(roll.tier).toBe(tier);
    }
  });

  test('critical severity falls in [1.25, 4.0]', () => {
    for (let s = 0; s < 200; s += 1) {
      for (let c = 0; c < 200; c += 1) {
        const roll = rollHit(s, c);
        if (roll.tier === 'critical') {
          expect(roll.severity).toBeGreaterThanOrEqual(1.25);
          expect(roll.severity).toBeLessThanOrEqual(4.0);
          expect(roll.nextCursor).toBe(c + 2);
          return;
        }
      }
    }
    throw new Error('no critical rolled in sample');
  });

  test('non-critical rolls consume one cursor, critical consumes two', () => {
    for (let c = 0; c < 50; c += 1) {
      const roll = rollHit(1234, c);
      if (roll.tier === 'critical') expect(roll.nextCursor).toBe(c + 2);
      else expect(roll.nextCursor).toBe(c + 1);
    }
  });

  test('mitigate applies 100/(100+2*DEF)', () => {
    expect(mitigate(100, 0)).toBe(100);
    expect(mitigate(100, 50)).toBe(50);
    expect(mitigate(100, 100)).toBeCloseTo(100 / 3, 6);
  });

  test('mitigate treats negative defense as zero', () => {
    expect(mitigate(100, -10)).toBe(100);
  });

  test('applyResistance scales damage linearly', () => {
    expect(applyResistance(100, 0)).toBe(100);
    expect(applyResistance(100, 0.25)).toBe(75);
    expect(applyResistance(100, 1)).toBe(0);
    expect(applyResistance(100, 2)).toBe(0);
    expect(applyResistance(100, -1)).toBe(100);
  });
});
