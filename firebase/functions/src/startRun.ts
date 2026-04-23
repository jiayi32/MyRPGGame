import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from './shared/guards';
import { emptyReward } from './shared/rewards';
import type { StartRunPayload, StartRunResponse, RunDoc } from './shared/types';

export const startRun = onCall<StartRunPayload, Promise<StartRunResponse>>(
  { enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request);
    const { activeClassId } = request.data;

    if (typeof activeClassId !== 'string' || activeClassId.length === 0) {
      throw new HttpsError('invalid-argument', 'activeClassId must be a non-empty string.');
    }

    const db = admin.firestore();
    const now = FieldValue.serverTimestamp();

    // Cryptographically random 32-bit unsigned seed.
    const seed = Math.floor(Math.random() * 0x100000000);

    const runRef = db.collection('runs').doc();
    const runDoc: Omit<RunDoc, 'createdAt' | 'updatedAt'> & {
      createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
      updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
    } = {
      playerId: uid,
      seed,
      stage: 1,
      turn: 0,
      activeClassId,
      bankedRewards: emptyReward(),
      vaultedRewards: emptyReward(),
      result: 'ongoing',
      createdAt: now,
      updatedAt: now,
    };

    await runRef.set(runDoc);

    return {
      runId: runRef.id,
      seed,
      activeClassId,
    };
  }
);
