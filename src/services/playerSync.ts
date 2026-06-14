// ─── Player Profile Sync ──────────────────────────────────────────
// Firebase used ONLY for cross-device account access.
// Called at end-of-run and on app startup. Not used during gameplay.

import { getFirestore, getAuth } from './firebase';
import type { RunHistoryEntry } from '@/stores/playerStore';

export interface PlayerProfileDoc {
  uid: string;
  credits: number;
  quantumCores: number;
  scrap: number;
  corpRanks: Record<string, number>;
  specRanks: Record<string, number>;
  unlockedSpecIds: string[];
  unlockedPassiveIds: string[];
  augmentsPicked: number;
  runHistory: RunHistoryEntry[];
  updatedAt: number;
}

/** Save player profile to Firestore for cross-device sync. Non-blocking. */
export const savePlayerProfile = async (profile: Omit<PlayerProfileDoc, 'uid' | 'updatedAt'>): Promise<void> => {
  try {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    const db = getFirestore();
    const { doc, setDoc } = await import('@react-native-firebase/firestore');
    await setDoc(
      doc(db, 'players', uid),
      { uid, ...profile, updatedAt: Date.now() },
      { merge: true },
    );
  } catch {
    // Silently fail — local state is authoritative
  }
};

/** Load player profile from Firestore on app startup. Returns null if no profile exists. */
export const loadPlayerProfile = async (): Promise<PlayerProfileDoc | null> => {
  try {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return null;
    const db = getFirestore();
    const { doc, getDoc } = await import('@react-native-firebase/firestore');
    const snap = await getDoc(doc(db, 'players', uid));
    if (!snap.exists) return null;
    return snap.data() as PlayerProfileDoc;
  } catch {
    return null;
  }
};
