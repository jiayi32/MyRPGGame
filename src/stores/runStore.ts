import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassId, RiskContractId, SkillId } from '@/content';
import { CLASS_BY_ID } from '@/content';
import {
  createRunMapGraph,
  filterMapGraphByContracts,
  getAvailableNodeIdsForStage,
  getSelectedNodeForStage,
  repairRunMapPath,
  type RunMapGraph,
  type RunMapNode,
} from '@/domain/run/map';
import { findSameLineageEvolutionTarget } from '@/domain/run/progression';
import { isCheckpointStage } from '@/domain/run/checkpoint';
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
  mapGraph: RunMapGraph | null;
  mapPathByStage: Record<number, string>;
  activeClassId: ClassId | null;
  selectedRiskContractIds: RiskContractId[];
  runPassiveIds: string[];
  draftedSkillIds: SkillId[];
  augmentIds: string[];
  pendingInnDecisionId: string | null;
  runResult: RunFinalResult | null;
  vaultStreak: number;
  awaitingVaultDecision: boolean;
  bankedRewards: RewardBundle;
  vaultedRewards: RewardBundle;
  lastSubmittedResult: StageOutcomeResult | null;
  getAvailableNodeIdsForCurrentStage: () => readonly string[];
  getCurrentStageNode: () => RunMapNode | null;
  selectMapNodeForCurrentStage: (nodeId: string) => void;
  clearMapNodeSelectionForCurrentStage: () => void;
  selectPassive: (passiveId: string) => void;
  selectDraftedSkill: (skillId: SkillId) => void;
  selectAugment: (augmentId: string) => void;
  selectInnDecision: (decisionId: string) => void;
  clearInnDecision: () => void;
  bootstrap: () => Promise<void>;
  startRun: (
    activeClassId: ClassId,
    options?: { selectedRiskContractIds?: RiskContractId[] }
  ) => Promise<void>;
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

const RUN_MAP_PATH_STORAGE_PREFIX = 'run.map.path.v1.';

const runMapStorageKey = (runId: string): string =>
  `${RUN_MAP_PATH_STORAGE_PREFIX}${runId}`;

const readStoredRunMapPath = async (runId: string): Promise<unknown> => {
  try {
    const raw = await AsyncStorage.getItem(runMapStorageKey(runId));
    if (raw === null) return {};
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
};

const writeStoredRunMapPath = async (runId: string, pathByStage: Record<number, string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(runMapStorageKey(runId), JSON.stringify(pathByStage));
  } catch {
    // Non-fatal: run progression is still server-authoritative.
  }
};

const clearStoredRunMapPath = async (runId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(runMapStorageKey(runId));
  } catch {
    // Best-effort cleanup only.
  }
};

const RUN_PASSIVE_STORAGE_PREFIX = 'run.passives.v1.';

const runPassiveStorageKey = (runId: string): string =>
  `${RUN_PASSIVE_STORAGE_PREFIX}${runId}`;

const readStoredRunPassives = async (runId: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(runPassiveStorageKey(runId));
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
};

const writeStoredRunPassives = async (runId: string, ids: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(runPassiveStorageKey(runId), JSON.stringify(ids));
  } catch {
    // Non-fatal.
  }
};

const clearStoredRunPassives = async (runId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(runPassiveStorageKey(runId));
  } catch {
    // Best-effort cleanup only.
  }
};

const DRAFTED_SKILL_STORAGE_PREFIX = 'run.draftedSkills.v1.';

const draftedSkillStorageKey = (runId: string): string =>
  `${DRAFTED_SKILL_STORAGE_PREFIX}${runId}`;

const writeStoredDraftedSkills = async (runId: string, ids: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(draftedSkillStorageKey(runId), JSON.stringify(ids));
  } catch {
    // Non-fatal.
  }
};

const readStoredDraftedSkills = async (runId: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(draftedSkillStorageKey(runId));
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
};

const clearStoredDraftedSkills = async (runId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(draftedSkillStorageKey(runId));
  } catch {
    // Best-effort cleanup only.
  }
};

const AUGMENT_STORAGE_PREFIX = 'run.augments.v1.';

const augmentStorageKey = (runId: string): string =>
  `${AUGMENT_STORAGE_PREFIX}${runId}`;

const readStoredAugments = async (runId: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(augmentStorageKey(runId));
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
};

