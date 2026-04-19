import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type AuthUser = FirebaseAuthTypes.User;

export async function signInAnonymously(): Promise<AuthUser> {
  const { user } = await auth().signInAnonymously();
  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { user } = await auth().signInWithEmailAndPassword(email, password);
  return user;
}

export async function registerWithEmail(email: string, password: string): Promise<AuthUser> {
  const { user } = await auth().createUserWithEmailAndPassword(email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await auth().signOut();
}

export function currentUser(): AuthUser | null {
  return auth().currentUser;
}

export function onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
  return auth().onAuthStateChanged(listener);
}
