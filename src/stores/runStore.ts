import { create } from 'zustand';
import type { ClassId } from '@/content';
import { currentUser, signInAnonymously } from '@/services/auth';
import { initializeFirebase } from '@/services/firebase';
import {
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
  userId: string | null;
  runId: string | null;
  seed: number | null;
  stage: number | null;
  activeClassId: ClassId | null;
  runResult: RunFinalResult | null;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  lastSubmittedResult: StageOutcomeResult | null;
  bootstrap: () => Promise<void>;
  startRun: (activeClassId: ClassId) => Promise<void>;
  submitStageOutcome: (input: SubmitOutcomeInput) => Promise<SubmitStageOutcomeResponse>;
  endRun: (finalResult: StageOutcomeResult) => Promise<EndRunResponse>;
  refreshRunSnapshot: () => Promise<RunSnapshot>;
  resetRun: () => void;
}

const cloneReward = (reward: RewardBundle): RewardBundle => ({
  gold: reward.gold,
  ascensionCells: reward.ascensionCells,
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
    bankedRewards: cloneReward(snapshot.bankedRewards),
    vaultedRewards: cloneReward(snapshot.vaultedRewards),
    status: statusForRunResult(snapshot.result),
    error: null,
  });
};

export const useRunStore = create<RunStoreState>((set, get) => ({
  status: 'idle',
  error: null,
  userId: null,
  runId: null,
  seed: null,
  stage: null,
  activeClassId: null,
  runResult: null,
  bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
  vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
  lastSubmittedResult: null,

  bootstrap: async () => {
    if (get().userId !== null && get().status !== 'idle') {
      return;
    }

    set({ status: 'initializing', error: null });
    try {
      await initializeFirebase();
      const user = currentUser() ?? (await signInAnonymously());

      const hasRun = get().runId !== null;
      const runResult = get().runResult;
      const status: RunStoreStatus = hasRun && runResult === 'ongoing' ? 'run_active' : 'ready';

      set({ userId: user.uid, status, error: null });
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  startRun: async (activeClassId) => {
    await get().bootstrap();

    set({ status: 'starting_run', error: null, lastSubmittedResult: null });
    try {
      const response = await startRunApi({ activeClassId });
      const snapshot = await getRunSnapshot(response.runId);
      applySnapshot(set, snapshot);
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
      set({ lastSubmittedResult: input.result });
      return response;
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  endRun: async (finalResult) => {
    const runId = get().runId;
    if (runId === null) {
      throw new Error('No active run.');
    }

    set({ status: 'ending_run', error: null });
    try {
      const response = await endRunApi({ runId, finalResult });

      set({
        bankedRewards: cloneReward(response.bankedRewards),
        vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
        runResult: finalResult === 'won' ? 'won' : 'lost',
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
    const isSignedIn = get().userId !== null;
    set({
      status: isSignedIn ? 'ready' : 'idle',
      error: null,
      runId: null,
      seed: null,
      stage: null,
      activeClassId: null,
      runResult: null,
      bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      lastSubmittedResult: null,
    });
  },
}));
