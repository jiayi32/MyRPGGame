import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireDoc, requirePayloadSize, requireRateLimit } from './shared/guards';
import type {
  PlayerDoc,
  UpgradeClassPayload,
  UpgradeClassResponse,
  DataCacheKind,
  DataCachePouch,
} from './shared/types';

const MAX_CLASS_RANK = 10;

const rankUpCostFor = (
  currentRank: number,
): {
  gold: number;
  quantumCores: number;
  dataCacheKind: DataCacheKind;
  dataCacheCost: number;
} => {
  if (currentRank >= MAX_CLASS_RANK) {
    return { gold: 0, quantumCores: 0, dataCacheKind: 'grand', dataCacheCost: 0 };
  }
  const nextRank = currentRank + 1;
  if (nextRank <= 3) {
    return { gold: 120 * nextRank, quantumCores: 10 * nextRank, dataCacheKind: 'minor', dataCacheCost: 1 };
  }
  if (nextRank <= 7) {
    return { gold: 220 * nextRank, quantumCores: 18 * nextRank, dataCacheKind: 'standard', dataCacheCost: 1 };
  }
  return { gold: 360 * nextRank, quantumCores: 28 * nextRank, dataCacheKind: 'grand', dataCacheCost: 1 };
};

const takeCache = (caches: DataCachePouch, kind: DataCacheKind, amount: number): DataCachePouch => {
  const next: DataCachePouch = {
    minor: caches.minor,
    standard: caches.standard,
    grand: caches.grand,
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

      if (!player.unlockedSpecIds.includes(classId)) {
        throw new HttpsError('permission-denied', `Class ${classId} is not owned by this player.`);
      }

      const currentRank = Math.max(0, Math.trunc(player.specRanks?.[classId] ?? 0));
      if (currentRank >= MAX_CLASS_RANK) {
        throw new HttpsError('failed-precondition', `Class ${classId} is already rank ${MAX_CLASS_RANK}.`);
      }

      const costs = rankUpCostFor(currentRank);
      if (player.credits < costs.gold) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough credits. Need ${costs.gold}, have ${player.credits}.`,
        );
      }
      if (player.quantumCores < costs.quantumCores) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough quantum cores. Need ${costs.quantumCores}, have ${player.quantumCores}.`,
        );
      }
      const cacheCount = player.dataCaches[costs.dataCacheKind];
      if (cacheCount < costs.dataCacheCost) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough ${costs.dataCacheKind} data caches. Need ${costs.dataCacheCost}, have ${cacheCount}.`,
        );
      }

      const newRank = currentRank + 1;
      const newSpecRanks = { ...(player.specRanks ?? {}), [classId]: newRank };
      const newCredits = player.credits - costs.gold;
      const newQuantumCores = player.quantumCores - costs.quantumCores;
      const newDataCaches = takeCache(player.dataCaches, costs.dataCacheKind, costs.dataCacheCost);
      const now = FieldValue.serverTimestamp();

      tx.update(playerRef, {
        specRanks: newSpecRanks,
        credits: newCredits,
        quantumCores: newQuantumCores,
        dataCaches: newDataCaches,
        updatedAt: now,
      });

      return {
        newRank,
        costs,
        player: {
          uid: player.uid,
          credits: newCredits,
          dataCaches: newDataCaches,
          quantumCores: newQuantumCores,
          scrap: player.scrap ?? 0,
          corpRanks: player.corpRanks,
          specRanks: newSpecRanks,
          unlockedSpecIds: player.unlockedSpecIds,
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
