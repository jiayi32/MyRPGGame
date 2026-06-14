import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  rankDeltaForOutcome,
  quantumCoresForOutcome,
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

describe('quantumCoresForOutcome', () => {
  it('won: 3*stage+25', () => {
    assert.equal(quantumCoresForOutcome('won', 10), 55);
    assert.equal(quantumCoresForOutcome('won', 1), 28);
  });

  it('lost: 2*stage+8', () => {
    assert.equal(quantumCoresForOutcome('lost', 5), 18);
    assert.equal(quantumCoresForOutcome('lost', 1), 10);
  });

  it('fled: stage only', () => {
    assert.equal(quantumCoresForOutcome('fled', 7), 7);
  });

  it('returns 0 when stageCompleted is 0 or negative', () => {
    assert.equal(quantumCoresForOutcome('won', 0), 0);
    assert.equal(quantumCoresForOutcome('lost', -1), 0);
  });

  it('truncates fractional stage', () => {
    assert.equal(quantumCoresForOutcome('won', 3.9), quantumCoresForOutcome('won', 3));
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
    activeCorpId: 'drakehorn_forge',
    evolutionTargetSpecId: 'drakehorn_forge.ashforged',
    unlockedSpecIds: ['drakehorn_forge.ember_initiate'] as string[],
    corpRanks: {} as Record<string, number>,
  };

  it('unlocks evolution target on won run with stageCompleted > 0', () => {
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5 });
    assert.deepEqual(result.newlyUnlockedSpecIds, ['drakehorn_forge.ashforged']);
    assert.equal(result.corpRankDelta, 1);
    assert.equal(result.newRank, 1);
    assert.equal(result.awardedQuantumCores, quantumCoresForOutcome('won', 5));
  });

  it('unlocks evolution target on lost run', () => {
    const result = computeProgression({ ...base, result: 'lost', stageCompleted: 3 });
    assert.deepEqual(result.newlyUnlockedSpecIds, ['drakehorn_forge.ashforged']);
    assert.equal(result.corpRankDelta, 1);
  });

  it('does NOT unlock if evolution target already owned', () => {
    const owned = [...base.unlockedSpecIds, 'drakehorn_forge.ashforged'];
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, unlockedSpecIds: owned });
    assert.deepEqual(result.newlyUnlockedSpecIds, []);
  });

  it('does NOT unlock on fled result', () => {
    const result = computeProgression({ ...base, result: 'fled', stageCompleted: 5 });
    assert.deepEqual(result.newlyUnlockedSpecIds, []);
    assert.equal(result.corpRankDelta, 0);
  });

  it('does NOT unlock when stageCompleted is 0', () => {
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 0 });
    assert.deepEqual(result.newlyUnlockedSpecIds, []);
    assert.equal(result.corpRankDelta, 0);
    assert.equal(result.awardedQuantumCores, 0);
  });

  it('does NOT unlock when evolutionTargetSpecId is null', () => {
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, evolutionTargetSpecId: null });
    assert.deepEqual(result.newlyUnlockedSpecIds, []);
  });

  it('increments existing corp rank', () => {
    const ranks = { drakehorn_forge: 4 };
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, corpRanks: ranks });
    assert.equal(result.newRank, 5);
    assert.equal(result.corpRankDelta, 1);
  });

  it('caps corp rank at 10', () => {
    const ranks = { drakehorn_forge: 10 };
    const result = computeProgression({ ...base, result: 'won', stageCompleted: 5, corpRanks: ranks });
    assert.equal(result.newRank, 10);
    assert.equal(result.corpRankDelta, 0);
  });
});
