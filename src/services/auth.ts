import {
  getAuth,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  onIdTokenChanged as firebaseOnIdTokenChanged,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export type AuthUser = FirebaseAuthTypes.User;

const isLikelyUnsignedJwt = (token: string): boolean => token.startsWith('eyJhbGciOiJub25l');

const waitForIdTokenPropagation = async (user: AuthUser): Promise<void> => {
  await new Promise<void>((resolve) => {
    let settled = false;
    let unsubscribe: () => void = () => undefined;

    const complete = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      resolve();
    };

    const timeout = setTimeout(complete, 1200);
    unsubscribe = firebaseOnIdTokenChanged(getAuth(), (nextUser) => {
      if (nextUser?.uid !== user.uid) {
        return;
      }
      clearTimeout(timeout);
      complete();
    });
  });
};

const ensureUsableToken = async (user: AuthUser): Promise<AuthUser> => {
  const token = await user.getIdToken(true);
  await waitForIdTokenPropagation(user);
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (!emulatorHost && isLikelyUnsignedJwt(token)) {
    await firebaseSignOut(getAuth());
    const { user: refreshedUser } = await firebaseSignInAnonymously(getAuth());
    const refreshedToken = await refreshedUser.getIdToken(true);
    await waitForIdTokenPropagation(refreshedUser);
    if (isLikelyUnsignedJwt(refreshedToken)) {
      throw new Error(
        'Auth produced an emulator-style token while emulator host is disabled. Fully close and reopen the Android app.',
      );
    }
    return refreshedUser;
  }
  return user;
};

export async function signInAnonymously(): Promise<AuthUser> {
  const existing = getAuth().currentUser;
  if (existing) {
    return ensureUsableToken(existing);
  }
  const { user } = await firebaseSignInAnonymously(getAuth());
  return ensureUsableToken(user);
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { user } = await firebaseSignInWithEmailAndPassword(getAuth(), email, password);
  return user;
}

export async function registerWithEmail(email: string, password: string): Promise<AuthUser> {
  const { user } = await firebaseCreateUserWithEmailAndPassword(getAuth(), email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuth());
}

export function currentUser(): AuthUser | null {
  return getAuth().currentUser;
}

export function onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
  return firebaseOnAuthStateChanged(getAuth(), listener);
}
