import { create } from 'zustand';
import type { ClassId } from '@/content';
import { CLASS_BY_ID } from '@/content';
import { findSameLineageEvolutionTarget } from '@/domain/run/progression';
import {
  bankCheckpoint as bankCheckpointApi,
  endRun as endRunApi,
  formatCallableError,
  getRunSnapshot,
  startRun as startRunApi,
  submitStageOutcome as submitStageOutcomeApi,
} from '@/services/runApi';
import {
  EMPTY_REWARD_BUNDLE,
  type EndRunResponse,
  type RewardBundle,
  type RunFinalResult,
  type RunSnapshot,
  type StageOutcomeResult,
  type SubmitStageOutcomeResponse,
} from '@/features/run/types';
import { usePlayerStore } from './playerStore';

export type RunStoreStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'starting_run'
  | 'run_active'
  | 'submitting_outcome'
  | 'ending_run'
  | 'run_ended'
  | 'error';

export interface SubmitOutcomeInput {
  stageIndex: number;
  result: StageOutcomeResult;
  rewards: RewardBundle;
  hpRemaining: number;
  elapsedSeconds: number;
}

interface RunStoreState {
  status: RunStoreStatus;
  error: string | null;
  runId: string | null;
  seed: number | null;
  stage: number | null;
  activeClassId: ClassId | null;
  runResult: RunFinalResult | null;
  vaultStreak: number;
  awaitingVaultDecision: boolean;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  lastSubmittedResult: StageOutcomeResult | null;
  bootstrap: () => Promise<void>;
  startRun: (activeClassId: ClassId) => Promise<void>;
  submitStageOutcome: (input: SubmitOutcomeInput) => Promise<SubmitStageOutcomeResponse>;
  vaultAtStage: () => Promise<void>;
  pressOn: () => void;
  endRun: (finalResult: StageOutcomeResult) => Promise<EndRunResponse>;
  refreshRunSnapshot: () => Promise<RunSnapshot>;
  resetRun: () => void;
}

const cloneReward = (reward: RewardBundle): RewardBundle => ({
  gold: reward.gold,
  ascensionCells: reward.ascensionCells,
  sigilShards: reward.sigilShards,
  xpScrollMinor: reward.xpScrollMinor,
  xpScrollStandard: reward.xpScrollStandard,
  xpScrollGrand: reward.xpScrollGrand,
  gearIds: [...reward.gearIds],
});

const statusForRunResult = (result: RunFinalResult): RunStoreStatus =>
  result === 'ongoing' ? 'run_active' : 'run_ended';

const applySnapshot = (
  set: (partial: Partial<RunStoreState>) => void,
  snapshot: RunSnapshot,
): void => {
  set({
    runId: snapshot.id,
    seed: snapshot.seed,
    stage: snapshot.stage,
    activeClassId: snapshot.activeClassId as ClassId,
    runResult: snapshot.result,
    vaultStreak: snapshot.vaultStreak,
    bankedRewards: cloneReward(snapshot.bankedRewards),
    vaultedRewards: cloneReward(snapshot.vaultedRewards),
    status: statusForRunResult(snapshot.result),
    error: null,
  });
};

