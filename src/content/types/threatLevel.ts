// ─── Threat Level Types ──────────────────────────────────────────
// Per-run difficulty ladder (Slay the Spire Ascension / Hades Heat model).
// Each level stacks a new modifier. Beat TL N to unlock TL N+1.

export type ThreatLevel = number; // 1-20

export interface ThreatModifier {
  /** Short label shown in the threat selector. */
  label: string;
  /** Detailed description of what this threat level does. */
  description: string;
  /** Multiplier applied to final run score. */
  scoreMultiplier: number;
}

export interface ThreatLevelDef {
  level: ThreatLevel;
  /** The modifier that becomes active at this level. */
  modifier: ThreatModifier;
  /** Cumulative score multiplier at this level (product of all previous). */
  cumulativeScoreMultiplier: number;
}
