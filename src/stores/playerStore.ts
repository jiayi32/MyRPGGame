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
  EMPTY_XP_SCROLLS,
  type PlayerSnapshot,
  type ProgressionDelta,
  type XpScrollPouch,
} from '@/features/run/types';

export type PlayerStoreStatus =
  | 'idle'
  | 'initializing'
  | 'awaiting_sign_in'
  | 'signing_in'
  | 'ready'
  | 'error';

interface PlayerStoreState {
  status: PlayerStoreStatus;
  error: string | null;
  uid: string | null;
  goldBank: number;
  xpScrolls: XpScrollPouch;
  ascensionCells: number;
  lineageRanks: Record<string, number>;
  ownedClassIds: string[];
  currentRunId: string | null;
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
  applyEndRunDelta: (delta: ProgressionDelta, currentRunId: string | null) => void;
  reset: () => void;
}

const cloneXpScrolls = (s: XpScrollPouch): XpScrollPouch => ({
  minor: s.minor,
  standard: s.standard,
  grand: s.grand,
});

const applyPlayerToState = (snap: PlayerSnapshot): Partial<PlayerStoreState> => ({
  uid: snap.uid,
  goldBank: snap.goldBank,
  xpScrolls: cloneXpScrolls(snap.xpScrolls),
  ascensionCells: snap.ascensionCells,
  lineageRanks: { ...snap.lineageRanks },
  ownedClassIds: [...snap.ownedClassIds],
  currentRunId: snap.currentRunId,
});

const EMPTY_STATE: Pick<
  PlayerStoreState,
  'uid' | 'goldBank' | 'xpScrolls' | 'ascensionCells' | 'lineageRanks' | 'ownedClassIds' | 'currentRunId'
> = {
  uid: null,
  goldBank: 0,
  xpScrolls: cloneXpScrolls(EMPTY_XP_SCROLLS),
  ascensionCells: 0,
  lineageRanks: {},
  ownedClassIds: [],
  currentRunId: null,
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

  applyEndRunDelta: (delta, currentRunId) => {
    const totals = delta.playerTotals;
    set({
      goldBank: totals.goldBank,
      xpScrolls: cloneXpScrolls(totals.xpScrolls),
      ascensionCells: totals.ascensionCells,
      lineageRanks: { ...totals.lineageRanks },
      ownedClassIds: [...totals.ownedClassIds],
      currentRunId,
    });
  },

  reset: () => {
    set({ status: 'idle', error: null, ...EMPTY_STATE });
  },
}));
