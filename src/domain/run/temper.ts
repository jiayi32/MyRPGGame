/**
 * Probability-based gear tempering system.
 *
 * Each gear instance has a `temperLevel` (default 0, no hard cap).
 * Players spend gold to attempt tempering; each level adds a stat bonus
 * but success probability decays exponentially.
 *
 * - Success chance: 0.9487^level  (+0=100%, +1≈95%, +10≈59%, +100≈0.5%)
 * - Gold cost: 100 + 50 * level
 * - Failure only loses gold (gear does not degrade)
 *
 * This creates an infinite gold sink: early tempers are cheap and guaranteed,
 * but pushing past +50 requires astronomical gold investment.
 */

/**
 * Compute the probability (0–1) that a temper attempt succeeds at the given level.
 * Formula: 0.9487^level — exponential decay, never reaches zero.
 */
export const computeTemperChance = (temperLevel: number): number => {
  const level = Math.max(0, Math.trunc(temperLevel));
  return Math.pow(0.9487, level);
};

/**
 * Gold cost for a single temper attempt at the given level.
 * Formula: 100 + 50 * level — linear scaling.
 */
export const computeTemperCost = (temperLevel: number): number => {
  const level = Math.max(0, Math.trunc(temperLevel));
  return 100 + 50 * level;
};

/**
 * The stat multiplier applied to a tempered gear piece.
 * Each level adds 1.5% to relevant stats: multiplier = 1 + 0.015 * level.
 * At +10: 1.15×, at +50: 1.75×, at +100: 2.50×.
 */
export const temperStatMultiplier = (temperLevel: number): number => {
  const level = Math.max(0, Math.trunc(temperLevel));
  return 1 + 0.015 * level;
};

/**
 * Format the temper level for display (e.g. "+0", "+12", "+47").
 */
export const formatTemperLevel = (level: number): string => {
  const l = Math.max(0, Math.trunc(level));
  return `+${l}`;
};
