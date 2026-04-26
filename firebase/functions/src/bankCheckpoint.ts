import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  requireAuth,
  requireDoc,
  requireOwnership,
  requireOngoing,
  requireCheckpointStage,
  requirePayloadSize,
  requireRateLimit,
} from './shared/guards';
import { mergeVaultIntoBank } from './shared/rewards';
import type { BankCheckpointPayload, BankCheckpointResponse, RunDoc } from './shared/types';

export const bankCheckpoint = onCall<BankCheckpointPayload, Promise<BankCheckpointResponse>>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 1024, 'bankCheckpoint.data');
    const uid = requireAuth(request);
    // Cap: 12 banks/min — checkpoints are rare (3 per run), this is generous.
    requireRateLimit(`bankCheckpoint:${uid}`, 12, 60_000);
    const { runId } = request.data;

    if (typeof runId !== 'string' || runId.length === 0) {
      throw new HttpsError('invalid-argument', 'runId must be a non-empty string.');
    }

    const db = admin.firestore();
    const runRef = db.collection('runs').doc(runId);

    const settled = await db.runTransaction(async (tx) => {
      const runSnap = await tx.get(runRef);
      const runData = requireDoc(runSnap, 'run') as RunDoc;

      requireOwnership(runData, uid);
      requireOngoing(runData);
      requireCheckpointStage(runData);

      const { banked, vaulted } = mergeVaultIntoBank(runData.bankedRewards, runData.vaultedRewards);

      tx.update(runRef, {
        bankedRewards: banked,
        vaultedRewards: vaulted,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return banked;
    });

    return { banked: settled };
  }
);
