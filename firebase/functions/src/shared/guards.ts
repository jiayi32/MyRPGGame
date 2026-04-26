import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import type { RunDoc } from './types';

export const CHECKPOINT_STAGES = new Set([10, 20, 30]);

// ---------------------------------------------------------------------------
// Payload size guard
// ---------------------------------------------------------------------------

/** Default max bytes for a callable payload (JSON-serialized). 16 KiB is generous for our shapes. */
export const DEFAULT_MAX_PAYLOAD_BYTES = 16 * 1024;

/** Throws invalid-argument if the JSON-serialized payload exceeds the byte cap. */
export function requirePayloadSize(
  data: unknown,
  maxBytes: number = DEFAULT_MAX_PAYLOAD_BYTES,
  label = 'payload'
): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(data ?? null);
  } catch {
    throw new HttpsError('invalid-argument', `${label} is not JSON-serializable.`);
  }
  // Byte length of the UTF-8 encoded string (Buffer.byteLength is exact for UTF-8).
  const bytes = Buffer.byteLength(serialized, 'utf8');
  if (bytes > maxBytes) {
    throw new HttpsError(
      'invalid-argument',
      `${label} size ${bytes}B exceeds cap ${maxBytes}B.`
    );
  }
}

// ---------------------------------------------------------------------------
// Per-uid rate limit (sliding window, in-memory per warm instance)
// ---------------------------------------------------------------------------
// Note: This is best-effort throttling per warm Cloud Function instance, not a
// distributed limit. With maxInstances bounded on each callable, an attacker
// could still horizontally fan out across instances, but the per-instance cap
// keeps a single bad client from saturating one instance and causing cost runs.
// For stronger limits, move to a Firestore counter or Cloud Tasks queue in P6.

interface RateWindow {
  count: number;
  windowStart: number;
}

const rateWindows = new Map<string, RateWindow>();
const MAX_TRACKED_KEYS = 5000; // bounded to prevent unbounded growth on cold instances

/**
 * Throws resource-exhausted if `key` has exceeded `maxPerWindow` in the last `windowMs`.
 * Resets when the window rolls over.
 */
export function requireRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): void {
  const now = Date.now();
  const existing = rateWindows.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    if (rateWindows.size >= MAX_TRACKED_KEYS) {
      // Evict oldest-window entries to bound memory.
      for (const [k, w] of rateWindows) {
        if (now - w.windowStart >= windowMs) rateWindows.delete(k);
        if (rateWindows.size < MAX_TRACKED_KEYS) break;
      }
    }
    rateWindows.set(key, { count: 1, windowStart: now });
    return;
  }

  existing.count += 1;
  if (existing.count > maxPerWindow) {
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded: ${key} (>${maxPerWindow}/${windowMs}ms).`
    );
  }
}

/** Test helper — clears the rate window cache. Not exported via index. */
export function __resetRateLimitsForTest(): void {
  rateWindows.clear();
}

// ---------------------------------------------------------------------------
// Dev-tool gate
// ---------------------------------------------------------------------------

/**
 * Throws permission-denied unless the runtime allows dev callables.
 * Allowed when `process.env.ALLOW_DEV_TOOLS === 'true'` OR the functions
 * runtime is running under the Firebase emulator (`FUNCTIONS_EMULATOR === 'true'`).
 *
 * In production, set ALLOW_DEV_TOOLS=true via `firebase functions:config:set` only on
 * staging/private projects. The default (false) means dev callables 401 in prod.
 */
export function requireDevTools(): void {
  const allowFlag = process.env['ALLOW_DEV_TOOLS'] === 'true';
  const inEmulator = process.env['FUNCTIONS_EMULATOR'] === 'true';
  if (!allowFlag && !inEmulator) {
    throw new HttpsError(
      'permission-denied',
      'Dev tooling is disabled in this environment. Set ALLOW_DEV_TOOLS=true to enable.',
    );
  }
}

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
