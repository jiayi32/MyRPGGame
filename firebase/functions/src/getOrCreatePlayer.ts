import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireAuth, requirePayloadSize, requireRateLimit } from './shared/guards';
import { EMPTY_XP_SCROLLS } from './shared/types';
import type {
  GetOrCreatePlayerPayload,
  GetOrCreatePlayerResponse,
  PlayerDoc,
} from './shared/types';

/**
 * Starter class pack — all 5 Drakehorn Forge tiers.
 *
 * Alpha rationale: granting the full chain at profile creation lets the solo
 * dev test any build path without grinding the unlock chain. Only Drakehorn
 * is fully-authored; other lineages are stubs and would feel broken if granted.
 */
const STARTER_CLASS_IDS: readonly string[] = [
  'drakehorn_forge.ember_initiate',     // T1 — basic fire mage
  'drakehorn_forge.flame_berserker',    // T2
  'drakehorn_forge.pyre_warlord',       // T3
  'drakehorn_forge.inferno_executioner', // T4
  'drakehorn_forge.apocalypse_bringer', // T5 — apex
];

export const getOrCreatePlayer = onCall<
  GetOrCreatePlayerPayload,
  Promise<GetOrCreatePlayerResponse>
>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 256, 'getOrCreatePlayer.data');
    const uid = requireAuth(request);
    requireRateLimit(`getOrCreatePlayer:${uid}`, 12, 60_000);

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (snap.exists) {
        return { player: snap.data() as PlayerDoc, created: false };
      }

      const now = FieldValue.serverTimestamp();
      const newDoc = {
        uid,
        goldBank: 0,
        xpScrolls: { ...EMPTY_XP_SCROLLS },
        ascensionCells: 0,
        lineageRanks: {},
        classRanks: {},
        ownedClassIds: [...STARTER_CLASS_IDS],
        currentRunId: null,
        createdAt: now,
        updatedAt: now,
      };
      tx.set(playerRef, newDoc);

      // The serverTimestamp sentinel resolves *after* the tx commits, so the
      // returned doc shape uses Timestamp.now() as a close-enough placeholder
      // for the client. The next read will see authoritative server time.
      const placeholderTimestamp = Timestamp.now();
      const player: PlayerDoc = {
        ...newDoc,
        createdAt: placeholderTimestamp,
        updatedAt: placeholderTimestamp,
      };
      return { player, created: true };
    });

    return result;
  }
);
