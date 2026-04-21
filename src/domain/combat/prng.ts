export const drawU32 = (seed: number, cursor: number): number => {
  let s = (seed + Math.imul(cursor, 0x6d2b79f5)) | 0;
  s = Math.imul(s ^ (s >>> 15), s | 1);
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  return (s ^ (s >>> 14)) >>> 0;
};

export const draw01 = (seed: number, cursor: number): number =>
  drawU32(seed, cursor) / 0x1_0000_0000;

export const drawRangeInt = (
  seed: number,
  cursor: number,
  minInclusive: number,
  maxInclusive: number,
): number => {
  const span = maxInclusive - minInclusive + 1;
  return minInclusive + Math.floor(draw01(seed, cursor) * span);
};

export const drawChance = (
  seed: number,
  cursor: number,
  probability: number,
): boolean => draw01(seed, cursor) < probability;
