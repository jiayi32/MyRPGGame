import * as admin from 'firebase-admin';

admin.initializeApp();

export { helloWorld } from './helloWorld';

// Phase 3 MVP endpoints
export { getOrCreatePlayer } from './getOrCreatePlayer';
export { startRun } from './startRun';
export { submitStageOutcome } from './submitStageOutcome';
export { bankCheckpoint } from './bankCheckpoint';
export { endRun } from './endRun';
export { getShopOffer } from './getShopOffer';
export { buyGear } from './buyGear';
export { temperGear } from './temperGear';
export { upgradeClass } from './upgradeClass';

// Phase D: Persistent World endpoints (June 2026)
export { submitEncounter } from './submitEncounter';
export { updatePlayerLocation } from './updatePlayerLocation';
export { syncCharacter } from './syncCharacter';

// Replay audit (background trigger; not user-callable)
export { auditRunCompletion } from './auditReplay';

// Dev tooling (gated by ALLOW_DEV_TOOLS env flag or emulator runtime)
export {
  devSkipStage,
  devGrantAllClasses,
  devResetPlayer,
  devSetCurrencies,
} from './dev';