const writeStoredAugments = async (runId: string, ids: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(augmentStorageKey(runId), JSON.stringify(ids));
  } catch {
    // Non-fatal.
  }
};

const clearStoredAugments = async (runId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(augmentStorageKey(runId));
  } catch {
    // Best-effort cleanup only.
  }
};

const hydrateRunMapForSnapshot = async (
  set: (partial: Partial<RunStoreState>) => void,
  snapshot: RunSnapshot,
): Promise<void> => {
  const rawGraph = createRunMapGraph(snapshot.seed);
  const graph = filterMapGraphByContracts(rawGraph, snapshot.selectedRiskContractIds);
  const storedPath = await readStoredRunMapPath(snapshot.id);
  const repairedPath = repairRunMapPath(graph, storedPath, snapshot.stage);
  // Restore previously-picked passives from local storage.
  const storedPassives = await readStoredRunPassives(snapshot.id);
  const storedDrafted = await readStoredDraftedSkills(snapshot.id);
  const storedAugments = await readStoredAugments(snapshot.id);
  // Merge: snapshot passives (authoritative) + locally stored (more recent).
  const mergedPassives = [...new Set([...snapshot.runPassiveIds, ...storedPassives])];
  const mergedAugments = [...new Set([...(snapshot.augmentIds ?? []), ...storedAugments])];
  set({ mapGraph: graph, mapPathByStage: repairedPath, runPassiveIds: mergedPassives, draftedSkillIds: storedDrafted, augmentIds: mergedAugments });
  await writeStoredRunMapPath(snapshot.id, repairedPath);
};

