import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  requireAuth,
  requireDoc,
  requireOwnership,
  requireOngoing,
  requirePayloadSize,
  requireRateLimit,
} from './shared/guards';
import { mergeVaultIntoBank, forfeitVault } from './shared/rewards';
import { computeProgression } from './shared/progression';
import type {
  EndRunPayload,
  EndRunResponse,
  GearInstanceDoc,
  PlayerDoc,
  ProgressionDelta,
  RunDoc,
  XpScrollPouch,
} from './shared/types';

export const endRun = onCall<EndRunPayload, Promise<EndRunResponse>>(
  { enforceAppCheck: false, maxInstances: 50, timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    requirePayloadSize(request.data, 1024, 'endRun.data');
    const uid = requireAuth(request);
    // Cap: 12 ends/min — covers retry-after-network-blip cases.
    requireRateLimit(`endRun:${uid}`, 12, 60_000);
    const { runId, finalResult } = request.data;

    if (typeof runId !== 'string' || runId.length === 0) {
      throw new HttpsError('invalid-argument', 'runId must be a non-empty string.');
    }
    if (finalResult !== 'won' && finalResult !== 'lost' && finalResult !== 'fled') {
      throw new HttpsError('invalid-argument', 'finalResult must be won | lost | fled.');
    }

    const db = admin.firestore();
    const runRef = db.collection('runs').doc(runId);
    const playerRef = db.collection('players').doc(uid);

    // Pre-allocate gear instance doc IDs outside the tx so the tx body stays
    // synchronous (Firestore tx callbacks must not call db.collection().doc()
    // for *new* writes after the first read on some SDK paths).
    // We'll figure out how many we need from the run doc first, then commit.

    const settled = await db.runTransaction(async (tx) => {
      const [runSnap, playerSnap] = await Promise.all([tx.get(runRef), tx.get(playerRef)]);
      const runData = requireDoc(runSnap, 'run') as RunDoc;
      const playerData = requireDoc(playerSnap, 'player') as PlayerDoc;

      requireOwnership(runData, uid);
      requireOngoing(runData);

      // Stage at terminal: stage advances to N+1 after submitStageOutcome at N.
      // The "stage completed" for progression is therefore stage - 1.
      const stageCompleted = Math.max(0, runData.stage - 1);

      // Reward settle: won merges vault into bank, loss/flee forfeits vault.
      const { banked: settledBank, vaulted: settledVault } =
        finalResult === 'won'
          ? mergeVaultIntoBank(runData.bankedRewards, runData.vaultedRewards)
          : forfeitVault(runData.bankedRewards);
      const firestoreResult: 'won' | 'lost' = finalResult === 'won' ? 'won' : 'lost';

      // Progression deltas — pure arithmetic on stored run-doc + player-doc fields.
      const progression = computeProgression({
        result: finalResult,
        stageCompleted,
        activeLineageId: runData.activeLineageId,
        evolutionTargetClassId: runData.evolutionTargetClassId,
        ownedClassIds: playerData.ownedClassIds,
        lineageRanks: playerData.lineageRanks,
      });

      // Apply player-doc updates: persistent currencies + meta-progression.
      const newGoldBank = playerData.goldBank + settledBank.gold;
      const newXpScrolls: XpScrollPouch = {
        minor: playerData.xpScrolls.minor + settledBank.xpScrollMinor,
        standard: playerData.xpScrolls.standard + settledBank.xpScrollStandard,
        grand: playerData.xpScrolls.grand + settledBank.xpScrollGrand,
      };
      const newAscensionCells = playerData.ascensionCells + progression.awardedAscensionCells;
      const newLineageRanks = {
        ...playerData.lineageRanks,
        [runData.activeLineageId]: progression.newRank,
      };
      const newOwnedClassIds = progression.newlyUnlockedClassIds.length > 0
        ? [...playerData.ownedClassIds, ...progression.newlyUnlockedClassIds]
        : playerData.ownedClassIds;

      // Create one gear instance doc per gearId in the settled bank.
      const gearCollection = playerRef.collection('gear');
      let gearInstancesCreated = 0;
      for (const templateId of settledBank.gearIds) {
        const gearRef = gearCollection.doc();
        const gearDoc: Omit<GearInstanceDoc, 'obtainedAt'> & {
          obtainedAt: ReturnType<typeof FieldValue.serverTimestamp>;
        } = {
          templateId,
          obtainedFromRunId: runId,
          obtainedAt: FieldValue.serverTimestamp(),
          equipped: false,
        };
        tx.set(gearRef, gearDoc);
        gearInstancesCreated += 1;
      }

      const now = FieldValue.serverTimestamp();

      tx.update(runRef, {
        result: firestoreResult,
        bankedRewards: settledBank,
        vaultedRewards: settledVault,
        updatedAt: now,
      });

      tx.update(playerRef, {
        goldBank: newGoldBank,
        xpScrolls: newXpScrolls,
        ascensionCells: newAscensionCells,
        lineageRanks: newLineageRanks,
        ownedClassIds: newOwnedClassIds,
        currentRunId: null,
        updatedAt: now,
      });

      const delta: ProgressionDelta = {
        awardedAscensionCells: progression.awardedAscensionCells,
        lineageRankDelta: progression.lineageRankDelta,
        newlyUnlockedClassIds: progression.newlyUnlockedClassIds,
        playerTotals: {
          goldBank: newGoldBank,
          ascensionCells: newAscensionCells,
          xpScrolls: newXpScrolls,
          ownedClassIds: newOwnedClassIds,
          lineageRanks: newLineageRanks,
        },
        gearInstancesCreated,
      };

      return { settledBank, progression: delta };
    });

    return {
      settled: true,
      bankedRewards: settled.settledBank,
      progression: settled.progression,
    };
  }
);
