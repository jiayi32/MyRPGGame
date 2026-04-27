import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requirePayloadSize, requireRateLimit } from './shared/guards';
import { emptyReward } from './shared/rewards';
import { EMPTY_XP_SCROLLS } from './shared/types';
import type { StartRunPayload, StartRunResponse, PlayerDoc } from './shared/types';

const STARTER_CLASS_ID = 'drakehorn_forge.ember_initiate';

export const startRun = onCall<StartRunPayload, Promise<StartRunResponse>>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 1024, 'startRun.data');
    const uid = requireAuth(request);
    // Cap: 6 starts/min per user — generous for double-tap retries, blocks spam.
    requireRateLimit(`startRun:${uid}`, 6, 60_000);
    const { activeClassId, activeLineageId, evolutionTargetClassId } = request.data;

    if (typeof activeClassId !== 'string' || activeClassId.length === 0) {
      throw new HttpsError('invalid-argument', 'activeClassId must be a non-empty string.');
    }
    if (typeof activeLineageId !== 'string' || activeLineageId.length === 0) {
      throw new HttpsError('invalid-argument', 'activeLineageId must be a non-empty string.');
    }
    if (
      evolutionTargetClassId !== null &&
      (typeof evolutionTargetClassId !== 'string' || evolutionTargetClassId.length === 0)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'evolutionTargetClassId must be a non-empty string or null.'
      );
    }

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);

    // Cryptographically random 32-bit unsigned seed.
    const seed = Math.floor(Math.random() * 0x100000000);

    const runRef = db.collection('runs').doc();
    const result = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      const now = FieldValue.serverTimestamp();

      // Auto-create profile on first startRun if the client skipped getOrCreatePlayer.
      if (!playerSnap.exists) {
        tx.set(playerRef, {
          uid,
          goldBank: 0,
          xpScrolls: { ...EMPTY_XP_SCROLLS },
          ascensionCells: 0,
          lineageRanks: {},
          classRanks: {},
          ownedClassIds: [STARTER_CLASS_ID],
          currentRunId: null,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const player = playerSnap.data() as PlayerDoc;
        // Reject if a run is already in progress — must endRun the previous one first.
        if (player.currentRunId) {
          throw new HttpsError(
            'failed-precondition',
            `Run ${player.currentRunId} is already active. End it before starting a new one.`
          );
        }
        // Refuse to start with a class the player doesn't own.
        if (!player.ownedClassIds.includes(activeClassId)) {
          throw new HttpsError(
            'permission-denied',
            `Class ${activeClassId} is not owned by player.`
          );
        }
      }

      tx.set(runRef, {
        playerId: uid,
        seed,
        stage: 1,
        turn: 0,
        activeClassId,
        activeLineageId,
        evolutionTargetClassId,
        bankedRewards: emptyReward(),
        vaultedRewards: emptyReward(),
        result: 'ongoing',
        createdAt: now,
        updatedAt: now,
      });

      tx.update(playerRef, {
        currentRunId: runRef.id,
        updatedAt: now,
      });

      return { runId: runRef.id, seed, activeClassId };
    });

    return result;
  }
);
