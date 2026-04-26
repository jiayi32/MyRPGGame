import { getApp, getAuth, getFirestore, getFunctions } from './firebase';
import { httpsCallable } from '@react-native-firebase/functions';
import { collection, doc } from '@react-native-firebase/firestore';
import {
  EMPTY_REWARD_BUNDLE,
  EMPTY_XP_SCROLLS,
  type DevGrantAllClassesResponse,
  type DevResetPlayerResponse,
  type DevSetCurrenciesPayload,
  type DevSetCurrenciesResponse,
  type DevSkipStageResponse,
  type EndRunPayload,
  type EndRunResponse,
  type GetOrCreatePlayerResponse,
  type PlayerSnapshot,
  type ProgressionDelta,
  type RewardBundle,
  type RunSnapshot,
  type StartRunPayload,
  type StartRunResponse,
  type SubmitStageOutcomePayload,
  type SubmitStageOutcomeResponse,
  type XpScrollPouch,
} from '@/features/run/types';

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

const normalizeXpScrolls = (value: unknown): XpScrollPouch => {
  const obj = asRecord(value);
  return {
    minor: Math.max(0, asInt(obj['minor'])),
    standard: Math.max(0, asInt(obj['standard'])),
    grand: Math.max(0, asInt(obj['grand'])),
  };
};

const normalizeRewardBundle = (value: unknown): RewardBundle => {
  const obj = asRecord(value);
  return {
    gold: Math.max(0, asInt(obj['gold'])),
    ascensionCells: Math.max(0, asInt(obj['ascensionCells'])),
    xpScrollMinor: Math.max(0, asInt(obj['xpScrollMinor'])),
    xpScrollStandard: Math.max(0, asInt(obj['xpScrollStandard'])),
    xpScrollGrand: Math.max(0, asInt(obj['xpScrollGrand'])),
    gearIds: asStringArray(obj['gearIds']),
  };
};

const normalizeProgressionDelta = (value: unknown): ProgressionDelta => {
  const obj = asRecord(value);
  const totals = asRecord(obj['playerTotals']);
  return {
    awardedAscensionCells: asInt(obj['awardedAscensionCells']),
    lineageRankDelta: asInt(obj['lineageRankDelta']),
    newlyUnlockedClassIds: asStringArray(obj['newlyUnlockedClassIds']),
    playerTotals: {
      goldBank: Math.max(0, asInt(totals['goldBank'])),
      ascensionCells: Math.max(0, asInt(totals['ascensionCells'])),
      xpScrolls: normalizeXpScrolls(totals['xpScrolls']),
      ownedClassIds: asStringArray(totals['ownedClassIds']),
      lineageRanks: asIntRecord(totals['lineageRanks']),
    },
    gearInstancesCreated: Math.max(0, asInt(obj['gearInstancesCreated'])),
  };
};

const normalizePlayerSnapshot = (value: unknown): PlayerSnapshot => {
  const obj = asRecord(value);
  return {
    uid: asString(obj['uid']),
    goldBank: Math.max(0, asInt(obj['goldBank'])),
    xpScrolls: normalizeXpScrolls(obj['xpScrolls']),
    ascensionCells: Math.max(0, asInt(obj['ascensionCells'])),
    lineageRanks: asIntRecord(obj['lineageRanks']),
    ownedClassIds: asStringArray(obj['ownedClassIds']),
    currentRunId: asNullableString(obj['currentRunId']),
  };
};

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Unknown callable error.');
};

type CallableError = Error & { code?: string };

const makeCallableError = (code: string, message: string): CallableError => {
  const error = new Error(message) as CallableError;
  error.code = code;
  return error;
};

const isUnauthenticatedCallableError = (error: unknown): boolean => {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown; message?: unknown; status?: unknown };
    const code = typeof maybe.code === 'string' ? maybe.code : '';
    const status = typeof maybe.status === 'string' ? maybe.status : '';
    const message = typeof maybe.message === 'string' ? maybe.message : '';
    return /unauthenticated/i.test(`${code} ${status} ${message}`);
  }
  return /unauthenticated/i.test(String(error));
};

