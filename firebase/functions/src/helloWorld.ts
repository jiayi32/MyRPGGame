import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const helloWorld = onCall({ enforceAppCheck: false }, (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in to call helloWorld.');
  }
  return {
    uid,
    message: 'pong',
    timestamp: Date.now(),
  };
});
