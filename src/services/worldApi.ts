// ─── World API ────────────────────────────────────────────────────
// Persistent-world service replacing the roguelite runApi.ts.
// Handles character sync, encounter submission, and world state.

import { getApp, getAuth, getFirestore, getFunctions } from './firebase';
import { httpsCallable } from '@react-native-firebase/functions';
import { doc, getDoc } from '@react-native-firebase/firestore';
import type { WorldPosition } from '@/domain/world/types';

// ─── Normalizers ───────────────────────────────────────────────────

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asInt = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
};

const asIntRecord = (value: unknown): Record<string, number> => {
  const obj = asRecord(value);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.trunc(v);
  }
  return out;
};

// ─── Types ─────────────────────────────────────────────────────────

export interface EncounterResult {
  readonly spawnId: string;
  readonly spawnType: string;
  readonly tier: number;
  readonly outcome: 'won' | 'lost' | 'fled';
  readonly xpGained: number;
  readonly creditsGained: number;
  readonly lootIds: readonly string[];
  readonly hpRemaining: number;
  readonly elapsedSeconds: number;
  readonly position: WorldPosition;
}

export interface CharacterSnapshot {
  readonly uid: string;
  readonly characterName: string;
  readonly level: number;
  readonly xp: number;
  readonly activeSpecId: string | null;
  readonly unlockedSpecIds: readonly string[];
  readonly corpRanks: Record<string, number>;
  readonly credits: number;
  readonly techPoints: number;
  readonly scrap: number;
  readonly quantumCores: number;
  readonly equippedWeaponId: string | null;
  readonly equippedArmorId: string | null;
  readonly equippedAccessoryIds: readonly string[];
  readonly inventoryIds: readonly string[];
  readonly augmentsPicked: number;
}

export interface GetOrCreatePlayerResponse {
  readonly player: CharacterSnapshot;
  readonly created: boolean;
}

export interface SubmitEncounterPayload {
  readonly spawnId: string;
  readonly spawnType: string;
  readonly tier: number;
  readonly outcome: 'won' | 'lost' | 'fled';
  readonly xpGained: number;
  readonly creditsGained: number;
  readonly lootIds: readonly string[];
  readonly hpRemaining: number;
  readonly elapsedSeconds: number;
}

export interface SubmitEncounterResponse {
  readonly committed: boolean;
  readonly levelUps: number;
  readonly newUnlocks: readonly string[];
}

export interface UpdateLocationPayload {
  readonly lat: number;
  readonly lng: number;
}

export interface SyncCharacterPayload {
  readonly characterName: string;
  readonly level: number;
  readonly xp: number;
  readonly activeSpecId: string | null;
  readonly credits: number;
  readonly techPoints: number;
}

// ─── Normalizer Helpers ────────────────────────────────────────────

const normalizeCharacterSnapshot = (value: unknown): CharacterSnapshot => {
  const obj = asRecord(value);
  return {
    uid: asString(obj['uid']),
    characterName: asString(obj['characterName'], 'Runner'),
    level: Math.max(1, asInt(obj['level'], 1)),
    xp: Math.max(0, asInt(obj['xp'])),
    activeSpecId: asNullableString(obj['activeSpecId']),
    unlockedSpecIds: asStringArray(obj['unlockedSpecIds']),
    corpRanks: asIntRecord(obj['corpRanks']),
    credits: Math.max(0, asInt(obj['credits'])),
    techPoints: Math.max(0, asInt(obj['techPoints'])),
    scrap: Math.max(0, asInt(obj['scrap'])),
    quantumCores: Math.max(0, asInt(obj['quantumCores'])),
    equippedWeaponId: asNullableString(obj['equippedWeaponId']),
    equippedArmorId: asNullableString(obj['equippedArmorId']),
    equippedAccessoryIds: asStringArray(obj['equippedAccessoryIds']),
    inventoryIds: asStringArray(obj['inventoryIds']),
    augmentsPicked: Math.max(0, asInt(obj['augmentsPicked'])),
  };
};

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Unknown callable error.');
};

export const formatCallableError = (error: unknown): string =>
  normalizeError(error).message;

// ─── Auth Helpers ──────────────────────────────────────────────────

const requireAuth = () => {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated.');
  return user;
};

// ─── API Functions ─────────────────────────────────────────────────

/** Get or create the player's character profile. */
export async function getOrCreatePlayer(): Promise<GetOrCreatePlayerResponse> {
  try {
    const user = requireAuth();
    const fn = httpsCallable(getFunctions(), 'getOrCreatePlayer');
    const result = await fn({});
    const data = asRecord((result as { data?: unknown }).data);
    return {
      player: normalizeCharacterSnapshot(data['player']),
      created: asBoolean(data['created']),
    };
  } catch (error) {
    console.error('[worldApi] getOrCreatePlayer failed:', error);
    throw normalizeError(error);
  }
}

/** Get the player's latest character snapshot from Firestore. */
export async function getCharacterSnapshot(): Promise<CharacterSnapshot> {
  try {
    const user = requireAuth();
    const snap = await getDoc(doc(getFirestore(), 'players', user.uid));
    if (!snap.exists) throw new Error('Player document not found.');
    const data = snap.data();
    return normalizeCharacterSnapshot(data);
  } catch (error) {
    console.error('[worldApi] getCharacterSnapshot failed:', error);
    throw normalizeError(error);
  }
}

/** Submit an encounter result to the server for validation and rewards. */
export async function submitEncounter(
  payload: SubmitEncounterPayload,
): Promise<SubmitEncounterResponse> {
  try {
    requireAuth();
    const fn = httpsCallable(getFunctions(), 'submitEncounter');
    const result = await fn(payload);
    const data = asRecord((result as { data?: unknown }).data);
    return {
      committed: asBoolean(data['committed']),
      levelUps: asInt(data['levelUps']),
      newUnlocks: asStringArray(data['newUnlocks']),
    };
  } catch (error) {
    console.error('[worldApi] submitEncounter failed:', error);
    throw normalizeError(error);
  }
}

/** Update the player's location for spawn validation. */
export async function updateLocation(payload: UpdateLocationPayload): Promise<void> {
  try {
    requireAuth();
    const fn = httpsCallable(getFunctions(), 'updatePlayerLocation');
    await fn(payload);
  } catch (error) {
    console.error('[worldApi] updateLocation failed:', error);
    // Non-critical — don't throw
  }
}

/** Sync full character state to the server. */
export async function syncCharacter(payload: SyncCharacterPayload): Promise<void> {
  try {
    requireAuth();
    const fn = httpsCallable(getFunctions(), 'syncCharacter');
    await fn(payload);
  } catch (error) {
    console.error('[worldApi] syncCharacter failed:', error);
    // Non-critical — don't throw
  }
}
