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
import { EMPTY_REWARD } from './shared/types';
import type {
  EndRunPayload,
  EndRunResponse,
  EndRunSettlementLedger,
  GearInstanceDoc,
  PlayerDoc,
  ProgressionDelta,
  RunDoc,
  DataCachePouch,
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

      // Enforce no_forfeit risk contract: fled is blocked server-side.
      const activeContractIds: string[] = Array.isArray(runData.selectedRiskContractIds)
        ? runData.selectedRiskContractIds
        : [];
      if (finalResult === 'fled' && activeContractIds.includes('contract.no_forfeit')) {
        throw new HttpsError(
          'failed-precondition',
          'Cannot forfeit a run with an active No Retreat Oath contract.'
        );
      }

      // Stage at terminal: stage advances to N+1 after submitStageOutcome at N.
      // The "stage completed" for progression is therefore stage - 1.
      const stageCompleted = Math.max(0, runData.stage - 1);

      const preSettleBanked = runData.bankedRewards;
      const preSettleVaulted = runData.vaultedRewards;

      // Reward settle: won/fled merge vault into bank, loss forfeits vault.
      const keepsVaultOnSettle = finalResult === 'won' || finalResult === 'fled';
      const { banked: settledBank, vaulted: settledVault } =
        keepsVaultOnSettle
          ? mergeVaultIntoBank(preSettleBanked, preSettleVaulted)
          : forfeitVault(preSettleBanked);
      const firestoreResult: 'won' | 'lost' = finalResult === 'won' ? 'won' : 'lost';
      const vaultDisposition: EndRunSettlementLedger['vaultDisposition'] = keepsVaultOnSettle
        ? 'merged'
        : 'forfeited';
      const vaultedTransferredToBank = keepsVaultOnSettle ? preSettleVaulted : EMPTY_REWARD;
      const vaultForfeited = keepsVaultOnSettle ? EMPTY_REWARD : preSettleVaulted;

      // Progression deltas — pure arithmetic on stored run-doc + player-doc fields.
      const progression = computeProgression({
        result: finalResult,
        stageCompleted,
        activeCorpId: runData.activeCorpId,
        evolutionTargetSpecId: runData.evolutionTargetSpecId,
        unlockedSpecIds: playerData.unlockedSpecIds,
        corpRanks: playerData.corpRanks,
      });

      // Apply player-doc updates: persistent currencies + meta-progression.
      const newCredits = playerData.credits + settledBank.credits;
      const newDataCaches: DataCachePouch = {
        minor: playerData.dataCaches.minor + settledBank.dataCacheMinor,
        standard: playerData.dataCaches.standard + settledBank.dataCacheStandard,
        grand: playerData.dataCaches.grand + settledBank.dataCacheGrand,
      };
      const newQuantumCores = playerData.quantumCores + settledBank.quantumCores + progression.awardedQuantumCores;
      const newCorpRanks = {
        ...playerData.corpRanks,
        [runData.activeCorpId]: progression.newRank,
      };
      const newUnlockedSpecIds = progression.newlyUnlockedSpecIds.length > 0
        ? [...playerData.unlockedSpecIds, ...progression.newlyUnlockedSpecIds]
        : playerData.unlockedSpecIds;
      const existingSpecRanks = playerData.specRanks ?? {};

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
        credits: newCredits,
        dataCaches: newDataCaches,
        quantumCores: newQuantumCores,
        corpRanks: newCorpRanks,
        unlockedSpecIds: newUnlockedSpecIds,
        currentRunId: null,
        updatedAt: now,
      });

      const delta: ProgressionDelta = {
        awardedQuantumCores: progression.awardedQuantumCores,
        corpRankDelta: progression.corpRankDelta,
        newlyUnlockedSpecIds: progression.newlyUnlockedSpecIds,
        playerTotals: {
          credits: newCredits,
          quantumCores: newQuantumCores,
          scrap: playerData.scrap ?? 0,
          dataCaches: newDataCaches,
          unlockedSpecIds: newUnlockedSpecIds,
          corpRanks: newCorpRanks,
          specRanks: existingSpecRanks,
        },
        gearInstancesCreated,
      };

      const settlementLedger: EndRunSettlementLedger = {
        finalResult,
        preSettleBanked,
        preSettleVaulted,
        vaultDisposition,
        vaultedTransferredToBank,
        vaultForfeited,
        postSettleBanked: settledBank,
        progressionAwarded: {
          quantumCores: progression.awardedQuantumCores,
          corpRankDelta: progression.corpRankDelta,
          newlyUnlockedSpecIds: progression.newlyUnlockedSpecIds,
        },
      };

      return { settledBank, progression: delta, settlementLedger };
    });

    return {
      settled: true,
      bankedRewards: settled.settledBank,
      progression: settled.progression,
      settlementLedger: settled.settlementLedger,
    };
  }
);
