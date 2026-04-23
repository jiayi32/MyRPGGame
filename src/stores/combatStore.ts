import { create } from 'zustand';
import type { ClassId } from '@/content';
import {
  simulateProceduralStage,
  type StageSimulationReport,
} from '@/features/run/orchestrator';

export type CombatStoreStatus = 'idle' | 'simulating' | 'finished' | 'error';

export interface SimulateStageInput {
  seed: number;
  stageIndex: number;
  activeClassId: ClassId;
}

interface CombatStoreState {
  status: CombatStoreStatus;
  error: string | null;
  report: StageSimulationReport | null;
  simulateStage: (input: SimulateStageInput) => Promise<StageSimulationReport>;
  clear: () => void;
}

export const useCombatStore = create<CombatStoreState>((set) => ({
  status: 'idle',
  error: null,
  report: null,

  simulateStage: async (input) => {
    set({ status: 'simulating', error: null, report: null });

    try {
      const report = simulateProceduralStage(input);
      set({ status: 'finished', report, error: null });
      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ status: 'error', error: message });
      throw error;
    }
  },

  clear: () => {
    set({ status: 'idle', error: null, report: null });
  },
}));
