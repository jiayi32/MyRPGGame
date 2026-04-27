import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireDoc, requirePayloadSize, requireRateLimit } from './shared/guards';
import type {
  PlayerDoc,
  UpgradeClassPayload,
  UpgradeClassResponse,
  XpScrollKind,
  XpScrollPouch,
} from './shared/types';

const MAX_CLASS_RANK = 10;

const rankUpCostFor = (
  currentRank: number,
): {
  gold: number;
  ascensionCells: number;
  xpScrollKind: XpScrollKind;
  xpScrollCost: number;
} => {
  if (currentRank >= MAX_CLASS_RANK) {
    return { gold: 0, ascensionCells: 0, xpScrollKind: 'grand', xpScrollCost: 0 };
  }
  const nextRank = currentRank + 1;
  if (nextRank <= 3) {
    return { gold: 120 * nextRank, ascensionCells: 10 * nextRank, xpScrollKind: 'minor', xpScrollCost: 1 };
  }
  if (nextRank <= 7) {
    return { gold: 220 * nextRank, ascensionCells: 18 * nextRank, xpScrollKind: 'standard', xpScrollCost: 1 };
  }
  return { gold: 360 * nextRank, ascensionCells: 28 * nextRank, xpScrollKind: 'grand', xpScrollCost: 1 };
};

const takeScroll = (scrolls: XpScrollPouch, kind: XpScrollKind, amount: number): XpScrollPouch => {
  const next: XpScrollPouch = {
    minor: scrolls.minor,
    standard: scrolls.standard,
    grand: scrolls.grand,
  };
  next[kind] = Math.max(0, next[kind] - amount);
  return next;
};

export const upgradeClass = onCall<UpgradeClassPayload, Promise<UpgradeClassResponse>>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 512, 'upgradeClass.data');
    const uid = requireAuth(request);
    requireRateLimit(`upgradeClass:${uid}`, 30, 60_000);

    const classId = request.data?.classId;
    if (typeof classId !== 'string' || classId.length === 0) {
      throw new HttpsError('invalid-argument', 'classId must be a non-empty string.');
    }

    const db = admin.firestore();
    const playerRef = db.collection('players').doc(uid);

    const upgraded = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      const player = requireDoc(playerSnap, 'player') as PlayerDoc;

      if (!player.ownedClassIds.includes(classId)) {
        throw new HttpsError('permission-denied', `Class ${classId} is not owned by this player.`);
      }

      const currentRank = Math.max(0, Math.trunc(player.classRanks?.[classId] ?? 0));
      if (currentRank >= MAX_CLASS_RANK) {
        throw new HttpsError('failed-precondition', `Class ${classId} is already rank ${MAX_CLASS_RANK}.`);
      }

      const costs = rankUpCostFor(currentRank);
      if (player.goldBank < costs.gold) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough gold. Need ${costs.gold}, have ${player.goldBank}.`,
        );
      }
      if (player.ascensionCells < costs.ascensionCells) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough ascension cells. Need ${costs.ascensionCells}, have ${player.ascensionCells}.`,
        );
      }
      const scrollCount = player.xpScrolls[costs.xpScrollKind];
      if (scrollCount < costs.xpScrollCost) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough ${costs.xpScrollKind} scrolls. Need ${costs.xpScrollCost}, have ${scrollCount}.`,
        );
      }

      const newRank = currentRank + 1;
      const newClassRanks = { ...(player.classRanks ?? {}), [classId]: newRank };
      const newGoldBank = player.goldBank - costs.gold;
      const newAscensionCells = player.ascensionCells - costs.ascensionCells;
      const newXpScrolls = takeScroll(player.xpScrolls, costs.xpScrollKind, costs.xpScrollCost);
      const now = FieldValue.serverTimestamp();

      tx.update(playerRef, {
        classRanks: newClassRanks,
        goldBank: newGoldBank,
        ascensionCells: newAscensionCells,
        xpScrolls: newXpScrolls,
        updatedAt: now,
      });

      return {
        newRank,
        costs,
        player: {
          uid: player.uid,
          goldBank: newGoldBank,
          xpScrolls: newXpScrolls,
          ascensionCells: newAscensionCells,
          lineageRanks: player.lineageRanks,
          classRanks: newClassRanks,
          ownedClassIds: player.ownedClassIds,
          currentRunId: player.currentRunId,
        },
      };
    });

    return {
      ok: true,
      classId,
      newRank: upgraded.newRank,
      costs: upgraded.costs,
      player: upgraded.player,
    };
  },
);
