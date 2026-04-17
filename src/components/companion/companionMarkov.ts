/**
 * companionMarkov.ts — Markov chain configuration for companion animations.
 *
 * Each mood defines a set of states with weighted transitions.
 * States can hold for a loop count or a time duration.
 * Auto-drift allows moods to occasionally shift for variety.
 *
 * Designers: tune probabilities and durations here without touching component logic.
 */

import type { SpriteAnimName, CompanionMood } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkovState {
  /** Which sprite animation to play in this state */
  anim: SpriteAnimName;
  /** Number of full animation cycles before transitioning. Omit for time-based. */
  loops?: number;
  /** Hold duration in seconds before transitioning. Used when loops is omitted. */
  holdSeconds?: number;
  /** Weighted transitions to other state names. Weights are relative, not percentages. */
  transitions: Record<string, number>;
}

export interface DriftConfig {
  /** Seconds between drift attempts */
  intervalSeconds: number;
  /** Probability (0-1) of drift occurring per interval */
  probability: number;
  /** Target moods with relative weights */
  targets: Partial<Record<CompanionMood, number>>;
  /** Max transitions to play during a drift burst before returning */
  burstLength: number;
}

export interface MoodChainConfig {
  /** State name to enter when this mood is activated */
  entryState: string;
  /** All Markov states in this mood's chain */
  states: Record<string, MarkovState>;
  /** Auto-drift config. Omit to disable drift for this mood. */
  drift?: DriftConfig;
}

export type MoodChainMap = Record<CompanionMood, MoodChainConfig>;

// ---------------------------------------------------------------------------
// Weighted random helper
// ---------------------------------------------------------------------------

export function pickNextState(transitions: Record<string, number>): string {
  const entries = Object.entries(transitions);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [state, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return state;
  }
  return entries[0][0]; // fallback
}

/** Pick a mood from weighted targets */
export function pickWeightedMood(targets: Partial<Record<CompanionMood, number>>): CompanionMood {
  return pickNextState(targets as Record<string, number>) as CompanionMood;
}

// ---------------------------------------------------------------------------
// Mood Chain Configurations
// ---------------------------------------------------------------------------

export const MOOD_CHAINS: MoodChainMap = {
  // ----- IDLE -----
  idle: {
    entryState: 'idle',
    states: {
      idle:          { anim: 'idle',          holdSeconds: 10, transitions: { idle: 50, standby: 30, magic_standby: 20 } },
      standby:       { anim: 'standby',       holdSeconds: 5,  transitions: { idle: 100 } },
      magic_standby: { anim: 'magic_standby', holdSeconds: 5,  transitions: { idle: 100 } },
    },
    drift: {
      intervalSeconds: 90,
      probability: 0.3,
      targets: { excited: 40, adventuring: 60 },
      burstLength: 2,
    },
  },

  // ----- EXCITED -----
  // Note: idle never goes directly to win — always through win_before
  excited: {
    entryState: 'win_before',
    states: {
      idle:          { anim: 'idle',          holdSeconds: 8,  transitions: { win_before: 40, standby: 30, magic_standby: 30 } },
      win_before:    { anim: 'win_before',    loops: 1,        transitions: { win: 100 } },
      win:           { anim: 'win',           loops: 3,        transitions: { win: 40, idle: 60 } },
      standby:       { anim: 'standby',       holdSeconds: 5,  transitions: { idle: 100 } },
      magic_standby: { anim: 'magic_standby', holdSeconds: 5,  transitions: { idle: 100 } },
    },
    drift: {
      intervalSeconds: 120,
      probability: 0.2,
      targets: { idle: 70, adventuring: 30 },
      burstLength: 1,
    },
  },

  // ----- ADVENTURING -----
  adventuring: {
    entryState: 'idle_start',
    states: {
      idle_start: { anim: 'idle',      holdSeconds: 3,  transitions: { atk: 50, move: 10, standby: 40 } },
      idle:       { anim: 'idle',      holdSeconds: 6,  transitions: { standby: 40, move: 60 } },
      atk:        { anim: 'atk',       loops: 1,        transitions: { idle: 100 } },
      limit_atk:  { anim: 'limit_atk', loops: 1,        transitions: { idle: 100 } },
      move:       { anim: 'move',      loops: 1,        transitions: { atk: 80, limit_atk: 20 } },
      standby:    { anim: 'standby',   holdSeconds: 5,  transitions: { idle: 100 } },
    },
    drift: {
      intervalSeconds: 90,
      probability: 0.25,
      targets: { idle: 50, excited: 50 },
      burstLength: 2,
    },
  },

  // ----- SLEEPY -----
  // Drift out is gated in the widget: only active once sleepy has been entered at least once.
  sleepy: {
    entryState: 'idle',
    states: {
      idle:        { anim: 'idle',   loops: 2,        transitions: { dying: 100 } },
      dying:       { anim: 'dying',  loops: 3,        transitions: { dead: 100 } },
      dead:        { anim: 'dead',   holdSeconds: 10, transitions: { dead: 90, dying_micro: 10 } },
      dying_micro: { anim: 'dying',  loops: 1,        transitions: { dead: 100 } },
    },
    drift: {
      intervalSeconds: 60,
      probability: 0.4,
      targets: { sleepy: 40, idle: 20, excited: 20, adventuring: 20 },
      burstLength: 1,
    },
  },
};

// ---------------------------------------------------------------------------
// Sleepy-unlocked drift targets
// Used by widgets when all three main moods have been entered this session.
// Shaves 15% from existing targets and redirects it to sleepy.
// ---------------------------------------------------------------------------
export const SLEEPY_UNLOCKED_DRIFT_TARGETS: Partial<Record<CompanionMood, Partial<Record<CompanionMood, number>>>> = {
  idle:        { excited: 35, adventuring: 50, sleepy: 15 },
  excited:     { idle: 60,    adventuring: 25, sleepy: 15 },
  adventuring: { idle: 42,    excited: 43,     sleepy: 15 },
};
