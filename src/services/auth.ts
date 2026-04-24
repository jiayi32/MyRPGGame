import {
  getAuth,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export type AuthUser = FirebaseAuthTypes.User;

export async function signInAnonymously(): Promise<AuthUser> {
  const { user } = await firebaseSignInAnonymously(getAuth());
  return user;
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
