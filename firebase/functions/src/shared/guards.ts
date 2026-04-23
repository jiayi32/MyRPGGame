import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import type { RunDoc } from './types';

export const CHECKPOINT_STAGES = new Set([10, 20, 30]);

/** Throws unauthenticated error if request carries no auth. */
export function requireAuth(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  return uid;
}

/** Asserts that a Firestore document exists; throws not-found if missing. */
export function requireDoc(
  snap: DocumentSnapshot<DocumentData>,
  label: string
): DocumentData {
  if (!snap.exists) {
    throw new HttpsError('not-found', `${label} not found.`);
  }
  return snap.data() as DocumentData;
}

/** Asserts caller owns the run. */
export function requireOwnership(run: RunDoc, callerUid: string): void {
  if (run.playerId !== callerUid) {
    throw new HttpsError('permission-denied', 'Not your run.');
  }
}

/** Asserts the run has no terminal result (i.e. is ongoing). */
export function requireOngoing(run: RunDoc): void {
  if (run.result != null && run.result !== 'ongoing') {
    throw new HttpsError('failed-precondition', 'Run is already finished.');
  }
}

/** Asserts the stage index matches the run's current stage. */
export function requireStageMatch(run: RunDoc, stageIndex: number): void {
  if (run.stage !== stageIndex) {
    throw new HttpsError(
      'failed-precondition',
      `Stage mismatch: expected ${run.stage}, got ${stageIndex}.`
    );
  }
}

/** Asserts the current stage is a checkpoint stage (10, 20, or 30). */
export function requireCheckpointStage(run: RunDoc): void {
  if (!CHECKPOINT_STAGES.has(run.stage)) {
    throw new HttpsError(
      'failed-precondition',
      `Stage ${run.stage} is not a checkpoint stage.`
    );
  }
}

/** Validates reward bundle fields are non-negative integers. */
export function validateRewardBundle(rewards: unknown, label = 'rewards'): void {
  if (!rewards || typeof rewards !== 'object') {
    throw new HttpsError('invalid-argument', `${label} must be an object.`);
  }
  const r = rewards as Record<string, unknown>;
  const numericFields = [
    'gold',
    'ascensionCells',
    'xpScrollMinor',
    'xpScrollStandard',
    'xpScrollGrand',
  ] as const;
  for (const field of numericFields) {
    const v = r[field];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
      throw new HttpsError(
        'invalid-argument',
        `${label}.${field} must be a non-negative integer.`
      );
    }
  }
  if (!Array.isArray(r['gearIds'])) {
    throw new HttpsError('invalid-argument', `${label}.gearIds must be an array.`);
  }
  for (const id of r['gearIds'] as unknown[]) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new HttpsError('invalid-argument', `${label}.gearIds entries must be non-empty strings.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Reward plausibility caps (loose, server-side sanity checks)
// ---------------------------------------------------------------------------
const REWARD_CAPS = {
  gold: 50_000,
  ascensionCells: 10,
  xpScrollMinor: 20,
  xpScrollStandard: 10,
  xpScrollGrand: 3,
  gearIds: 5,   // max gear drops per stage
};

/** Throws if any reward field exceeds documented plausibility cap. */
export function validateRewardPlausibility(rewards: Record<string, unknown>): void {
  const numericCaps = [
    'gold',
    'ascensionCells',
    'xpScrollMinor',
    'xpScrollStandard',
    'xpScrollGrand',
  ] as const;
  for (const field of numericCaps) {
    const cap = REWARD_CAPS[field];
    const v = rewards[field] as number;
    if (v > cap) {
      throw new HttpsError(
        'invalid-argument',
        `${field} ${v} exceeds plausibility cap ${cap}.`
      );
    }
  }
  const gearIds = rewards['gearIds'] as string[];
  if (gearIds.length > REWARD_CAPS.gearIds) {
    throw new HttpsError(
      'invalid-argument',
      `gearIds length ${gearIds.length} exceeds plausibility cap ${REWARD_CAPS.gearIds}.`
    );
  }
}
