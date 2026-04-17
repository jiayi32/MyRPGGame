/**
 * Shared idempotency helper for awardXP / awardGold.
 *
 * Stores composite keys ("referenceId::reason") inside the userGameProfile
 * document so the idempotency check happens within the same Firestore
 * transaction — no extra collection query required.
 */

const AWARD_KEY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_AWARDED_KEYS = 1000;
const IDEMPOTENCY_LEGACY_MODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let rewardIdempotencyLegacyUntil = 0;
let fallbackLogPrinted = false;

/**
 * Build a Firestore-safe idempotency doc ID from reward attributes.
 * Keeps IDs deterministic and avoids slash/whitespace issues.
 */
export function buildRewardIdempotencyDocId(
  userId: string,
  referenceId: string,
  reason: string,
): string {
  const sanitize = (value: string) => value.replace(/[^A-Za-z0-9._-]/g, '_');
  return `${sanitize(userId)}__${sanitize(referenceId)}__${sanitize(reason)}`;
}

/**
 * Check if a (referenceId, reason) pair has already been awarded,
 * and produce an updated keys map with the new key added and stale entries pruned.
 *
 * Pure function — no Firestore calls.
 */
export function checkAndUpdateAwardedKeys(
  existingKeys: Record<string, number> | undefined,
  referenceId: string,
  reason: string,
): { isDuplicate: boolean; updatedKeys: Record<string, number> } {
  const awardedKeys = existingKeys || {};
  const compositeKey = `${referenceId}::${reason}`;

  if (compositeKey in awardedKeys) {
    return { isDuplicate: true, updatedKeys: awardedKeys };
  }

  // Prune entries older than 7 days
  const cutoff = Date.now() - AWARD_KEY_TTL_MS;
  const entries = Object.entries(awardedKeys).filter(([, ts]) => ts > cutoff);

  // If still over cap after time pruning, drop oldest entries
  if (entries.length >= MAX_AWARDED_KEYS) {
    entries.sort((a, b) => a[1] - b[1]);
    entries.splice(0, entries.length - MAX_AWARDED_KEYS + 1);
  }

  const prunedKeys: Record<string, number> = Object.fromEntries(entries);
  prunedKeys[compositeKey] = Date.now();

  return { isDuplicate: false, updatedKeys: prunedKeys };
}

/** True when reward idempotency doc reads should be bypassed temporarily. */
export function shouldUseLegacyRewardIdempotency(now: number = Date.now()): boolean {
  return rewardIdempotencyLegacyUntil > now;
}

/**
 * Mark reward idempotency collection as temporarily unavailable.
 * Returns true once per legacy window so callers can avoid log spam.
 */
export function markRewardIdempotencyPermissionDenied(now: number = Date.now()): boolean {
  rewardIdempotencyLegacyUntil = Math.max(
    rewardIdempotencyLegacyUntil,
    now + IDEMPOTENCY_LEGACY_MODE_TTL_MS,
  );
  if (fallbackLogPrinted) return false;
  fallbackLogPrinted = true;
  return true;
}

/**
 * Reset one-shot fallback logging when the legacy window expires.
 * Call this at operation start to keep fallback logging bounded.
 */
export function maybeResetRewardIdempotencyMode(now: number = Date.now()): void {
  if (rewardIdempotencyLegacyUntil <= now) {
    fallbackLogPrinted = false;
  }
}

export function isPermissionDeniedError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'permission-denied') return true;

  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message.toLowerCase().includes('permission-denied');
}
