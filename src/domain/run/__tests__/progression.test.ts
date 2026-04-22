import { applyProgression } from '../progression';

describe('progression engine', () => {
  it('unlocks next same-lineage tier on completed run', () => {
    const out = applyProgression({
      playerState: {
        ownedClassIds: ['drakehorn_forge.ember_initiate'],
        lineageRanks: { drakehorn_forge: 0 },
        ascensionCells: 0,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 3,
      runResult: 'lost',
    });

    expect(out.newlyUnlockedClassIds).toContain('drakehorn_forge.flame_berserker');
    expect(out.playerState.ownedClassIds).toContain('drakehorn_forge.flame_berserker');
  });

  it('caps lineage rank at 10', () => {
    const out = applyProgression({
      playerState: {
        ownedClassIds: ['drakehorn_forge.inferno_executioner'],
        lineageRanks: { drakehorn_forge: 10 },
        ascensionCells: 50,
      },
      activeClassId: 'drakehorn_forge.inferno_executioner',
      stageCompleted: 18,
      runResult: 'won',
    });

    expect(out.playerState.lineageRanks.drakehorn_forge).toBe(10);
    expect(out.lineageRankDelta).toBe(0);
  });

  it('rejects requested cross-lineage evolution for v1', () => {
    const out = applyProgression({
      playerState: {
        ownedClassIds: ['drakehorn_forge.ember_initiate'],
        lineageRanks: { drakehorn_forge: 1 },
        ascensionCells: 5,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 4,
      runResult: 'lost',
      requestedEvolutionTargetClassId: 'thorn_ledger.plague_hunter',
      allowCrossLineageEvolution: false,
    });

    expect(out.rejectedEvolutionTargetClassId).toBe('thorn_ledger.plague_hunter');
    expect(out.rejectionReason).toBe('cross_lineage_locked');
  });

  it('does not duplicate unlock when next tier already owned', () => {
    const out = applyProgression({
      playerState: {
        ownedClassIds: ['drakehorn_forge.ember_initiate', 'drakehorn_forge.flame_berserker'],
        lineageRanks: { drakehorn_forge: 2 },
        ascensionCells: 20,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 6,
      runResult: 'won',
    });

    expect(out.newlyUnlockedClassIds).toEqual([]);
    expect(out.playerState.ownedClassIds.filter((id) => id === 'drakehorn_forge.flame_berserker')).toHaveLength(1);
  });

  it('does not increase lineage rank on fled outcome', () => {
    const out = applyProgression({
      playerState: {
        ownedClassIds: ['drakehorn_forge.ember_initiate'],
        lineageRanks: { drakehorn_forge: 4 },
        ascensionCells: 12,
      },
      activeClassId: 'drakehorn_forge.ember_initiate',
      stageCompleted: 8,
      runResult: 'fled',
    });

    expect(out.lineageRankDelta).toBe(0);
    expect(out.playerState.lineageRanks.drakehorn_forge).toBe(4);
  });
});