const applySnapshot = (
  set: (partial: Partial<RunStoreState>) => void,
  snapshot: RunSnapshot,
): void => {
  set({
    runId: snapshot.id,
    seed: snapshot.seed,
    stage: snapshot.stage,
    activeClassId: snapshot.activeClassId as ClassId,
    selectedRiskContractIds: [...snapshot.selectedRiskContractIds] as RiskContractId[],
    runPassiveIds: [...snapshot.runPassiveIds],
    draftedSkillIds: [],
    augmentIds: [...(snapshot.augmentIds ?? [])],
    pendingInnDecisionId: snapshot.pendingInnDecisionId,
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
  mapGraph: null,
  mapPathByStage: {},
  activeClassId: null,
  selectedRiskContractIds: [],
  runPassiveIds: [],
  draftedSkillIds: [],
  augmentIds: [],
  pendingInnDecisionId: null,
  runResult: null,
  vaultStreak: 0,
  awaitingVaultDecision: false,
  bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
  vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
  lastSubmittedResult: null,

  getAvailableNodeIdsForCurrentStage: () => {
    const { mapGraph, mapPathByStage, stage } = get();
    if (mapGraph === null || stage === null) return [];
    return getAvailableNodeIdsForStage(mapGraph, mapPathByStage, stage);
  },

  getCurrentStageNode: () => {
    const { mapGraph, mapPathByStage, stage } = get();
    if (mapGraph === null || stage === null) return null;
    return getSelectedNodeForStage(mapGraph, mapPathByStage, stage);
  },

  selectMapNodeForCurrentStage: (nodeId) => {
    const { runId, stage, mapGraph, mapPathByStage } = get();
    if (runId === null || stage === null || mapGraph === null) {
      throw new Error('No active run map to select from.');
    }
    const available = getAvailableNodeIdsForStage(mapGraph, mapPathByStage, stage);
    if (!available.includes(nodeId)) {
      throw new Error('Selected map node is not reachable from your current route.');
    }
    const nextPath = {
      ...mapPathByStage,
      [stage]: nodeId,
    };
    set({ mapPathByStage: nextPath, error: null });
    void writeStoredRunMapPath(runId, nextPath);
  },

  clearMapNodeSelectionForCurrentStage: () => {
    const { runId, stage, mapPathByStage } = get();
    if (runId === null || stage === null || mapPathByStage[stage] === undefined) {
      return;
    }
    const nextPath = { ...mapPathByStage };
    delete nextPath[stage];
    set({ mapPathByStage: nextPath });
    void writeStoredRunMapPath(runId, nextPath);
  },

  selectPassive: (passiveId) => {
    const { runId, runPassiveIds } = get();
    if (runId === null) {
      throw new Error('No active run to add a passive to.');
    }
    if (runPassiveIds.includes(passiveId)) {
      return; // Already selected — idempotent.
    }
    const nextPassives = [...runPassiveIds, passiveId];
    set({ runPassiveIds: nextPassives });
    void writeStoredRunPassives(runId, nextPassives);
  },

  selectDraftedSkill: (skillId) => {
    const { runId, draftedSkillIds } = get();
    if (runId === null) {
      throw new Error('No active run to add a drafted skill to.');
    }
    if (draftedSkillIds.includes(skillId)) {
      return;
    }
    const nextDrafted = [...draftedSkillIds, skillId];
    set({ draftedSkillIds: nextDrafted });
    void writeStoredDraftedSkills(runId, nextDrafted);
  },

  selectAugment: (augmentId) => {
    const { runId, augmentIds } = get();
    if (runId === null) {
      throw new Error('No active run to add an augment to.');
    }
    if (augmentIds.includes(augmentId)) {
      return; // Already selected — idempotent.
    }
    if (augmentIds.length >= 7) {
      throw new Error('Maximum augments (7) reached for this run.');
    }
    const nextAugments = [...augmentIds, augmentId];
    set({ augmentIds: nextAugments });
    void writeStoredAugments(runId, nextAugments);
  },

  selectInnDecision: (decisionId) => {
    const { runId } = get();
    if (runId === null) {
      throw new Error('No active run to record an inn decision for.');
    }
    set({ pendingInnDecisionId: decisionId });
  },

  clearInnDecision: () => {
    set({ pendingInnDecisionId: null });
  },

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
        set({ status: 'idle', error: null, mapGraph: null, mapPathByStage: {} });
        return;
      }

      // Run resume: if player has an active run, hydrate this store from it.
      if (player.currentRunId !== null) {
        const snapshot = await getRunSnapshot(player.currentRunId);
        if (snapshot.result === 'ongoing') {
          applySnapshot(set, snapshot);
          await hydrateRunMapForSnapshot(set, snapshot);
          return;
        }
        // Run already settled — clear the stale pointer by falling through to ready.
      }

      set({ status: 'ready', error: null, mapGraph: null, mapPathByStage: {} });
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  startRun: async (activeClassId, options) => {
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

    set({
      status: 'starting_run',
      error: null,
      lastSubmittedResult: null,
      mapGraph: null,
      mapPathByStage: {},
    });
    try {
      const response = await startRunApi({
        activeClassId,
        activeLineageId,
        evolutionTargetClassId,
        selectedRiskContractIds: options?.selectedRiskContractIds ?? [],
      });
      const snapshot = await getRunSnapshot(response.runId);
      applySnapshot(set, snapshot);
      await clearStoredRunMapPath(snapshot.id);
      await hydrateRunMapForSnapshot(set, snapshot);
      set({ awaitingVaultDecision: false });
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  submitStageOutcome: async (input) => {
    const runId = get().runId;
    const selectedNodeId = get().mapPathByStage[input.stageIndex];
    if (runId === null) {
      throw new Error('No active run. Start a run before submitting stage outcome.');
    }
    if (selectedNodeId === undefined) {
      throw new Error('Choose a room on the Run Map before submitting stage outcome.');
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
        await hydrateRunMapForSnapshot(set, snapshot);
      set({ awaitingVaultDecision: input.result === 'won' && isCheckpointStage(input.stageIndex) });

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
      await hydrateRunMapForSnapshot(set, snapshot);
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
    await hydrateRunMapForSnapshot(set, snapshot);
    return snapshot;
  },

  resetRun: () => {
    const playerStatus = usePlayerStore.getState().status;
    const existingRunId = get().runId;
    if (existingRunId !== null) {
      void clearStoredRunMapPath(existingRunId);
      void clearStoredRunPassives(existingRunId);
      void clearStoredDraftedSkills(existingRunId);
      void clearStoredAugments(existingRunId);
    }
    set({
      status: playerStatus === 'ready' ? 'ready' : 'idle',
      error: null,
      runId: null,
      seed: null,
      stage: null,
      mapGraph: null,
      mapPathByStage: {},
      activeClassId: null,
      selectedRiskContractIds: [],
      runPassiveIds: [],
      draftedSkillIds: [],
      augmentIds: [],
      pendingInnDecisionId: null,
      runResult: null,
      vaultStreak: 0,
      awaitingVaultDecision: false,
      bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      lastSubmittedResult: null,
    });
  },
}));
