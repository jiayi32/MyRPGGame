// ─── Sync Character ───────────────────────────────────────────────
// Phase D: Periodic full-state sync of character data.
// Used when the player returns to the Hub / opens the Character screen.

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface SyncCharacterPayload {
  characterName?: string;
  level?: number;
  xp?: number;
  activeSpecId?: string | null;
  credits?: number;
  techPoints?: number;
}

export const syncCharacter = functions.https.onCall(
  async (request: functions.https.CallableRequest<SyncCharacterPayload>): Promise<{ ok: boolean }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

    const data = request.data;
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (typeof data.characterName === 'string') updates['characterName'] = data.characterName;
    if (typeof data.level === 'number') updates['level'] = data.level;
    if (typeof data.xp === 'number') updates['xp'] = data.xp;
    if (data.activeSpecId !== undefined) updates['activeSpecId'] = data.activeSpecId;
    if (typeof data.credits === 'number') updates['credits'] = data.credits;
    if (typeof data.techPoints === 'number') updates['techPoints'] = data.techPoints;

    await db.collection('players').doc(uid).update(updates);

    return { ok: true };
  },
);
