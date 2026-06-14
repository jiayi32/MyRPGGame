import { applyProgression } from '../progression';

describe('progression engine', () => {
  it('unlocks next same-corp tier on completed run', () => {
    const out = applyProgression({
      playerState: {
        unlockedSpecIds: ['drakehorn_forge.ember_initiate'],
        corpRanks: { drakehorn_forge: 0 },
        quantumCores: 0,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 3,
      runResult: 'lost',
    });

    expect(out.newlyUnlockedSpecIds).toContain('drakehorn_forge.flame_berserker');
    expect(out.playerState.unlockedSpecIds).toContain('drakehorn_forge.flame_berserker');
  });

  it('caps corp rank at 10', () => {
    const out = applyProgression({
      playerState: {
        unlockedSpecIds: ['drakehorn_forge.inferno_executioner'],
        corpRanks: { drakehorn_forge: 10 },
        quantumCores: 50,
      },
      activeClassId: 'drakehorn_forge.inferno_executioner',
      stageCompleted: 18,
      runResult: 'won',
    });

    expect(out.playerState.corpRanks.drakehorn_forge).toBe(10);
    expect(out.corpRankDelta).toBe(0);
  });

  it('rejects requested cross-corp evolution for v1', () => {
    const out = applyProgression({
      playerState: {
        unlockedSpecIds: ['drakehorn_forge.ember_initiate'],
        corpRanks: { drakehorn_forge: 1 },
        quantumCores: 5,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 4,
      runResult: 'lost',
      requestedEvolutionTargetClassId: 'thorn_ledger.plague_hunter',
      allowCrossCorpEvolution: false,
    });

    expect(out.rejectedEvolutionTargetClassId).toBe('thorn_ledger.plague_hunter');
    expect(out.rejectionReason).toBe('cross_corp_locked');
  });

  it('does not duplicate unlock when next tier already owned', () => {
    const out = applyProgression({
      playerState: {
        unlockedSpecIds: ['drakehorn_forge.ember_initiate', 'drakehorn_forge.flame_berserker'],
        corpRanks: { drakehorn_forge: 2 },
        quantumCores: 20,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 6,
      runResult: 'won',
    });

    expect(out.newlyUnlockedSpecIds).toEqual([]);
    expect(out.playerState.unlockedSpecIds.filter((id) => id === 'drakehorn_forge.flame_berserker')).toHaveLength(1);
  });

  it('does not increase corp rank on fled outcome', () => {
    const out = applyProgression({
      playerState: {
        unlockedSpecIds: ['drakehorn_forge.ember_initiate'],
        corpRanks: { drakehorn_forge: 4 },
        quantumCores: 12,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 8,
      runResult: 'fled',
    });

    expect(out.corpRankDelta).toBe(0);
    expect(out.playerState.corpRanks.drakehorn_forge).toBe(4);
  });
});
