/**
 * Dev tooling callables — gated by `ALLOW_DEV_TOOLS=true` or running under the emulator.
 *
 * Solo-dev affordances for fast iteration during alpha self-testing:
 *   - devSkipStage: jump the active run to an arbitrary stage
 *   - devGrantAllClasses: append all 5 Drakehorn class IDs to ownedClassIds
 *   - devResetPlayer: wipe the caller's player doc + sub-collections + their runs
 *   - devSetCurrencies: bulk-set gold / cells / scrolls
 *
 * All four require auth + the dev gate. Production calls return permission-denied
 * unless the env flag is set on a staging/private project.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  requireAuth,
  requireDevTools,
  requireDoc,
  requireOngoing,
  requireOwnership,
  requirePayloadSize,
  requireRateLimit,
} from './shared/guards';
import type {
  DevGrantAllClassesPayload,
  DevGrantAllClassesResponse,
  DevResetPlayerPayload,
  DevResetPlayerResponse,
  DevSetCurrenciesPayload,
  DevSetCurrenciesResponse,
  DevSkipStagePayload,
  DevSkipStageResponse,
  PlayerDoc,
  RunDoc,
  XpScrollPouch,
} from './shared/types';

const ALL_DRAKEHORN_CLASSES: readonly string[] = [
  'drakehorn_forge.ember_initiate',
  'drakehorn_forge.flame_berserker',
  'drakehorn_forge.pyre_warlord',
  'drakehorn_forge.inferno_executioner',
  'drakehorn_forge.apocalypse_bringer',
];

// ---------------------------------------------------------------------------
// devSkipStage
// ---------------------------------------------------------------------------

export const devSkipStage = onCall<DevSkipStagePayload, Promise<DevSkipStageResponse>>(
  { enforceAppCheck: false, maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requireDevTools();
    requirePayloadSize(request.data, 512, 'devSkipStage.data');
    const uid = requireAuth(request);
    requireRateLimit(`devSkipStage:${uid}`, 30, 60_000);

    const { runId, targetStage } = request.data;
    if (typeof runId !== 'string' || runId.length === 0) {
      throw new HttpsError('invalid-argument', 'runId required.');
    }
    if (!Number.isInteger(targetStage) || targetStage < 1 || targetStage > 30) {
      throw new HttpsError('invalid-argument', 'targetStage must be 1..30.');
    }

    const db = admin.firestore();
    const runRef = db.collection('runs').doc(runId);
    const newStage = await db.runTransaction(async (tx) => {
      const snap = await tx.get(runRef);
      const run = requireDoc(snap, 'run') as RunDoc;
      requireOwnership(run, uid);
      requireOngoing(run);
      tx.update(runRef, { stage: targetStage, updatedAt: FieldValue.serverTimestamp() });
      return targetStage;
    });

    return { ok: true, newStage };
  },
);

// ---------------------------------------------------------------------------
// devGrantAllClasses
// ---------------------------------------------------------------------------

export const devGrantAllClasses = onCall<
  DevGrantAllClassesPayload,
  Promise<DevGrantAllClassesResponse>
>(
  { enforceAppCheck: false, maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requireDevTools();
    requirePayloadSize(request.data, 256, 'devGrantAllClasses.data');
    const uid = requireAuth(request);
    requireRateLimit(`devGrantAllClasses:${uid}`, 12, 60_000);

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);
    const ownedClassIds = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      const player = requireDoc(snap, 'player') as PlayerDoc;
      const next = new Set([...player.ownedClassIds, ...ALL_DRAKEHORN_CLASSES]);
      const arr = [...next];
      tx.update(playerRef, {
        ownedClassIds: arr,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return arr;
    });

    return { ok: true, ownedClassIds };
  },
);

// ---------------------------------------------------------------------------
// devResetPlayer
// ---------------------------------------------------------------------------

const BATCH_DELETE_PAGE = 100;

async function deleteCollection(
  db: admin.firestore.Firestore,
  ref:
    | admin.firestore.CollectionReference<admin.firestore.DocumentData>
    | admin.firestore.Query<admin.firestore.DocumentData>,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await ref.limit(BATCH_DELETE_PAGE).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < BATCH_DELETE_PAGE) break;
  }
  return deleted;
}

export const devResetPlayer = onCall<DevResetPlayerPayload, Promise<DevResetPlayerResponse>>(
  { enforceAppCheck: false, maxInstances: 2, timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    requireDevTools();
    requirePayloadSize(request.data, 256, 'devResetPlayer.data');
    const uid = requireAuth(request);
    requireRateLimit(`devResetPlayer:${uid}`, 6, 60_000);

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);
    const gearCollection = playerRef.collection('gear');
    const runsQuery = db.collection('runs').where('playerId', '==', uid);

    const gearDeleted = await deleteCollection(db, gearCollection);

    // Delete run sub-collections (checkpoints) before deleting the run docs.
    const runDocs = await runsQuery.get();
    let runsDeleted = 0;
    for (const runDoc of runDocs.docs) {
      await deleteCollection(db, runDoc.ref.collection('checkpoints'));
      await runDoc.ref.delete();
      runsDeleted += 1;
    }

    await playerRef.delete().catch(() => undefined);

    return { ok: true, runsDeleted, gearDeleted };
  },
);

// ---------------------------------------------------------------------------
// devSetCurrencies
// ---------------------------------------------------------------------------

export const devSetCurrencies = onCall<
  DevSetCurrenciesPayload,
  Promise<DevSetCurrenciesResponse>
>(
  { enforceAppCheck: false, maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requireDevTools();
    requirePayloadSize(request.data, 512, 'devSetCurrencies.data');
    const uid = requireAuth(request);
    requireRateLimit(`devSetCurrencies:${uid}`, 30, 60_000);

    const { goldBank, ascensionCells, xpScrollMinor, xpScrollStandard, xpScrollGrand } =
      request.data;

    const numericFields: ReadonlyArray<readonly [string, number | undefined]> = [
      ['goldBank', goldBank],
      ['ascensionCells', ascensionCells],
      ['xpScrollMinor', xpScrollMinor],
      ['xpScrollStandard', xpScrollStandard],
      ['xpScrollGrand', xpScrollGrand],
    ];
    for (const [label, value] of numericFields) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new HttpsError('invalid-argument', `${label} must be a non-negative integer.`);
      }
    }

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      const player = requireDoc(snap, 'player') as PlayerDoc;
      const newGold = goldBank ?? player.goldBank;
      const newCells = ascensionCells ?? player.ascensionCells;
      const newScrolls: XpScrollPouch = {
        minor: xpScrollMinor ?? player.xpScrolls.minor,
        standard: xpScrollStandard ?? player.xpScrolls.standard,
        grand: xpScrollGrand ?? player.xpScrolls.grand,
      };
      tx.update(playerRef, {
        goldBank: newGold,
        ascensionCells: newCells,
        xpScrolls: newScrolls,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { goldBank: newGold, ascensionCells: newCells, xpScrolls: newScrolls };
    });

    return {
      ok: true,
      goldBank: result.goldBank,
      ascensionCells: result.ascensionCells,
      xpScrolls: result.xpScrolls,
    };
  },
);
