import type { Skill, SkillId } from '../../content/types';
import { buildBattleState } from './factory';
import { advance, nextReadyDelta, pickReady } from './queue';
import { step } from './step';
import type { Action, BattleState, StepResult, Unit } from './types';

export * from './types';
export * from './stats';
export * from './d20';
export * from './prng';
export * from './queue';
export * from './defaults';
export * from './factory';
export * from './validate';
export * from './effects';
export * from './step';
export * from './bossAI';

export interface EngineOptions {
  readonly seed: number;
  readonly units: readonly Unit[];
  readonly skillLookup: (id: SkillId) => Skill | undefined;
}

export interface CombatEngine {
  readonly state: BattleState;
  readonly ready: () => Unit | null;
  readonly timeUntilReady: () => number;
  readonly advance: () => CombatEngine;
  readonly step: (action: Action) => { readonly engine: CombatEngine; readonly result: StepResult };
  readonly withState: (state: BattleState) => CombatEngine;
}

const makeEngine = (
  state: BattleState,
  skillLookup: (id: SkillId) => Skill | undefined,
): CombatEngine => ({
  state,
  ready: () => pickReady(state),
  timeUntilReady: () => nextReadyDelta(state),
  advance: () => makeEngine(advance(state), skillLookup),
  step: (action) => {
    const result = step(state, action, skillLookup);
    return {
      engine: makeEngine(result.state, skillLookup),
      result,
    };
  },
  withState: (next) => makeEngine(next, skillLookup),
});

export const createEngine = (opts: EngineOptions): CombatEngine => {
  const state = buildBattleState({ seed: opts.seed, units: opts.units });
  return makeEngine(state, opts.skillLookup);
};
