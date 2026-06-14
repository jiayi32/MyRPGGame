import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassId, RiskContractId, SkillId, ConsumableId } from '@/content';
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
  startRunLocal,
  submitStageOutcomeLocal,
  endRunLocal,
} from '@/domain/run/localRunEngine';
import { savePlayerProfile } from '@/services/playerSync';
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

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Snapshot Builder ────────────────────────────────────────────

const buildSnapshot = (state: RunStoreState): RunSnapshot => ({
  id: state.runId!,
  seed: state.seed!,
  stage: state.stage!,
  activeClassId: state.activeClassId!,
  activeLineageId: CLASS_BY_ID.get(state.activeClassId!)?.lineageId ?? '',
  evolutionTargetClassId: null,
  selectedRiskContractIds: state.selectedRiskContractIds,
  runPassiveIds: state.runPassiveIds,
  draftedSkillIds: state.draftedSkillIds,
  augmentIds: state.augmentIds,
  bankedRewards: cloneReward(state.bankedRewards),
  vaultedRewards: cloneReward(state.vaultedRewards),
  riskMeter: state.riskMeter,
  totalRewards: cloneReward(state.totalRewards),
  vaultStreak: state.vaultStreak,
  result: state.runResult ?? 'ongoing',
  currentMapGraph: state.mapGraph,
  mapPathByStage: state.mapPathByStage,
  augmentsPicked: usePlayerStore.getState().augmentsPicked,
});

const syncPlayerToFirebase = () => {
  const p = usePlayerStore.getState();
  savePlayerProfile({
    credits: p.credits,
    quantumCores: p.quantumCores,
    scrap: p.scrap,
    corpRanks: { ...p.corpRanks },
    specRanks: { ...p.specRanks },
    unlockedSpecIds: [...p.unlockedSpecIds],
    unlockedPassiveIds: [...p.unlockedPassiveIds],
    augmentsPicked: p.augmentsPicked,
    runHistory: [...p.runHistory],
  });
};

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
  selectedThreatLevel: number;
  runPassiveIds: string[];
  draftedSkillIds: SkillId[];
  augmentIds: string[];
  pendingInnDecisionId: string | null;
  /** Stims (consumable combat items) carried during this run. Max 3. */
  carriedStims: ConsumableId[];
  runResult: RunFinalResult | null;
  /** Risk Meter (0-100). Fills as you press on. Cash out at checkpoints to bank rewards. */
  riskMeter: number;
  /** Total rewards accumulated this run before risk deduction. */
  totalRewards: RewardBundle;
  /** @deprecated Replaced by riskMeter system. */
  vaultStreak: number;
  awaitingVaultDecision: boolean;
  /** @deprecated Replaced by totalRewards + riskMeter. */
  bankedRewards: RewardBundle;
  /** @deprecated Replaced by riskMeter. */
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
  /** Add a stim to carried inventory. No-op if already at max capacity (3). */
  addStim: (stimId: ConsumableId) => void;
  /** Remove a stim from carried inventory (after use or discard). */
  removeStim: (stimId: ConsumableId) => void;
  bootstrap: () => Promise<void>;
  startRun: (
    activeClassId: ClassId,
    options?: { selectedRiskContractIds?: RiskContractId[] }
  ) => Promise<void>;
  submitStageOutcome: (input: SubmitOutcomeInput) => Promise<SubmitStageOutcomeResponse>;
  /** Advance the risk meter after a stage win and accumulate rewards. */
  advanceRisk: (stageRewards: RewardBundle, isBossStage: boolean) => void;
  /** Cash out at a checkpoint: keep 100% of totalRewards, reset risk to 0. */
  cashOut: () => void;
  vaultAtStage: () => Promise<void>;
  pressOn: () => void;
  endRun: (finalResult: StageOutcomeResult) => Promise<EndRunResponse>;
  refreshRunSnapshot: () => Promise<RunSnapshot>;
  resetRun: () => void;
}

