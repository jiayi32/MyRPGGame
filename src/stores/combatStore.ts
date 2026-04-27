import { create } from 'zustand';
import type { ClassId } from '@/content';
import type {
  Action,
  CombatEngine,
  InstanceId,
  StepError,
} from '@/domain/combat';
import {
  autoPlayStage,
  buildStageReport,
  prepareStage,
  type PreparedStage,
  type StageSimulationReport,
} from '@/features/run/orchestrator';
import {
  EMPTY_REWARD_BUNDLE,
  type StageOutcomeResult,
} from '@/features/run/types';

export type CombatStoreStatus = 'idle' | 'preparing' | 'in_progress' | 'simulating' | 'finished' | 'error';

export interface SimulateStageInput {
  seed: number;
  stageIndex: number;
  activeClassId: ClassId;
  classRank?: number;
  equippedGearTemplateIds?: readonly string[];
}

interface CombatStoreState {
  status: CombatStoreStatus;
  error: string | null;
  /** Final report — populated when the battle reaches a terminal state. */
  report: StageSimulationReport | null;

  /** Active interactive engine; advances per user action. */
  engine: CombatEngine | null;
  prepared: PreparedStage | null;

  /**
   * Auto-play toggle. When true, BattleScreen drives the player's basic-attack on a 350 ms
   * timer instead of waiting for manual input. Auto-resets to false when a new stage begins
   * or when a battle ends so the dev gets fresh manual control on each stage.
   */
  autoPlay: boolean;

  /** Setup an interactive battle (does not auto-play). */
  beginInteractive: (input: SimulateStageInput) => void;
  /** Engine.advance() — call when no unit is ready. Returns whether a unit became ready. */
  tickAdvance: () => void;
  /** Step the engine with a player action. Returns the StepError reason if the action was rejected. */
  step: (action: Action) => StepError | null;
  /** Run the prepared engine to terminal using basic attacks; finalizes the report. */
  autoPlayToFinish: () => StageSimulationReport;

  /** Toggle auto-play. */
  setAutoPlay: (value: boolean) => void;

  /**
   * Dev-only: synthesise a terminal report from the current prepared stage WITHOUT running
   * the engine. Used by DevToolsScreen "Force outcome" buttons. Sets status='finished' and
   * populates `report` so BattleScreen's existing battle-ended UI takes over and the user
   * can submit normally via submitStageOutcome.
   */
  forceFinish: (result: StageOutcomeResult) => void;

  /** One-shot auto-play helper (legacy entry point used by Battle's "Simulate & Submit"). */
  simulateStage: (input: SimulateStageInput) => Promise<StageSimulationReport>;
  clear: () => void;
}

const finalizeIfTerminal = (
  prepared: PreparedStage,
  engine: CombatEngine,
): StageSimulationReport | null => {
  if (engine.state.result === 'ongoing') return null;
  return buildStageReport(prepared, engine);
};

export const useCombatStore = create<CombatStoreState>((set, get) => ({
  status: 'idle',
  error: null,
  report: null,
  engine: null,
  prepared: null,
  autoPlay: false,

  beginInteractive: (input) => {
    // Always reset auto-play on new stage prep — never let a previous stage's setting bleed in.
    set({ status: 'preparing', error: null, report: null, autoPlay: false });
    try {
      const prepared = prepareStage(input);
      set({
        status: 'in_progress',
        prepared,
        engine: prepared.engine,
        report: null,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ status: 'error', error: message, prepared: null, engine: null });
    }
  },

  tickAdvance: () => {
    const { engine, prepared, status } = get();
    if (engine === null || prepared === null) return;
    if (status === 'finished') return;
    const next = engine.advance();
    const report = finalizeIfTerminal(prepared, next);
    if (report !== null) {
      // Battle ended — clear auto-play so the dev gets manual control on next stage.
      set({ engine: next, report, status: 'finished', autoPlay: false });
    } else {
      set({ engine: next, status: 'in_progress' });
    }
  },

  step: (action) => {
    const { engine, prepared, status } = get();
    if (engine === null || prepared === null) return 'battle_ended' as StepError;
    if (status === 'finished') return 'battle_ended' as StepError;
    const stepped = engine.step(action);
    if (!stepped.result.ok) {
      // Engine state may still have updated (e.g., re-sorted) — keep latest.
      set({ engine: stepped.engine });
      return stepped.result.reason;
    }
    const report = finalizeIfTerminal(prepared, stepped.engine);
    if (report !== null) {
      set({ engine: stepped.engine, report, status: 'finished', autoPlay: false });
    } else {
      set({ engine: stepped.engine, status: 'in_progress' });
    }
    return null;
  },

  autoPlayToFinish: () => {
    const { engine, prepared } = get();
    if (engine === null || prepared === null) {
      throw new Error('No prepared engine. Call beginInteractive first.');
    }
    set({ status: 'simulating', error: null });
    try {
      // Carry forward whatever state the user has already produced by reusing prepared
      // but starting from the current engine state.
      const finishedEngine = autoPlayStage({ ...prepared, engine });
      const report = buildStageReport(prepared, finishedEngine);
      set({ status: 'finished', engine: finishedEngine, report, error: null, autoPlay: false });
      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ status: 'error', error: message });
      throw error;
    }
  },

  setAutoPlay: (value) => {
    set({ autoPlay: value });
  },

  forceFinish: (result) => {
    const { prepared, engine } = get();
    if (prepared === null || engine === null) {
      throw new Error('No prepared engine. Call beginInteractive first.');
    }
    // Synthesise a terminal-state report without running the engine.
    const player = Object.values(engine.state.units).find((u) => u.team === 'player');
    const playerHpMax = player?.hpMax ?? 0;
    const isWon = result === 'won';
    const claimedRewards = isWon
      ? prepared.rewards
      : { ...EMPTY_REWARD_BUNDLE, gearIds: [] };
    const battleResult: 'won' | 'lost' | 'draw' = isWon ? 'won' : 'lost';
    const report: StageSimulationReport = {
      stageIndex: prepared.stageIndex,
      encounterId: prepared.encounterId,
      battleResult,
      outcomeResult: result,
      claimedRewards,
      hpRemaining: isWon ? playerHpMax : 0,
      elapsedSeconds: 0,
      tickCount: 0,
      logLength: 0,
      enemyCount: prepared.enemyCount,
    };
    set({ status: 'finished', report, autoPlay: false });
  },

  simulateStage: async (input) => {
    set({ status: 'simulating', error: null, report: null, engine: null, prepared: null, autoPlay: false });
    try {
      const prepared = prepareStage(input);
      const finishedEngine = autoPlayStage(prepared);
      const report = buildStageReport(prepared, finishedEngine);
      set({
        status: 'finished',
        prepared,
        engine: finishedEngine,
        report,
        error: null,
      });
      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ status: 'error', error: message });
      throw error;
    }
  },

  clear: () => {
    set({ status: 'idle', error: null, report: null, engine: null, prepared: null, autoPlay: false });
  },
}));

/** Helpers consumed by BattleScreen — keep selectors out of the store body. */
export const selectPlayerUnit = (state: CombatStoreState) => {
  if (state.engine === null) return null;
  return Object.values(state.engine.state.units).find((u) => u.team === 'player') ?? null;
};

export const selectAliveEnemies = (state: CombatStoreState) => {
  if (state.engine === null) return [];
  return Object.values(state.engine.state.units).filter((u) => u.team === 'enemy' && !u.isDead);
};

export const selectReadyUnitId = (state: CombatStoreState): InstanceId | null => {
  if (state.engine === null) return null;
  return state.engine.ready()?.id ?? null;
};
