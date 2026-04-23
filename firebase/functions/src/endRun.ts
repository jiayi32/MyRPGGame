import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  requireAuth,
  requireDoc,
  requireOwnership,
  requireOngoing,
} from './shared/guards';
import { mergeVaultIntoBank, forfeitVault } from './shared/rewards';
import type { EndRunPayload, EndRunResponse, RunDoc } from './shared/types';

export const endRun = onCall<EndRunPayload, Promise<EndRunResponse>>(
  { enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request);
    const { runId, finalResult } = request.data;

    if (typeof runId !== 'string' || runId.length === 0) {
      throw new HttpsError('invalid-argument', 'runId must be a non-empty string.');
    }
    if (finalResult !== 'won' && finalResult !== 'lost' && finalResult !== 'fled') {
      throw new HttpsError('invalid-argument', 'finalResult must be won | lost | fled.');
    }

    const db = admin.firestore();
    const runRef = db.collection('runs').doc(runId);

    const settled = await db.runTransaction(async (tx) => {
      const runSnap = await tx.get(runRef);
      const runData = requireDoc(runSnap, 'run') as RunDoc;

      requireOwnership(runData, uid);
      requireOngoing(runData);

      // On win: merge vault into banked. On loss or flee: forfeit vault.
      const { banked, vaulted } =
        finalResult === 'won'
          ? mergeVaultIntoBank(runData.bankedRewards, runData.vaultedRewards)
          : forfeitVault(runData.bankedRewards);

      const firestoreResult: 'won' | 'lost' =
        finalResult === 'won' ? 'won' : 'lost';

      tx.update(runRef, {
        result: firestoreResult,
        bankedRewards: banked,
        vaultedRewards: vaulted,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return banked;
    });

    return { settled: true, bankedRewards: settled };
  }
);