const cloneReward = (reward: RewardBundle): RewardBundle => ({
  credits: reward.credits,
  quantumCores: reward.quantumCores,
  scrap: reward.scrap,
  dataCacheMinor: reward.dataCacheMinor,
  dataCacheStandard: reward.dataCacheStandard,
  dataCacheGrand: reward.dataCacheGrand,
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
    draftedSkillIds: [...(snapshot.draftedSkillIds ?? [])],
    augmentIds: [...(snapshot.augmentIds ?? [])],
    pendingInnDecisionId: snapshot.pendingInnDecisionId,
    runResult: snapshot.result,
    riskMeter: snapshot.riskMeter ?? 0,
    totalRewards: cloneReward(snapshot.totalRewards ?? EMPTY_REWARD_BUNDLE),
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
  selectedThreatLevel: 0,
  runPassiveIds: [],
  draftedSkillIds: [],
  augmentIds: [],
  pendingInnDecisionId: null,
  carriedStims: [],
  runResult: null,
  riskMeter: 0,
  totalRewards: cloneReward(EMPTY_REWARD_BUNDLE),
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

  addStim: (stimId) => {
    const { carriedStims } = get();
    if (carriedStims.length >= 3) return; // Max 3 stims
    set({ carriedStims: [...carriedStims, stimId] });
  },

  removeStim: (stimId) => {
    const { carriedStims } = get();
    const idx = carriedStims.indexOf(stimId);
    if (idx === -1) return;
    const updated = [...carriedStims];
    updated.splice(idx, 1);
    set({ carriedStims: updated });
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
      set({ status: 'error', error: formatError(error) });
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
      const { runId, seed, snapshot } = startRunLocal({
        activeClassId,
        activeLineageId,
        selectedRiskContractIds: options?.selectedRiskContractIds ?? [],
      });

      applySnapshot(set, snapshot);
      await clearStoredRunMapPath(snapshot.id);
      await hydrateRunMapForSnapshot(set, snapshot);
      set({ awaitingVaultDecision: false });
    } catch (error) {
      set({ status: 'error', error: formatError(error) });
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
      const current = get();
      const snapshot = buildSnapshot(current);
      const { snapshot: updated, output } = submitStageOutcomeLocal(snapshot, {
        stageIndex: input.stageIndex,
        result: input.result,
        rewards: cloneReward(input.rewards),
        hpRemaining: input.hpRemaining,
        elapsedSeconds: input.elapsedSeconds,
      });

      applySnapshot(set, updated);
      await hydrateRunMapForSnapshot(set, updated);
      set({
        awaitingVaultDecision: input.result === 'won' && output.isCheckpoint,
        lastSubmittedResult: input.result,
      });

      // If run ended, settle and sync
      if (output.runEnded && output.finalResult) {
        const settlement = endRunLocal(updated, output.finalResult);
        const playerStore = usePlayerStore.getState();
        // Apply progression directly
        playerStore.setState({
          credits: playerStore.credits + settlement.totalGoldKept,
          quantumCores: playerStore.quantumCores + settlement.totalCellsKept,
          dataCaches: {
            minor: playerStore.dataCaches.minor + settlement.xpGained.minor,
            standard: playerStore.dataCaches.standard + settlement.xpGained.standard,
            grand: playerStore.dataCaches.grand + settlement.xpGained.grand,
          },
        });
        playerStore.addRunToHistory({
          runId: current.runId!,
          classId: current.activeClassId!,
          className: CLASS_BY_ID.get(current.activeClassId!)?.name ?? 'Unknown',
          result: output.finalResult === 'fled' ? 'fled' : output.finalResult === 'won' ? 'won' : 'lost',
          stagesCompleted: current.stage ?? 0,
          goldEarned: settlement.totalGoldKept,
          completedAt: Date.now(),
        });
        syncPlayerToFirebase();
      }

      return {
        isCheckpoint: output.isCheckpoint,
        vaultStreak: current.vaultStreak,
      };
    } catch (error) {
      set({ status: 'error', error: formatError(error) });
      throw error;
    }
  },

  vaultAtStage: async () => {
    // Local-first: cash out risk meter
    get().cashOut();
  },

  pressOn: () => {
    set({ awaitingVaultDecision: false });
  },

  advanceRisk: (stageRewards, isBossStage) => {
    const { riskMeter, totalRewards } = get();
    const riskIncrease = isBossStage ? 10 : 5;
    const newRisk = Math.min(100, riskMeter + riskIncrease);
    set({
      riskMeter: newRisk,
      totalRewards: {
        credits: totalRewards.credits + stageRewards.credits,
        quantumCores: totalRewards.quantumCores + stageRewards.quantumCores,
        scrap: totalRewards.scrap + stageRewards.scrap,
        dataCacheMinor: totalRewards.dataCacheMinor + stageRewards.dataCacheMinor,
        dataCacheStandard: totalRewards.dataCacheStandard + stageRewards.dataCacheStandard,
        dataCacheGrand: totalRewards.dataCacheGrand + stageRewards.dataCacheGrand,
        gearIds: [...totalRewards.gearIds, ...stageRewards.gearIds],
      },
    });
  },

  cashOut: () => {
    // Keep 100% of totalRewards, reset risk to 0
    set({ riskMeter: 0, awaitingVaultDecision: false });
  },

  endRun: async (finalResult) => {
    const runId = get().runId;
    if (runId === null) {
      throw new Error('No active run.');
    }

    set({ status: 'ending_run', error: null });
    try {
      const current = get();
      const snapshot = buildSnapshot(current);
      const settlement = endRunLocal(snapshot, finalResult);

      const playerStore = usePlayerStore.getState();
      // Apply progression directly
      playerStore.setState({
        credits: playerStore.credits + settlement.totalGoldKept,
        quantumCores: playerStore.quantumCores + settlement.totalCellsKept,
        dataCaches: {
          minor: playerStore.dataCaches.minor + settlement.xpGained.minor,
          standard: playerStore.dataCaches.standard + settlement.xpGained.standard,
          grand: playerStore.dataCaches.grand + settlement.xpGained.grand,
        },
      });

      playerStore.addRunToHistory({
        runId: current.runId!,
        classId: current.activeClassId!,
        className: CLASS_BY_ID.get(current.activeClassId!)?.name ?? 'Unknown',
        result: finalResult === 'fled' ? 'fled' : finalResult === 'won' ? 'won' : 'lost',
        stagesCompleted: current.stage ?? 0,
        goldEarned: settlement.totalGoldKept,
        completedAt: Date.now(),
      });

      syncPlayerToFirebase();

      set({
        bankedRewards: cloneReward(current.totalRewards),
        vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
        runResult: finalResult === 'won' ? 'won' : 'lost',
        awaitingVaultDecision: false,
        riskMeter: 0,
      });

      return { bankedRewards: cloneReward(current.totalRewards), progression: settlement };
    } catch (error) {
      set({ status: 'error', error: formatError(error) });
      throw error;
    }
  },

  refreshRunSnapshot: async () => {
    // Local-first: snapshot is always in-memory. Nothing to refresh.
    const current = get();
    if (!current.runId) throw new Error('No active run to refresh.');
    return buildSnapshot(current);
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
      selectedThreatLevel: 0,
      runPassiveIds: [],
      draftedSkillIds: [],
      augmentIds: [],
      pendingInnDecisionId: null,
      carriedStims: [],
      runResult: null,
      riskMeter: 0,
      totalRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      vaultStreak: 0,
      awaitingVaultDecision: false,
      bankedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      vaultedRewards: cloneReward(EMPTY_REWARD_BUNDLE),
      lastSubmittedResult: null,
    });
  },
}));
