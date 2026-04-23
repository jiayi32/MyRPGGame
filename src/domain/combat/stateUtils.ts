/**
 * Lightweight pure helpers shared between effects.ts, step.ts, and queue.ts.
 * Not re-exported from the combat index — internal only.
 */
import type { BattleEvent, BattleState, InstanceId, Unit } from './types';

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export const patchUnit = (
  state: BattleState,
  id: InstanceId,
  patch: Partial<Unit>,
): BattleState => {
  const unit = state.units[id];
  if (unit === undefined) return state;
  return {
    ...state,
    units: { ...state.units, [id]: { ...unit, ...patch } },
  };
};

export const appendLog = (
  state: BattleState,
  events: readonly BattleEvent[],
): BattleState =>
  events.length === 0 ? state : { ...state, log: [...state.log, ...events] };