const callableEndpoint = (name: string): string => {
  const projectId = getApp().options.projectId;
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Firebase projectId is missing from app options.');
  }

  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (__DEV__ && emulatorHost) {
    return `http://${emulatorHost}:5001/${projectId}/us-central1/${name}`;
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/${name}`;
};

const callCallableViaFetch = async <TPayload, TResult>(
  name: string,
  payload: TPayload,
): Promise<TResult> => {
  const idToken = await getAuth().currentUser?.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(callableEndpoint(name), {
    method: 'POST',
    headers,
    body: JSON.stringify({ data: payload }),
  });

  const rawText = await response.text();
  let parsedBody: unknown = {};
  if (rawText.length > 0) {
    try {
      parsedBody = JSON.parse(rawText) as unknown;
    } catch {
      throw makeCallableError('functions/internal', `${name} returned non-JSON response.`);
    }
  }

  const body = asRecord(parsedBody);
  const errorBody = asRecord(body['error']);
  if (Object.keys(errorBody).length > 0) {
    const status = asString(errorBody['status']);
    const message = asString(errorBody['message'], `${name} failed.`);
    const code =
      status.length > 0
        ? `functions/${status.toLowerCase().replace(/_/g, '-')}`
        : 'functions/internal';
    throw makeCallableError(code, message);
  }

  if (!response.ok) {
    throw makeCallableError('functions/internal', `${name} failed with HTTP ${response.status}.`);
  }

  if ('result' in body) {
    return body['result'] as TResult;
  }
  if ('data' in body) {
    return body['data'] as TResult;
  }

  throw makeCallableError('functions/internal', `${name} returned malformed response payload.`);
};

const callCallable = async <TPayload, TResult>(
  name: string,
  payload: TPayload,
): Promise<TResult> => {
  const callable = httpsCallable(getFunctions(), name);
  try {
    const result = await callable(payload);
    return result.data as TResult;
  } catch (error) {
    if (!isUnauthenticatedCallableError(error)) {
      throw error;
    }
    return callCallableViaFetch<TPayload, TResult>(name, payload);
  }
};

export const formatCallableError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown; message?: unknown };
    const code = typeof maybe.code === 'string' ? maybe.code : null;
    const message =
      typeof maybe.message === 'string' ? maybe.message : normalizeError(error).message;
    if (code === 'auth/network-request-failed') {
      const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
      const hint =
        __DEV__ && emulatorHost
          ? ` — emulator at ${emulatorHost}:9099 unreachable; run: npm run emulators`
          : ` — check internet connection`;
      return `${code}: ${message}${hint}`;
    }
    if (code === 'functions/not-found' || code === 'not-found') {
      const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
      const hint = emulatorHost
        ? ` — emulator may be stale. Restart it: cd into project, Ctrl+C, then \`npm run emulators\`.`
        : ` — Cloud Function not deployed to production. Run: \`firebase deploy --only functions\`.`;
      return `${code}: ${message}${hint}`;
    }
    if (code !== null) {
      return `${code}: ${message}`;
    }
    return message;
  }
  return normalizeError(error).message;
};

export const getOrCreatePlayer = async (): Promise<GetOrCreatePlayerResponse> => {
  const data = asRecord(
    await callCallable<Record<string, never>, unknown>('getOrCreatePlayer', {}),
  );
  return {
    player: normalizePlayerSnapshot(data['player']),
    created: asBoolean(data['created']),
  };
};

export const startRun = async (payload: StartRunPayload): Promise<StartRunResponse> => {
  const data = asRecord(await callCallable<StartRunPayload, unknown>('startRun', payload));

  const runId = asString(data['runId']);
  const activeClassId = asString(data['activeClassId']);
  const seed = asInt(data['seed'], -1);

  if (runId.length === 0 || activeClassId.length === 0 || seed < 0) {
    throw new Error('startRun returned malformed response payload.');
  }

  return { runId, seed, activeClassId };
};

export const submitStageOutcome = async (
  payload: SubmitStageOutcomePayload,
): Promise<SubmitStageOutcomeResponse> => {
  const data = asRecord(
    await callCallable<SubmitStageOutcomePayload, unknown>('submitStageOutcome', payload),
  );

  return {
    committed: asBoolean(data['committed']),
    nextStage: asInt(data['nextStage'], payload.stageIndex),
  };
};

