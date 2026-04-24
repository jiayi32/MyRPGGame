import { getFirestore, getFunctions } from './firebase';
import { httpsCallable } from '@react-native-firebase/functions';
import { collection, doc } from '@react-native-firebase/firestore';
import {
  EMPTY_REWARD_BUNDLE,
  type EndRunPayload,
  type EndRunResponse,
  type RewardBundle,
  type RunSnapshot,
  type StartRunPayload,
  type StartRunResponse,
  type SubmitStageOutcomePayload,
  type SubmitStageOutcomeResponse,
} from '@/features/run/types';

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asInt = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizeRewardBundle = (value: unknown): RewardBundle => {
  const obj = asRecord(value);
  const gearIdsRaw = obj['gearIds'];
  const gearIds = Array.isArray(gearIdsRaw)
    ? gearIdsRaw.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];

  return {
    gold: Math.max(0, asInt(obj['gold'])),
    ascensionCells: Math.max(0, asInt(obj['ascensionCells'])),
    xpScrollMinor: Math.max(0, asInt(obj['xpScrollMinor'])),
    xpScrollStandard: Math.max(0, asInt(obj['xpScrollStandard'])),
    xpScrollGrand: Math.max(0, asInt(obj['xpScrollGrand'])),
    gearIds,
  };
};

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Unknown callable error.');
};

export const formatCallableError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown; message?: unknown };
    const code = typeof maybe.code === 'string' ? maybe.code : null;
    const message =
      typeof maybe.message === 'string' ? maybe.message : normalizeError(error).message;
    if (code !== null) {
      return `${code}: ${message}`;
    }
    return message;
  }
  return normalizeError(error).message;
};

export const startRun = async (payload: StartRunPayload): Promise<StartRunResponse> => {
  const callable = httpsCallable(getFunctions(), 'startRun');
  const result = await callable(payload);
  const data = asRecord(result.data);

  const runId = asString(data['runId']);
  const activeClassId = asString(data['activeClassId']);
  const seed = asInt(data['seed'], -1);

  if (runId.length === 0 || activeClassId.length === 0 || seed < 0) {
    throw new Error('startRun returned malformed response payload.');
  }

  return {
    runId,
    seed,
    activeClassId,
  };
};

export const submitStageOutcome = async (
  payload: SubmitStageOutcomePayload,
): Promise<SubmitStageOutcomeResponse> => {
  const callable = httpsCallable(getFunctions(), 'submitStageOutcome');
  const result = await callable(payload);
  const data = asRecord(result.data);

  return {
    committed: asBoolean(data['committed']),
    nextStage: asInt(data['nextStage'], payload.stageIndex),
  };
};

export const endRun = async (payload: EndRunPayload): Promise<EndRunResponse> => {
  const callable = httpsCallable(getFunctions(), 'endRun');
  const result = await callable(payload);
  const data = asRecord(result.data);

  return {
    settled: asBoolean(data['settled']),
    bankedRewards: normalizeRewardBundle(data['bankedRewards']),
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
    bankedRewards: normalizeRewardBundle(data['bankedRewards'] ?? EMPTY_REWARD_BUNDLE),
    vaultedRewards: normalizeRewardBundle(data['vaultedRewards'] ?? EMPTY_REWARD_BUNDLE),
    result: data['result'] === 'won' || data['result'] === 'lost' ? data['result'] : 'ongoing',
  };
};
