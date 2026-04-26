import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { addRewards, emptyReward, splitRewards } from './shared/rewards';
import type { RewardBundle, RunDoc, StageOutcomeDoc } from './shared/types';

const NUMERIC_REWARD_FIELDS = [
  'gold',
  'ascensionCells',
  'xpScrollMinor',
  'xpScrollStandard',
  'xpScrollGrand',
] as const satisfies ReadonlyArray<keyof RewardBundle>;

interface RunDocWithAudit extends RunDoc {
  audit?: {
    ok: boolean;
    discrepancies: string[];
    checkpointCount: number;
    auditedAt: unknown;
  };
}

function isVaultEmpty(r: RewardBundle): boolean {
  if (r.gearIds.length > 0) return false;
  for (const f of NUMERIC_REWARD_FIELDS) {
    if (r[f] !== 0) return false;
  }
  return true;
}

/**
 * Recompute expected aggregates from the stage outcome ledger and compare
 * against the final run doc. Catches the most common tamper modes:
 *   - banked + vaulted exceeds the sum of stage rewards (reward inflation),
 *   - committed gearId not present in any stage outcome (gear fabrication),
 *   - won run with non-zero vault or banked != total stage rewards,
 *   - lost run with non-empty vault.
 *
 * What this audit does NOT do (yet):
 *   - Re-run the combat engine against the seed + encounter to verify HP/elapsed.
 *     That requires sharing src/domain/combat/ into the functions package; deferred
 *     until the meta-progression refactor in plan Stage 2.
 *   - Verify checkpoint banking sequence (we only check upper-bound invariants).
 */
export const auditRunCompletion = onDocumentUpdated(
  { document: 'runs/{runId}', maxInstances: 50, timeoutSeconds: 60, memory: '256MiB' },
  async (event) => {
    const before = event.data?.before.data() as RunDocWithAudit | undefined;
    const after = event.data?.after.data() as RunDocWithAudit | undefined;
    if (!after) return;

    // Only audit on transition from ongoing → terminal. Skips own writeback.
    const wasOngoing = !before || !before.result || before.result === 'ongoing';
    const isTerminal = after.result === 'won' || after.result === 'lost';
    if (!wasOngoing || !isTerminal) return;

    const runId = event.params['runId'] as string;
    const db = admin.firestore();
    const checkpointsSnap = await db.collection('runs').doc(runId).collection('checkpoints').get();

    let totalStageRewards = emptyReward();
    let totalBaseline = emptyReward();
    let totalVaulted = emptyReward();
    const stageGearIds = new Set<string>();

    for (const doc of checkpointsSnap.docs) {
      const cp = doc.data() as StageOutcomeDoc;
      if (cp.result !== 'won') continue;
      totalStageRewards = addRewards(totalStageRewards, cp.rewards);
      const split = splitRewards(cp.rewards);
      totalBaseline = addRewards(totalBaseline, split.baseline);
      totalVaulted = addRewards(totalVaulted, split.vaulted);
      for (const g of cp.rewards.gearIds) stageGearIds.add(g);
    }

    const discrepancies: string[] = [];
    const committed = addRewards(after.bankedRewards, after.vaultedRewards);

    // Upper-bound invariant: committed numerics never exceed stage total.
    for (const f of NUMERIC_REWARD_FIELDS) {
      if (committed[f] > totalStageRewards[f]) {
        discrepancies.push(`${f}: committed ${committed[f]} > stage total ${totalStageRewards[f]}`);
      }
    }

    // Gear subset invariant: every committed gearId came from some stage.
    const committedGear = [...after.bankedRewards.gearIds, ...after.vaultedRewards.gearIds];
    for (const g of committedGear) {
      if (!stageGearIds.has(g)) {
        discrepancies.push(`gearId "${g}" committed but not present in any stage reward`);
        break;
      }
    }
    if (committedGear.length > stageGearIds.size) {
      discrepancies.push(`gear count ${committedGear.length} exceeds unique stage gear count ${stageGearIds.size}`);
    }

    // Won-run invariants: vault empty, banked == total stage rewards.
    if (after.result === 'won') {
      if (!isVaultEmpty(after.vaultedRewards)) {
        discrepancies.push('vault is not empty on won run');
      }
      for (const f of NUMERIC_REWARD_FIELDS) {
        if (after.bankedRewards[f] !== totalStageRewards[f]) {
          discrepancies.push(
            `won-run banked.${f} ${after.bankedRewards[f]} != stage total ${totalStageRewards[f]}`
          );
        }
      }
    }

    // Lost-run invariant: vault must be empty (endRun forfeits).
    if (after.result === 'lost' && !isVaultEmpty(after.vaultedRewards)) {
      discrepancies.push('vault is not empty on lost run');
    }

    await db.collection('runs').doc(runId).update({
      audit: {
        ok: discrepancies.length === 0,
        discrepancies,
        checkpointCount: checkpointsSnap.size,
        auditedAt: FieldValue.serverTimestamp(),
      },
    });
  }
);