export const endRun = async (payload: EndRunPayload): Promise<EndRunResponse> => {
  const data = asRecord(await callCallable<EndRunPayload, unknown>('endRun', payload));

  return {
    settled: asBoolean(data['settled']),
    bankedRewards: normalizeRewardBundle(data['bankedRewards']),
    progression: normalizeProgressionDelta(data['progression']),
  };
};

export const getRunSnapshot = async (runId: string): Promise<RunSnapshot> => {
  const snap = await doc(collection(getFirestore(), 'runs'), runId).get();
  if (!snap.exists) {
    throw new Error(`Run ${runId} not found.`);
  }

  const data = asRecord(snap.data());
  return {
    id: runId,
    playerId: asString(data['playerId']),
    seed: asInt(data['seed']),
    stage: Math.max(1, asInt(data['stage'], 1)),
    turn: Math.max(0, asInt(data['turn'], 0)),
    activeClassId: asString(data['activeClassId']),
    activeLineageId: asString(data['activeLineageId']),
    evolutionTargetClassId: asNullableString(data['evolutionTargetClassId']),
    bankedRewards: normalizeRewardBundle(data['bankedRewards'] ?? EMPTY_REWARD_BUNDLE),
    vaultedRewards: normalizeRewardBundle(data['vaultedRewards'] ?? EMPTY_REWARD_BUNDLE),
    result: data['result'] === 'won' || data['result'] === 'lost' ? data['result'] : 'ongoing',
  };
};

// ---------------------------------------------------------------------------
// Dev tooling (gated server-side; calls fail with permission-denied in prod
// unless ALLOW_DEV_TOOLS=true)
// ---------------------------------------------------------------------------

export const devSkipStage = async (
  runId: string,
  targetStage: number,
): Promise<DevSkipStageResponse> => {
  const data = asRecord(
    await callCallable<{ runId: string; targetStage: number }, unknown>('devSkipStage', {
      runId,
      targetStage,
    }),
  );
  return { ok: asBoolean(data['ok']), newStage: asInt(data['newStage'], targetStage) };
};

export const devGrantAllClasses = async (): Promise<DevGrantAllClassesResponse> => {
  const data = asRecord(
    await callCallable<Record<string, never>, unknown>('devGrantAllClasses', {}),
  );
  return { ok: asBoolean(data['ok']), ownedClassIds: asStringArray(data['ownedClassIds']) };
};

export const devResetPlayer = async (): Promise<DevResetPlayerResponse> => {
  const data = asRecord(
    await callCallable<Record<string, never>, unknown>('devResetPlayer', {}),
  );
  return {
    ok: asBoolean(data['ok']),
    runsDeleted: asInt(data['runsDeleted']),
    gearDeleted: asInt(data['gearDeleted']),
  };
};

export const devSetCurrencies = async (
  payload: DevSetCurrenciesPayload,
): Promise<DevSetCurrenciesResponse> => {
  const data = asRecord(
    await callCallable<DevSetCurrenciesPayload, unknown>('devSetCurrencies', payload),
  );
  return {
    ok: asBoolean(data['ok']),
    goldBank: asInt(data['goldBank']),
    ascensionCells: asInt(data['ascensionCells']),
    xpScrolls: normalizeXpScrolls(data['xpScrolls']),
  };
};

export const getPlayerSnapshot = async (uid: string): Promise<PlayerSnapshot | null> => {
  const snap = await doc(collection(getFirestore(), 'players'), uid).get();
  if (!snap.exists) return null;
  const data = asRecord(snap.data());
  // Default missing fields so we tolerate older docs gracefully during migration.
  return {
    uid: asString(data['uid'], uid),
    goldBank: Math.max(0, asInt(data['goldBank'])),
    xpScrolls: normalizeXpScrolls(data['xpScrolls'] ?? EMPTY_XP_SCROLLS),
    ascensionCells: Math.max(0, asInt(data['ascensionCells'])),
    lineageRanks: asIntRecord(data['lineageRanks']),
    ownedClassIds: asStringArray(data['ownedClassIds']),
    currentRunId: asNullableString(data['currentRunId']),
  };
};
