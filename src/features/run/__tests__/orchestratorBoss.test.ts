import { autoPlayStage, prepareStage, buildStageReport } from '../orchestrator';

describe('orchestrator — boss stage support', () => {
  it('prepares stage 5 (Pyre Warden mini-boss) without crashing', () => {
    const prepared = prepareStage({
      seed: 12345,
      stageIndex: 5,
      activeClassId: 'drakehorn_forge.ember_initiate',
    });
    expect(prepared.encounterId).toMatch(/boss\./);
    expect(prepared.enemyCount).toBe(1);
    expect(prepared.engine.state.result).toBe('ongoing');

    // Verify the boss unit is in the engine.
    const enemyUnits = Object.values(prepared.engine.state.units).filter((u) => u.team === 'enemy');
    expect(enemyUnits).toHaveLength(1);
    expect(enemyUnits[0]?.displayName).toBe('Pyre Warden');
    expect(enemyUnits[0]?.skillIds.length).toBeGreaterThan(0);
  });

  it('prepares stage 10 (Vortex Colossus gate) and runs to terminal', () => {
    const prepared = prepareStage({
      seed: 9876,
      stageIndex: 10,
      activeClassId: 'drakehorn_forge.ember_initiate',
    });
    const enemyUnits = Object.values(prepared.engine.state.units).filter((u) => u.team === 'enemy');
    expect(enemyUnits[0]?.displayName).toBe('Vortex Colossus');

    const finished = autoPlayStage(prepared);
    expect(finished.state.result).not.toBe('ongoing');
  });

  it('prepares stage 30 (Rimefang Hydra) and emits a usable report', () => {
    const prepared = prepareStage({
      seed: 4242,
      stageIndex: 30,
      activeClassId: 'drakehorn_forge.ember_initiate',
    });
    const finished = autoPlayStage(prepared);
    const report = buildStageReport(prepared, finished);

    expect(report.stageIndex).toBe(30);
    expect(report.encounterId).toMatch(/boss\./);
    expect(['won', 'lost', 'draw']).toContain(report.battleResult);
    // Boss-stage rewards larger than procedural for the same tier.
    if (report.outcomeResult === 'won') {
      expect(report.claimedRewards.gold).toBeGreaterThanOrEqual(1500);
      expect(report.claimedRewards.ascensionCells).toBeGreaterThanOrEqual(12);
    }
  });

  it('procedural stages still work end-to-end (regression)', () => {
    const prepared = prepareStage({
      seed: 7,
      stageIndex: 2,
      activeClassId: 'drakehorn_forge.ember_initiate',
    });
    expect(prepared.enemyCount).toBeGreaterThan(0);
    const finished = autoPlayStage(prepared);
    expect(finished.state.result).not.toBe('ongoing');
  });
});
