import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireDoc, requirePayloadSize, requireRateLimit } from './shared/guards';
import { getShopOfferById } from './shared/shopCatalog';
import type {
  BuyGearPayload,
  BuyGearResponse,
  GearInstanceDoc,
  PlayerDoc,
} from './shared/types';

export const buyGear = onCall<BuyGearPayload, Promise<BuyGearResponse>>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 512, 'buyGear.data');
    const uid = requireAuth(request);
    requireRateLimit(`buyGear:${uid}`, 30, 60_000);

    const templateId = request.data?.templateId;
    if (typeof templateId !== 'string' || templateId.length === 0) {
      throw new HttpsError('invalid-argument', 'templateId must be a non-empty string.');
    }

    const offer = getShopOfferById(templateId);
    if (offer === null) {
      throw new HttpsError('invalid-argument', `templateId ${templateId} is not purchasable.`);
    }

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);
    const purchasedInstanceId = playerRef.collection('gear').doc().id;

    const result = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      const player = requireDoc(playerSnap, 'player') as PlayerDoc;

      if (player.goldBank < offer.priceGold) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough gold. Need ${offer.priceGold}, have ${player.goldBank}.`,
        );
      }

      const newGoldBank = player.goldBank - offer.priceGold;
      const now = FieldValue.serverTimestamp();

      const gearRef = playerRef.collection('gear').doc(purchasedInstanceId);
      const gearDoc: Omit<GearInstanceDoc, 'obtainedAt'> & {
        obtainedAt: ReturnType<typeof FieldValue.serverTimestamp>;
      } = {
        templateId,
        obtainedFromRunId: null,
        obtainedAt: now,
        equipped: false,
      };
      tx.set(gearRef, gearDoc);

      tx.update(playerRef, {
        goldBank: newGoldBank,
        updatedAt: now,
      });

      return {
        uid: player.uid,
        goldBank: newGoldBank,
        xpScrolls: player.xpScrolls,
        ascensionCells: player.ascensionCells,
        lineageRanks: player.lineageRanks,
        classRanks: player.classRanks ?? {},
        ownedClassIds: player.ownedClassIds,
        currentRunId: player.currentRunId,
      };
    });

    return {
      ok: true,
      purchasedInstanceId,
      templateId,
      goldSpent: offer.priceGold,
      player: result,
    };
  },
);
