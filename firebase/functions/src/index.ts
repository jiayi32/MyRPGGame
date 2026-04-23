import * as admin from 'firebase-admin';

admin.initializeApp();

export { helloWorld } from './helloWorld';

// Phase 3 MVP endpoints
export { startRun } from './startRun';
export { submitStageOutcome } from './submitStageOutcome';
export { bankCheckpoint } from './bankCheckpoint';
export { endRun } from './endRun';
