/**
 * Server-side progression arithmetic.
 *
 * Mirrors the formulas in `src/domain/run/progression.ts` (client) but operates
 * purely on values stored on the run doc — no content registry lookup needed.
 * The client computes `evolutionTargetClassId` at startRun and stores it on the
 * run doc; on endRun the server reads it back and applies the unlock.
 *
 * If the formulas drift, [src/content/__tests__/integrity.test.ts] and the
 * smoke test will surface the divergence end-to-end.
 */

const LINEAGE_RANK_CAP = 10;

export type RunResult = 'won' | 'lost' | 'fled';

export function isCompletedRun(result: RunResult): boolean {
  return result === 'won' || result === 'lost';
}

/** +1 lineage rank for completed runs (won/lost), 0 for fled. */
export function rankDeltaForOutcome(result: RunResult, stageCompleted: number): number {
  if (!isCompletedRun(result)) return 0;
  if (stageCompleted <= 0) return 0;
  return 1;
}

/** Mirror of client formula: 3*stage+25 won, 2*stage+8 lost, stage fled. */
export function ascensionCellsForOutcome(result: RunResult, stageCompleted: number): number {
  const stage = Math.max(0, Math.trunc(stageCompleted));
  if (stage <= 0) return 0;
  if (result === 'won') return stage * 3 + 25;
  if (result === 'lost') return stage * 2 + 8;
  return stage; // fled
}

export function clampLineageRank(rank: number): number {
  return Math.max(0, Math.min(LINEAGE_RANK_CAP, Math.trunc(rank)));
}

export interface AppliedProgression {
  newlyUnlockedClassIds: string[];
  awardedAscensionCells: number;
  lineageRankDelta: number;
  newRank: number;
}

/** Compute progression deltas without mutating inputs. */
export function computeProgression(args: {
  result: RunResult;
  stageCompleted: number;
  activeLineageId: string;
  evolutionTargetClassId: string | null;
  ownedClassIds: readonly string[];
  lineageRanks: Readonly<Record<string, number>>;
}): AppliedProgression {
  const newlyUnlockedClassIds: string[] = [];

  // Same-lineage tier-up unlock fires only on completed runs.
  if (
    isCompletedRun(args.result) &&
    args.stageCompleted > 0 &&
    args.evolutionTargetClassId &&
    !args.ownedClassIds.includes(args.evolutionTargetClassId)
  ) {
    newlyUnlockedClassIds.push(args.evolutionTargetClassId);
  }

  const awardedAscensionCells = ascensionCellsForOutcome(args.result, args.stageCompleted);
  const lineageRankDeltaRaw = rankDeltaForOutcome(args.result, args.stageCompleted);
  const oldRank = args.lineageRanks[args.activeLineageId] ?? 0;
  const newRank = clampLineageRank(oldRank + lineageRankDeltaRaw);

  return {
    newlyUnlockedClassIds,
    awardedAscensionCells,
    lineageRankDelta: newRank - oldRank,
    newRank,
  };
}
