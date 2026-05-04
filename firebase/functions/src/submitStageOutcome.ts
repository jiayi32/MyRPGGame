import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  requireAuth,
  requireDoc,
  requireOwnership,
  requireOngoing,
  requireStageMatch,
  requirePayloadSize,
  requireRateLimit,
  validateRewardBundle,
  validateRewardPlausibility,
} from './shared/guards';
import { addRewards, applyVaultMultiplier, splitRewards } from './shared/rewards';
import type {
  SubmitStageOutcomePayload,
  SubmitStageOutcomeResponse,
  RunDoc,
  StageOutcomeDoc,
} from './shared/types';

export const submitStageOutcome = onCall<
  SubmitStageOutcomePayload,
  Promise<SubmitStageOutcomeResponse>
>(
  { enforceAppCheck: false, maxInstances: 100, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 4096, 'submitStageOutcome.data');
    const uid = requireAuth(request);
    // Cap: 60 submits/min per user — covers fast play (~1/s) but blocks brute-force.
    requireRateLimit(`submitStageOutcome:${uid}`, 60, 60_000);
    const { runId, stageIndex, result, rewards, hpRemaining, elapsedSeconds } = request.data;

    if (typeof runId !== 'string' || runId.length === 0) {
      throw new HttpsError('invalid-argument', 'runId must be a non-empty string.');
    }
    if (!Number.isInteger(stageIndex) || stageIndex < 1 || stageIndex > 30) {
      throw new HttpsError('invalid-argument', 'stageIndex must be 1..30.');
    }
    if (result !== 'won' && result !== 'lost' && result !== 'fled') {
      throw new HttpsError('invalid-argument', 'result must be won | lost | fled.');
    }
    validateRewardBundle(rewards);
    validateRewardPlausibility(rewards as unknown as Record<string, unknown>);
    if (typeof hpRemaining !== 'number' || hpRemaining < 0) {
      throw new HttpsError('invalid-argument', 'hpRemaining must be >= 0.');
    }
    if (typeof elapsedSeconds !== 'number' || elapsedSeconds < 0) {
      throw new HttpsError('invalid-argument', 'elapsedSeconds must be >= 0.');
    }

    const db = admin.firestore();
    const runRef = db.collection('runs').doc(runId);
    const checkpointRef = runRef.collection('checkpoints').doc(String(stageIndex));

    const nextStage = await db.runTransaction(async (tx) => {
      const runSnap = await tx.get(runRef);
      const runData = requireDoc(runSnap, 'run') as RunDoc;

      requireOwnership(runData, uid);
      requireOngoing(runData);
      requireStageMatch(runData, stageIndex);

      // Guard idempotency: checkpoint must not already exist.
      const cpSnap = await tx.get(checkpointRef);
      if (cpSnap.exists) {
        throw new HttpsError('already-exists', `Checkpoint for stage ${stageIndex} already committed.`);
      }

      const now = FieldValue.serverTimestamp();
      const stageOutcome: Omit<StageOutcomeDoc, 'clientSubmittedAt' | 'serverCommittedAt'> & {
        clientSubmittedAt: ReturnType<typeof FieldValue.serverTimestamp>;
        serverCommittedAt: ReturnType<typeof FieldValue.serverTimestamp>;
      } = {
        playerId: uid,
        runId,
        stageIndex,
        result,
        rewards,
        hpRemaining,
        elapsedSeconds,
        clientSubmittedAt: now,
        serverCommittedAt: now,
      };
      tx.set(checkpointRef, stageOutcome);

      const { baseline, vaulted } = splitRewards(rewards);
      const streak = Math.max(0, runData.vaultStreak ?? 0);
      const multiplier = Math.min(1 + streak * 0.2, 3);
      const boostedVault = applyVaultMultiplier(vaulted, multiplier);
      const newBanked = addRewards(runData.bankedRewards, baseline);
      const newVaulted = addRewards(runData.vaultedRewards, boostedVault);
      const newStage = stageIndex + 1;

      tx.update(runRef, {
        stage: newStage,
        bankedRewards: newBanked,
        vaultedRewards: newVaulted,
        vaultStreak: result === 'won' ? streak + 1 : streak,
        updatedAt: now,
      });

      return newStage;
    });

    return { committed: true, nextStage };
  }
);
