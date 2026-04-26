import { CLASS_BY_ID } from '../../content';
import type { ClassData } from '../../content/types';
import type {
  ProgressionInput,
  ProgressionPlayerState,
  ProgressionResult,
  RunResult,
} from './types';

const LINEAGE_RANK_CAP = 10;

const RUN_COMPLETION_RESULTS: readonly RunResult[] = ['won', 'lost'];

const didCompleteRun = (result: RunResult): boolean => RUN_COMPLETION_RESULTS.includes(result);

/**
 * Find the same-lineage next-tier evolution target for a class, or undefined if
 * the class is at apex (no further upgrade in its own lineage).
 *
 * Exported so callers (runStore, etc.) can stamp this onto the run doc at
 * startRun time — the server reads it back at endRun without a content lookup.
 */
export const findSameLineageEvolutionTarget = (classData: ClassData): string | undefined => {
  const nextTier = classData.tier + 1;
  for (const targetId of classData.evolutionTargetClassIds) {
    const target = CLASS_BY_ID.get(targetId);
    if (target === undefined) continue;
    if (target.lineageId !== classData.lineageId) continue;
    if (target.tier !== nextTier) continue;
    return target.id;
  }
  return undefined;
};

const nextSameLineageTierTarget = findSameLineageEvolutionTarget;

const addOwnedClass = (
  ownedClassIds: readonly string[],
  classId: string,
): readonly string[] => {
  if (ownedClassIds.includes(classId)) return ownedClassIds;
  return [...ownedClassIds, classId];
};

const clampLineageRank = (rank: number): number =>
  Math.max(0, Math.min(LINEAGE_RANK_CAP, Math.trunc(rank)));

const rankDeltaForOutcome = (runResult: RunResult, stageCompleted: number): number => {
  if (!didCompleteRun(runResult)) return 0;
  if (stageCompleted <= 0) return 0;
  return 1;
};

const ascensionCellsForOutcome = (runResult: RunResult, stageCompleted: number): number => {
  const stage = Math.max(0, Math.trunc(stageCompleted));
  if (stage <= 0) return 0;

  if (runResult === 'won') return stage * 3 + 25;
  if (runResult === 'lost') return stage * 2 + 8;
  return stage;
};

export const applyProgression = (input: ProgressionInput): ProgressionResult => {
  const activeClass = CLASS_BY_ID.get(input.activeClassId);
  if (activeClass === undefined) {
    throw new Error(`Unknown active class ${input.activeClassId}.`);
  }

  const stageCompleted = Math.max(0, Math.trunc(input.stageCompleted));
  const currentState = input.playerState;

  const newlyUnlockedClassIds: string[] = [];
  let rejectedEvolutionTargetClassId: string | undefined;
  let rejectionReason: 'cross_lineage_locked' | 'invalid_target' | undefined;

  const requested = input.requestedEvolutionTargetClassId;
  if (requested !== undefined) {
    const requestedClass = CLASS_BY_ID.get(requested);
    if (requestedClass === undefined) {
      rejectedEvolutionTargetClassId = requested;
      rejectionReason = 'invalid_target';
    } else if (
      requestedClass.lineageId !== activeClass.lineageId &&
      input.allowCrossLineageEvolution !== true
    ) {
      rejectedEvolutionTargetClassId = requested;
      rejectionReason = 'cross_lineage_locked';
    }
  }

  let ownedClassIds = currentState.ownedClassIds;
  if (didCompleteRun(input.runResult) && stageCompleted > 0) {
    const sameLineageTarget = nextSameLineageTierTarget(activeClass);
    if (sameLineageTarget !== undefined && !ownedClassIds.includes(sameLineageTarget)) {
      ownedClassIds = addOwnedClass(ownedClassIds, sameLineageTarget);
      newlyUnlockedClassIds.push(sameLineageTarget);
    }
  }

  const lineageRankDelta = rankDeltaForOutcome(input.runResult, stageCompleted);
  const oldRank = currentState.lineageRanks[activeClass.lineageId] ?? 0;
  const newRank = clampLineageRank(oldRank + lineageRankDelta);

  const awardedAscensionCells = ascensionCellsForOutcome(input.runResult, stageCompleted);

  const nextState: ProgressionPlayerState = {
    ownedClassIds,
    lineageRanks: {
      ...currentState.lineageRanks,
      [activeClass.lineageId]: newRank,
    },
    ascensionCells: currentState.ascensionCells + awardedAscensionCells,
  };

  return {
    playerState: nextState,
    lineageRankDelta: newRank - oldRank,
    awardedAscensionCells,
    newlyUnlockedClassIds,
    ...(rejectedEvolutionTargetClassId !== undefined
      ? { rejectedEvolutionTargetClassId }
      : {}),
    ...(rejectionReason !== undefined ? { rejectionReason } : {}),
  };
};
