import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireDoc, requirePayloadSize, requireRateLimit } from './shared/guards';
import type { GearInstanceDoc, PlayerDoc } from './shared/types';

// ---------------------------------------------------------------------------
// Shared temper math (kept in sync with src/domain/run/temper.ts)
// ---------------------------------------------------------------------------

const computeTemperChance = (level: number): number => Math.pow(0.9487, Math.max(0, Math.trunc(level)));
const computeTemperCost = (level: number): number => 100 + 50 * Math.max(0, Math.trunc(level));

// ---------------------------------------------------------------------------
// Payload / Response
// ---------------------------------------------------------------------------

interface TemperGearPayload {
  instanceId: string;
}

interface TemperGearResponse {
  success: boolean;
  temperLevel: number;
  goldSpent: number;
  goldRemaining: number;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const temperGear = onCall<TemperGearPayload, Promise<TemperGearResponse>>(
  { enforceAppCheck: false, maxInstances: 20, timeoutSeconds: 15, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 256, 'temperGear.data');
    const uid = requireAuth(request);
    requireRateLimit(`temperGear:${uid}`, 20, 60_000);

    const instanceId = request.data?.instanceId;
    if (typeof instanceId !== 'string' || instanceId.length === 0) {
      throw new HttpsError('invalid-argument', 'instanceId must be a non-empty string.');
    }

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);
    const gearRef = playerRef.collection('gear').doc(instanceId);

    const result = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      const player = requireDoc(playerSnap, 'player') as PlayerDoc;

      const gearSnap = await tx.get(gearRef);
      const gear = requireDoc(gearSnap, 'gear instance') as GearInstanceDoc;

      const currentLevel = gear.temperLevel ?? 0;
      const cost = computeTemperCost(currentLevel);

      if (player.goldBank < cost) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough gold. Temper cost: ${cost}g, you have: ${player.goldBank}g.`,
        );
      }

      const newGoldBank = player.goldBank - cost;

      // Roll the dice — deterministic per transaction execution.
      const chance = computeTemperChance(currentLevel);
      const roll = Math.random();
      const success = roll < chance;

      if (success) {
        tx.update(gearRef, {
          temperLevel: currentLevel + 1,
          lastTemperedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.update(playerRef, { goldBank: newGoldBank });

      return {
        success,
        temperLevel: success ? currentLevel + 1 : currentLevel,
        goldSpent: cost,
        goldRemaining: newGoldBank,
      } satisfies TemperGearResponse;
    });

    return result;
  },
);
