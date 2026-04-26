import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  rankDeltaForOutcome,
  ascensionCellsForOutcome,
  clampLineageRank,
  computeProgression,
  isCompletedRun,
} from '../shared/progression.js';

describe('isCompletedRun', () => {
  it('won and lost are completed', () => {
    assert.equal(isCompletedRun('won'), true);
    assert.equal(isCompletedRun('lost'), true);
  });

  it('fled is not completed', () => {
    assert.equal(isCompletedRun('fled'), false);
  });
});

describe('rankDeltaForOutcome', () => {
  it('returns 1 for won with stageCompleted > 0', () => {
    assert.equal(rankDeltaForOutcome('won', 5), 1);
  });

  it('returns 1 for lost with stageCompleted > 0', () => {
    assert.equal(rankDeltaForOutcome('lost', 3), 1);
  });

  it('returns 0 for fled', () => {
    assert.equal(rankDeltaForOutcome('fled', 5), 0);
  });

  it('returns 0 when stageCompleted is 0', () => {
    assert.equal(rankDeltaForOutcome('won', 0), 0);
    assert.equal(rankDeltaForOutcome('lost', 0), 0);
  });

  it('returns 0 when stageCompleted is negative', () => {
    assert.equal(rankDeltaForOutcome('won', -1), 0);
  });
});

describe('ascensionCellsForOutcome', () => {
  it('won: 3*stage+25', () => {
    assert.equal(ascensionCellsForOutcome('won', 10), 55);
    assert.equal(ascensionCellsForOutcome('won', 1), 28);
  });

  it('lost: 2*stage+8', () => {
    assert.equal(ascensionCellsForOutcome('lost', 5), 18);
    assert.equal(ascensionCellsForOutcome('lost', 1), 10);
  });

  it('fled: stage only', () => {
    assert.equal(ascensionCellsForOutcome('fled', 7), 7);
  });

  it('returns 0 when stageCompleted is 0 or negative', () => {
    assert.equal(ascensionCellsForOutcome('won', 0), 0);
    assert.equal(ascensionCellsForOutcome('lost', -1), 0);
  });

  it('truncates fractional stage', () => {
    assert.equal(ascensionCellsForOutcome('won', 3.9), ascensionCellsForOutcome('won', 3));
  });
});

describe('clampLineageRank', () => {
  it('clamps to [0, 10]', () => {
    assert.equal(clampLineageRank(-5), 0);
    assert.equal(clampLineageRank(0), 0);
    assert.equal(clampLineageRank(5), 5);
    assert.equal(clampLineageRank(10), 10);
    assert.equal(clampLineageRank(11), 10);
  });

  it('truncates fractions', () => {
    assert.equal(clampLineageRank(3.9), 3);
  });
});

describe('computeProgression', () => {
  const base = {
    activeLineageId: 'drakehorn_forge',
    evolutionTargetClassId: 'drakehorn_forge.ashforged',
    ownedClassIds: ['drakehorn_forge.ember_initiate'] as string[],
    lineageRanks: {} as Record<string, number>,
  };

  it('unlocks evolution target on won run with stageCompleted > 0', () => {
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5 });
    assert.deepEqual(result.newlyUnlockedClassIds, ['drakehorn_forge.ashforged']);
    assert.equal(result.lineageRankDelta, 1);
    assert.equal(result.newRank, 1);
    assert.equal(result.awardedAscensionCells, ascensionCellsForOutcome('won', 5));
  });

  it('unlocks evolution target on lost run', () => {
    const result = computeProgression({ ...base, result: 'lost', stageCompleted: 3 });
    assert.deepEqual(result.newlyUnlockedClassIds, ['drakehorn_forge.ashforged']);
    assert.equal(result.lineageRankDelta, 1);
  });

  it('does NOT unlock if evolution target already owned', () => {
    const owned = [...base.ownedClassIds, 'drakehorn_forge.ashforged'];
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, ownedClassIds: owned });
    assert.deepEqual(result.newlyUnlockedClassIds, []);
  });

  it('does NOT unlock on fled result', () => {
    const result = computeProgression({ ...base, result: 'fled', stageCompleted: 5 });
    assert.deepEqual(result.newlyUnlockedClassIds, []);
    assert.equal(result.lineageRankDelta, 0);
  });

  it('does NOT unlock when stageCompleted is 0', () => {
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 0 });
    assert.deepEqual(result.newlyUnlockedClassIds, []);
    assert.equal(result.lineageRankDelta, 0);
    assert.equal(result.awardedAscensionCells, 0);
  });

  it('does NOT unlock when evolutionTargetClassId is null', () => {
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, evolutionTargetClassId: null });
    assert.deepEqual(result.newlyUnlockedClassIds, []);
  });

  it('increments existing lineage rank', () => {
    const ranks = { drakehorn_forge: 4 };
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, lineageRanks: ranks });
    assert.equal(result.newRank, 5);
    assert.equal(result.lineageRankDelta, 1);
  });

  it('caps lineage rank at 10', () => {
    const ranks = { drakehorn_forge: 10 };
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, lineageRanks: ranks });
    assert.equal(result.newRank, 10);
    assert.equal(result.lineageRankDelta, 0);
  });
});
