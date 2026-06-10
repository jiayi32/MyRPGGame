import type { ThreatLevelDef, ThreatLevel } from './types';

// ═══════════════════════════════════════════════════════════════════
// THREAT LEVEL CATALOG — 20 stacking difficulty tiers
// Pattern: 1-5 introduce basics, 6-10 raise enemy stats,
// 11-15 add tactical pressure, 16-20 are brutal.
// Unlock: Beat TL N to unlock TL N+1 (max unlocked persisted).
// ═══════════════════════════════════════════════════════════════════

export const THREAT_LEVELS: readonly ThreatLevelDef[] = [
  // ── TIER 1: Introduction (1-5) ────────────────────────────────
  {
    level: 1,
    modifier: {
      label: 'Alert Patrols',
      description: 'Enemies have +5% HP.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.05,
  },
  {
    level: 2,
    modifier: {
      label: 'Hardened Targets',
      description: 'Enemies have +5% defense.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.10,
  },
  {
    level: 3,
    modifier: {
      label: 'Elite Patrols',
      description: 'Elite rooms appear more frequently on the Run Map.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.16,
  },
  {
    level: 4,
    modifier: {
      label: 'Limited Intel',
      description: 'Enemy intent icons are hidden for the first turn of each battle.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.21,
  },
  {
    level: 5,
    modifier: {
      label: 'Resource Tax',
      description: 'Merchant prices increased by 10%.',
      scoreMultiplier: 1.10,
    },
    cumulativeScoreMultiplier: 1.33,
  },

  // ── TIER 2: Escalation (6-10) ─────────────────────────────────
  {
    level: 6,
    modifier: {
      label: 'Veteran Units',
      description: 'Enemies have +10% ATK.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.40,
  },
  {
    level: 7,
    modifier: {
      label: 'Reduced Recovery',
      description: 'Healing effects are 10% less effective.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.47,
  },
  {
    level: 8,
    modifier: {
      label: 'Reinforcements',
      description: 'Normal battle rooms have +1 enemy.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.54,
  },
  {
    level: 9,
    modifier: {
      label: 'Diminished Drops',
      description: 'Gold rewards from battles reduced by 15%.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.62,
  },
  {
    level: 10,
    modifier: {
      label: 'Boss Augmented',
      description: 'Bosses gain +1 additional action ability.',
      scoreMultiplier: 1.15,
    },
    cumulativeScoreMultiplier: 1.87,
  },

  // ── TIER 3: Tactical Pressure (11-15) ─────────────────────────
  {
    level: 11,
    modifier: {
      label: 'CT Interference',
      description: 'Enemy CT speed increased by 8%.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 1.96,
  },
  {
    level: 12,
    modifier: {
      label: 'Supply Scarcity',
      description: 'Rest nodes heal 50% less HP.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 2.06,
  },
  {
    level: 13,
    modifier: {
      label: 'Adaptive Defenses',
      description: 'Enemies gain +15% resistance to the first damage type they receive each battle.',
      scoreMultiplier: 1.05,
    },
    cumulativeScoreMultiplier: 2.16,
  },
  {
    level: 14,
    modifier: {
      label: 'Anomaly Frequency',
      description: 'Anomaly rooms appear in the run map starting from stage 3.',
      scoreMultiplier: 1.10,
    },
    cumulativeScoreMultiplier: 2.38,
  },
  {
    level: 15,
    modifier: {
      label: 'Corrupted Checkpoints',
      description: 'Vault multiplier decays by 0.1× per stage instead of growing.',
      scoreMultiplier: 1.10,
    },
    cumulativeScoreMultiplier: 2.62,
  },

  // ── TIER 4: Brutal (16-20) ────────────────────────────────────
  {
    level: 16,
    modifier: {
      label: 'All Units Elite',
      description: 'All enemies have +15% HP, ATK, and DEF.',
      scoreMultiplier: 1.08,
    },
    cumulativeScoreMultiplier: 2.83,
  },
  {
    level: 17,
    modifier: {
      label: 'Permadeath Protocol',
      description: 'No checkpoint banking. Vault Now is disabled.',
      scoreMultiplier: 1.10,
    },
    cumulativeScoreMultiplier: 3.11,
  },
  {
    level: 18,
    modifier: {
      label: 'Double Boss',
      description: 'Gate bosses (stages 10, 20) spawn with a mini-boss ally.',
      scoreMultiplier: 1.10,
    },
    cumulativeScoreMultiplier: 3.42,
  },
  {
    level: 19,
    modifier: {
      label: 'Scrambled Forecast',
      description: 'CT forecast shows only the next 2 turns (was 5).',
      scoreMultiplier: 1.08,
    },
    cumulativeScoreMultiplier: 3.69,
  },
  {
    level: 20,
    modifier: {
      label: 'Apocalypse Protocol',
      description: 'All previous modifiers active. +25% bonus score. Good luck.',
      scoreMultiplier: 1.25,
    },
    cumulativeScoreMultiplier: 4.62,
  },
];

export const THREAT_LEVEL_BY_LEVEL: ReadonlyMap<ThreatLevel, ThreatLevelDef> = new Map(
  THREAT_LEVELS.map((tl) => [tl.level, tl]),
);

/** Maximum threat level. */
export const MAX_THREAT_LEVEL = 20;

/** Default threat level (no modifiers). */
export const DEFAULT_THREAT_LEVEL = 0;

/**
 * Get the modifier that should be active at a given threat level.
 * All modifiers from levels ≤ the selected level are active (stacking).
 */
export const getActiveModifiers = (
  selectedLevel: ThreatLevel,
): readonly ThreatLevelDef['modifier'][] => {
  return THREAT_LEVELS
    .filter((tl) => tl.level <= selectedLevel)
    .map((tl) => tl.modifier);
};

/**
 * Get cumulative score multiplier for a given threat level.
 */
export const getScoreMultiplier = (selectedLevel: ThreatLevel): number => {
  const def = THREAT_LEVEL_BY_LEVEL.get(selectedLevel);
  return def?.cumulativeScoreMultiplier ?? 1.0;
};
