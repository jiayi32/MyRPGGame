import { create } from 'zustand';
import {
  currentUser,
  registerWithEmail,
  signInWithEmail,
  signOut,
} from '@/services/auth';
import { initializeFirebase, getAuth } from '@/services/firebase';
import {
  formatCallableError,
  getOrCreatePlayer,
  getPlayerSnapshot,
} from '@/services/runApi';
import {
  EMPTY_DATA_CACHES,
  type PlayerSnapshot,
  type ProgressionDelta,
  type DataCachePouch,
} from '@/features/run/types';

export type PlayerStoreStatus =
  | 'idle'
  | 'initializing'
  | 'awaiting_sign_in'
  | 'signing_in'
  | 'ready'
  | 'error';

export interface RunHistoryEntry {
  runId: string;
  classId: string;
  className: string;
  result: 'won' | 'lost' | 'fled';
  stagesCompleted: number;
  goldEarned: number;
  completedAt: number; // unix ms
}

interface PlayerStoreState {
  status: PlayerStoreStatus;
  error: string | null;
  uid: string | null;
  credits: number;
  dataCaches: DataCachePouch;
  quantumCores: number;
  scrap: number;
  corpRanks: Record<string, number>;
  specRanks: Record<string, number>;
  unlockedSpecIds: string[];
  currentRunId: string | null;
  /** Total augments picked across all runs. Drives tier unlocks (Bronze→Silver→Gold→Prismatic). */
  augmentsPicked: number;
  /** Passives permanently unlocked for future runs (meta-progression). */
  unlockedPassiveIds: string[];
  /** Unlock passives for all future runs. Called after run settlement. */
  unlockPassives: (passiveIds: readonly string[]) => void;
  /** Run history — last 10 runs with summary stats. */
  runHistory: RunHistoryEntry[];
  /** Add a completed run to history. */
  addRunToHistory: (entry: RunHistoryEntry) => void;
  /**
   * Initialize Firebase and resolve auth state.
   * - If a user is already signed in (Firebase persists across launches), bootstraps the profile.
   * - If no user, transitions to 'awaiting_sign_in' for the SignInScreen to take over.
   */
  bootstrap: () => Promise<PlayerSnapshot | null>;
  /** Sign in with email+password and load profile. */
  signIn: (email: string, password: string) => Promise<PlayerSnapshot>;
  /** Register a new email+password account, then load profile. */
  register: (email: string, password: string) => Promise<PlayerSnapshot>;
  /** Sign out and reset local state. */
  signOutAndReset: () => Promise<void>;
  refresh: () => Promise<PlayerSnapshot>;
  applyPlayerSnapshot: (snapshot: PlayerSnapshot) => void;
  applyEndRunDelta: (delta: ProgressionDelta, currentRunId: string | null) => void;
  incrementAugmentsPicked: () => void;
  reset: () => void;
}

const cloneDataCaches = (s: DataCachePouch): DataCachePouch => ({
  minor: s.minor,
  standard: s.standard,
  grand: s.grand,
});

const applyPlayerToState = (snap: PlayerSnapshot): Partial<PlayerStoreState> => ({
  uid: snap.uid,
  credits: snap.credits,
  dataCaches: cloneDataCaches(snap.dataCaches),
  quantumCores: snap.quantumCores,
  scrap: snap.scrap,
  corpRanks: { ...snap.corpRanks },
  specRanks: { ...snap.specRanks },
  unlockedSpecIds: [...snap.unlockedSpecIds],
  currentRunId: snap.currentRunId,
  augmentsPicked: snap.augmentsPicked ?? 0,
  unlockedPassiveIds: (snap as any).unlockedPassiveIds ?? [],
});

const EMPTY_STATE: Pick<
  PlayerStoreState,
  | 'uid'
  | 'credits'
  | 'dataCaches'
  | 'quantumCores'
  | 'scrap'
  | 'corpRanks'
  | 'specRanks'
  | 'unlockedSpecIds'
  | 'currentRunId'
  | 'augmentsPicked'