export const useRunStore = create<RunStoreState>((set, get) => ({
  status: 'idle',
  error: null,
  runId: null,
  seed: null,
  stage: null,
  activeClassId: null,
  runResult: null,
  vaultStreak: 0,
  awaitingVaultDecision: false,
  bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
  vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
  lastSubmittedResult: null,

  bootstrap: async () => {
    if (get().status !== 'idle' && get().status !== 'error') {
      return;
    }

    set({ status: 'initializing', error: null });
    try {
      const player = await usePlayerStore.getState().bootstrap();

      // Not signed in yet — playerStore is in 'awaiting_sign_in'. Stay idle
      // so the SignInScreen owns the next step. The screen will call
      // playerStore.signIn → which, on success, leaves the player in 'ready'.
      // The Hub effect re-runs runStore.bootstrap once the player loads.
      if (player === null) {
        set({ status: 'idle', error: null });
        return;
      }

      // Run resume: if player has an active run, hydrate this store from it.
      if (player.currentRunId !== null) {
        const snapshot = await getRunSnapshot(player.currentRunId);
        if (snapshot.result === 'ongoing') {
          applySnapshot(set, snapshot);
          return;
        }
        // Run already settled — clear the stale pointer by falling through to ready.
      }

      set({ status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  startRun: async (activeClassId) => {
    const playerStore = usePlayerStore.getState();
    if (playerStore.status !== 'ready') {
      await get().bootstrap();
    }

    const classData = CLASS_BY_ID.get(activeClassId);
    if (classData === undefined) {
      throw new Error(`Unknown class: ${activeClassId}`);
    }
    const activeLineageId = classData.lineageId;
    const evolutionTarget = findSameLineageEvolutionTarget(classData);
    const evolutionTargetClassId = evolutionTarget ?? null;

    set({ status: 'starting_run', error: null, lastSubmittedResult: null });
    try {
      const response = await startRunApi({
        activeClassId,
        activeLineageId,
        evolutionTargetClassId,
      });
      const snapshot = await getRunSnapshot(response.runId);
      applySnapshot(set, snapshot);
      set({ awaitingVaultDecision: false });
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  submitStageOutcome: async (input) => {
    const runId = get().runId;
    if (runId === null) {
      throw new Error('No active run. Start a run before submitting stage outcome.');
    }

    set({ status: 'submitting_outcome', error: null });
    try {
      const response = await submitStageOutcomeApi({
        runId,
        stageIndex: input.stageIndex,
        result: input.result,
        rewards: cloneReward(input.rewards),
        hpRemaining: input.hpRemaining,
        elapsedSeconds: input.elapsedSeconds,
      });

      const snapshot = await getRunSnapshot(runId);
      applySnapshot(set, snapshot);
      set({ awaitingVaultDecision: input.result === 'won' });

      set({ lastSubmittedResult: input.result });
      return response;
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  vaultAtStage: async () => {
    const runId = get().runId;
    if (runId === null) {
      return;
    }

    set({ error: null });
    try {
      await bankCheckpointApi({ runId });
      const snapshot = await getRunSnapshot(runId);
      applySnapshot(set, snapshot);
      set({ awaitingVaultDecision: false });
    } catch (error) {
      set({ error: formatCallableError(error) });
      throw error;
    }
  },

  pressOn: () => {
    set({ awaitingVaultDecision: false });
  },

  endRun: async (finalResult) => {
    const runId = get().runId;
    if (runId === null) {
      throw new Error('No active run.');
    }

    set({ status: 'ending_run', error: null });
    try {
      const response = await endRunApi({ runId, finalResult });

      // Apply the server-computed progression delta to the player store locally
      // so the UI reflects new totals without a round-trip Firestore read.
      usePlayerStore.getState().applyEndRunDelta(response.progression, null);

      set({
        bankedRewards: cloneReward(response.bankedRewards),
        vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
        runResult: finalResult === 'won' ? 'won' : 'lost',
        awaitingVaultDecision: false,
      });

      const snapshot = await getRunSnapshot(runId);
      applySnapshot(set, snapshot);
      return response;
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  refreshRunSnapshot: async () => {
    const runId = get().runId;
    if (runId === null) {
      throw new Error('No active run to refresh.');
    }

    const snapshot = await getRunSnapshot(runId);
    applySnapshot(set, snapshot);
    return snapshot;
  },

  resetRun: () => {
    const playerStatus = usePlayerStore.getState().status;
    set({
      status: playerStatus === 'ready' ? 'ready' : 'idle',
      error: null,
      runId: null,
      seed: null,
      stage: null,
      activeClassId: null,
      runResult: null,
      vaultStreak: 0,
      awaitingVaultDecision: false,
      bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      lastSubmittedResult: null,
    });
  },
}));
