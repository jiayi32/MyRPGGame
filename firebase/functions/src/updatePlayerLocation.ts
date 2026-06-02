// ─── Update Player Location ───────────────────────────────────────
// Phase D: Records player GPS position for spawn validation.
// Lightweight — called periodically, not on every frame.

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface LocationPayload {
  lat: number;
  lng: number;
}

export const updatePlayerLocation = functions.https.onCall(
  async (request: functions.https.CallableRequest<LocationPayload>): Promise<{ ok: boolean }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

    const { lat, lng } = request.data;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new functions.https.HttpsError('invalid-argument', 'lat and lng required.');
    }

    await db.collection('players').doc(uid).update({
      lastLocation: new admin.firestore.GeoPoint(lat, lng),
      lastLocationAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  },
);