> = {
  uid: null,
  credits: 0,
  dataCaches: cloneDataCaches(EMPTY_DATA_CACHES),
  quantumCores: 0,
  scrap: 0,
  corpRanks: {},
  specRanks: {},
  unlockedSpecIds: [],
  currentRunId: null,
  augmentsPicked: 0,
  unlockedPassiveIds: [],
  runHistory: [],
};

const loadProfileForCurrentUser = async (): Promise<PlayerSnapshot> => {
  const { player } = await getOrCreatePlayer();
  return player;
};

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  status: 'idle',
  error: null,
  ...EMPTY_STATE,

  bootstrap: async () => {
    if (get().status === 'ready' && get().uid !== null) {
      return get().refresh();
    }

    set({ status: 'initializing', error: null });
    try {
      await initializeFirebase();
      // Firebase Auth persists session across app restarts. If a user is
      // already signed in, skip the SignInScreen and load their profile.
      const existing = currentUser();
      if (existing !== null) {
        // Refresh the token so callables don't fail with stale tokens.
        await existing.getIdToken(true);
        const player = await loadProfileForCurrentUser();
        set({ ...applyPlayerToState(player), status: 'ready', error: null });
        return player;
      }
      set({ status: 'awaiting_sign_in', error: null, ...EMPTY_STATE });
      return null;
    } catch (error) {
      set({ status: 'error', error: formatCallableError(error) });
      throw error;
    }
  },

  signIn: async (email, password) => {
    set({ status: 'signing_in', error: null });
    try {
      await initializeFirebase();
      await signInWithEmail(email, password);
      // Force a token refresh so the next callable carries fresh creds.
      await getAuth().currentUser?.getIdToken(true);
      const player = await loadProfileForCurrentUser();
      set({ ...applyPlayerToState(player), status: 'ready', error: null });
      return player;
    } catch (error) {
      set({ status: 'awaiting_sign_in', error: formatCallableError(error) });
      throw error;
    }
  },

  register: async (email, password) => {
    set({ status: 'signing_in', error: null });
    try {
      await initializeFirebase();
      await registerWithEmail(email, password);
      await getAuth().currentUser?.getIdToken(true);
      const player = await loadProfileForCurrentUser();
      set({ ...applyPlayerToState(player), status: 'ready', error: null });
      return player;
    } catch (error) {
      set({ status: 'awaiting_sign_in', error: formatCallableError(error) });
      throw error;
    }
  },

  signOutAndReset: async () => {
    try {
      await signOut();
    } finally {
      set({ status: 'awaiting_sign_in', error: null, ...EMPTY_STATE });
    }
  },

  refresh: async () => {
    const uid = get().uid;
    if (uid === null) {
      throw new Error('playerStore.refresh called before bootstrap.');
    }
    const snap = await getPlayerSnapshot(uid);
    if (!snap) {
      throw new Error(`Player doc for ${uid} not found.`);
    }
    set({ ...applyPlayerToState(snap), status: 'ready', error: null });
    return snap;
  },

  applyPlayerSnapshot: (snapshot) => {
    set({ ...applyPlayerToState(snapshot), status: 'ready', error: null });
  },

  applyEndRunDelta: (delta, currentRunId) => {
    const totals = delta.playerTotals;
    set({
      credits: totals.credits,
      dataCaches: cloneDataCaches(totals.dataCaches),
      quantumCores: totals.quantumCores,
      scrap: totals.scrap,
      corpRanks: { ...totals.corpRanks },
      specRanks: { ...totals.specRanks },
      unlockedSpecIds: [...totals.unlockedSpecIds],
      currentRunId,
      augmentsPicked: delta.augmentsPicked ?? get().augmentsPicked,
    });
  },

  incrementAugmentsPicked: () => {
    set({ augmentsPicked: get().augmentsPicked + 1 });
  },

  unlockPassives: (passiveIds) => {
    const current = new Set(get().unlockedPassiveIds);
    for (const id of passiveIds) current.add(id);
    set({ unlockedPassiveIds: [...current] });
  },

  addRunToHistory: (entry) => {
    const history = [entry, ...get().runHistory].slice(0, 10);
    set({ runHistory: history });
  },

  reset: () => {
    set({ status: 'idle', error: null, ...EMPTY_STATE });
  },
}));
