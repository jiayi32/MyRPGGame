describe('smoke', () => {
  it('jest + expo preset are wired', () => {
    expect(1 + 1).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// playerStore auth lifecycle
// ---------------------------------------------------------------------------
//
// Mocks the auth + runApi service modules so the store's bootstrap / signIn /
// signOutAndReset paths can be exercised in isolation. Closes the test gap for
// the Item C auth migration that previously had no automated coverage.

jest.mock('@/services/auth', () => ({
  currentUser: jest.fn(),
  signInAnonymously: jest.fn(),
  signInWithEmail: jest.fn(),
  registerWithEmail: jest.fn(),
  signOut: jest.fn(),
  ensureUsableToken: jest.fn(),
  waitForIdTokenPropagation: jest.fn(),
  onIdTokenChanged: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({
  initializeFirebase: jest.fn().mockResolvedValue(undefined),
  getAuth: jest.fn(() => ({ currentUser: null })),
  getApp: jest.fn(),
  getFirestore: jest.fn(),
  getFunctions: jest.fn(),
}));

jest.mock('@/services/runApi', () => ({
  getOrCreatePlayer: jest.fn(),
  getPlayerSnapshot: jest.fn(),
  formatCallableError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import { currentUser, signInWithEmail, signOut } from '@/services/auth';
import { getAuth } from '@/services/firebase';
import { getOrCreatePlayer } from '@/services/runApi';
import { usePlayerStore } from '@/stores/playerStore';

const mockedCurrentUser = currentUser as jest.MockedFunction<typeof currentUser>;
const mockedSignInWithEmail = signInWithEmail as jest.MockedFunction<typeof signInWithEmail>;
const mockedSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedGetOrCreatePlayer = getOrCreatePlayer as jest.MockedFunction<typeof getOrCreatePlayer>;

const fakePlayer = {
  uid: 'test-uid',
  goldBank: 100,
  ascensionCells: 5,
  xpScrolls: { minor: 2, standard: 1, grand: 0 },
  lineageRanks: { drakehorn_forge: 2 },
  classRanks: { 'drakehorn_forge.ember_initiate': 1 },
  ownedClassIds: ['drakehorn_forge.ember_initiate', 'drakehorn_forge.flame_berserker'],
  currentRunId: null,
};

describe('playerStore auth lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.getState().reset();
  });

  it('starts in idle status with empty profile', () => {
    const state = usePlayerStore.getState();
    expect(state.status).toBe('idle');
    expect(state.uid).toBeNull();
    expect(state.goldBank).toBe(0);
    expect(state.ownedClassIds).toEqual([]);
  });

  it('bootstraps to awaiting_sign_in when no current user is signed in', async () => {
    mockedCurrentUser.mockReturnValue(null);
    const result = await usePlayerStore.getState().bootstrap();

    expect(result).toBeNull();
    expect(usePlayerStore.getState().status).toBe('awaiting_sign_in');
    expect(usePlayerStore.getState().uid).toBeNull();
    expect(mockedGetOrCreatePlayer).not.toHaveBeenCalled();
  });

  it('signIn(success) loads the profile and transitions to ready', async () => {
    // No current user pre-sign-in.
    mockedCurrentUser.mockReturnValue(null);
    mockedSignInWithEmail.mockResolvedValue({ uid: 'test-uid' } as never);
    // After signInWithEmail succeeds, getAuth().currentUser returns a fake user
    // with a getIdToken method that the store calls to refresh the token.
    mockedGetAuth.mockReturnValue({
      currentUser: { getIdToken: jest.fn().mockResolvedValue('fake-token') },
    } as never);
    mockedGetOrCreatePlayer.mockResolvedValue({ player: fakePlayer, created: false });

    const player = await usePlayerStore.getState().signIn('test@test.com', '1234567890');

    expect(player.uid).toBe('test-uid');
    const state = usePlayerStore.getState();
    expect(state.status).toBe('ready');
    expect(state.uid).toBe('test-uid');
    expect(state.goldBank).toBe(100);
    expect(state.ownedClassIds).toContain('drakehorn_forge.ember_initiate');
    expect(mockedSignInWithEmail).toHaveBeenCalledWith('test@test.com', '1234567890');
  });

  it('signIn(failure) surfaces error and stays in awaiting_sign_in', async () => {
    mockedSignInWithEmail.mockRejectedValue(new Error('auth/wrong-password'));
    mockedGetAuth.mockReturnValue({ currentUser: null } as never);

    await expect(usePlayerStore.getState().signIn('test@test.com', 'wrong')).rejects.toThrow();
    const state = usePlayerStore.getState();
    expect(state.status).toBe('awaiting_sign_in');
    expect(state.error).toContain('auth/wrong-password');
    expect(state.uid).toBeNull();
  });

  it('signOutAndReset clears the profile and returns to awaiting_sign_in', async () => {
    // Seed a "signed in" state first.
    mockedCurrentUser.mockReturnValue(null);
    mockedSignInWithEmail.mockResolvedValue({ uid: 'test-uid' } as never);
    mockedGetAuth.mockReturnValue({
      currentUser: { getIdToken: jest.fn().mockResolvedValue('fake-token') },
    } as never);
    mockedGetOrCreatePlayer.mockResolvedValue({ player: fakePlayer, created: false });
    await usePlayerStore.getState().signIn('test@test.com', '1234567890');
    expect(usePlayerStore.getState().status).toBe('ready');

    // Now sign out.
    mockedSignOut.mockResolvedValue(undefined);
    await usePlayerStore.getState().signOutAndReset();

    const state = usePlayerStore.getState();
    expect(state.status).toBe('awaiting_sign_in');
    expect(state.uid).toBeNull();
    expect(state.goldBank).toBe(0);
    expect(state.ownedClassIds).toEqual([]);
    expect(mockedSignOut).toHaveBeenCalled();
  });
});
