import * as admin from 'firebase-admin';

admin.initializeApp();

export { helloWorld } from './helloWorld';

// Phase 3 MVP endpoints
export { getOrCreatePlayer } from './getOrCreatePlayer';
export { startRun } from './startRun';
export { submitStageOutcome } from './submitStageOutcome';
export { bankCheckpoint } from './bankCheckpoint';
export { endRun } from './endRun';

// Replay audit (background trigger; not user-callable)
export { auditRunCompletion } from './auditReplay';

// Dev tooling (gated by ALLOW_DEV_TOOLS env flag or emulator runtime)
export {
  devSkipStage,
  devGrantAllClasses,
  devResetPlayer,
  devSetCurrencies,
} from './dev';
