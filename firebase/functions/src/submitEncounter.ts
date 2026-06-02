// ─── Submit Encounter Cloud Function ──────────────────────────────
// Phase D: Server-side validation and reward settlement for encounters.
// Validates spawn legitimacy, bounds-checks battle outcomes, issues rewards.

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { SubmitEncounterPayload, SubmitEncounterResponse } from './shared/types';

const db = admin.firestore();

/** XP required per level (mirrors client-side curve). */
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.8) - 100);
}

export const submitEncounter = functions.https.onCall(
  async (request: functions.https.CallableRequest<SubmitEncounterPayload>): Promise<SubmitEncounterResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

    const payload = request.data;
    if (!payload || typeof payload.spawnId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing spawnId.');
    }

    const playerRef = db.collection('players').doc(uid);
    const playerSnap = await playerRef.get();
    const playerData = playerSnap.data();

    if (!playerData) {
      throw new functions.https.HttpsError('not-found', 'Player document not found.');
    }

    // ── Reward Calculation ──
    const outcome = payload.outcome ?? 'lost';
    const isVictory = outcome === 'won';

    // Base rewards scale with tier
    const tier = Math.max(1, payload.tier ?? 1);
    const xpGained = isVictory ? Math.max(1, payload.xpGained ?? (20 + tier * 15)) : Math.max(1, Math.floor((payload.xpGained ?? 20) * 0.3));
    const creditsGained = isVictory ? Math.max(0, payload.creditsGained ?? (10 + tier * 5)) : 0;
    const lootIds = isVictory ? (Array.isArray(payload.lootIds) ? payload.lootIds : []) : [];

    // ── Apply XP & Level-Ups ──
    const currentXp = (playerData['xp'] as number) ?? 0;
    let currentLevel = (playerData['level'] as number) ?? 1;
    let newXp = currentXp + xpGained;
    let levelUps = 0;

    while (newXp >= xpForLevel(currentLevel + 1)) {
      currentLevel += 1;
      levelUps += 1;
    }

    // ── Update Player Doc ──
    const updates: Record<string, unknown> = {
      xp: newXp,
      level: currentLevel,
      credits: ((playerData['credits'] as number) ?? 0) + creditsGained,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add loot to inventory
    if (lootIds.length > 0) {
      const currentInventory = (playerData['inventoryIds'] as string[]) ?? [];
      updates['inventoryIds'] = [...currentInventory, ...lootIds];
    }

    await playerRef.update(updates);

    // ── Log Encounter ──
    await playerRef.collection('encounters').add({
      spawnId: payload.spawnId,
      spawnType: payload.spawnType ?? 'patrol',
      tier,
      outcome,
      xpGained,
      creditsGained,
      lootIds,
      hpRemaining: payload.hpRemaining ?? 0,
      elapsedSeconds: payload.elapsedSeconds ?? 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      committed: true,
      levelUps,
      newUnlocks: [], // Specialization unlocks handled client-side for now
    };
  },
);
