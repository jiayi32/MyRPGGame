import { selectStage } from '../director';

describe('run director', () => {
  it('is deterministic for same seed, stage, and class', () => {
    const a = selectStage({
      seed: 12345,
      stage: 8,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });
    const b = selectStage({
      seed: 12345,
      stage: 8,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });
    expect(a).toEqual(b);
  });

  it('routes boss stages to boss selections', () => {
    const stage5 = selectStage({
      seed: 11,
      stage: 5,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });
    const stage10 = selectStage({
      seed: 11,
      stage: 10,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });
    const stage30 = selectStage({
      seed: 11,
      stage: 30,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });

    expect(stage5.kind).toBe('boss');
    expect(stage5.bossId).toBeDefined();
    expect(stage10.kind).toBe('boss');
    expect(stage10.bossId).toBeDefined();
    expect(stage30.kind).toBe('boss');
    expect(stage30.bossId).toBeDefined();
  });

  it('marks checkpoint stages correctly', () => {
    const stage9 = selectStage({
      seed: 9,
      stage: 9,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });
    const stage10 = selectStage({
      seed: 9,
      stage: 10,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });

    expect(stage9.isCheckpoint).toBe(false);
    expect(stage10.isCheckpoint).toBe(true);
  });

  it('keeps stage 20 as procedural checkpoint (non-boss)', () => {
    const stage20 = selectStage({
      seed: 24,
      stage: 20,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });

    expect(stage20.isCheckpoint).toBe(true);
    expect(stage20.kind).toBe('procedural');
    expect(stage20.encounter).toBeDefined();
    expect(stage20.bossId).toBeUndefined();
  });

  it('returns template metadata on procedural encounters', () => {
    const stage8 = selectStage({
      seed: 13579,
      stage: 8,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
    });

    expect(stage8.kind).toBe('procedural');
    expect(stage8.encounter?.templateId).toMatch(/^encounter\.template\./);
    expect(stage8.encounter?.templateTags.length).toBeGreaterThan(0);
  });

  it('propagates selected room metadata on procedural encounters', () => {
    const stage8 = selectStage({
      seed: 31415,
      stage: 8,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
      roomType: 'elite',
      roomNodeId: 'map.s8.n2',
    });

    expect(stage8.kind).toBe('procedural');
    expect(stage8.encounter?.roomType).toBe('elite');
    expect(stage8.encounter?.roomNodeId).toBe('map.s8.n2');
  });

  it('applies elite room combat/reward pressure over normal rooms', () => {
    const normal = selectStage({
      seed: 24680,
      stage: 8,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
      roomType: 'normal',
    });
    const elite = selectStage({
      seed: 24680,
      stage: 8,
      activeClassId: 'drakehorn_forge.ember_initiate',
      activeLineageId: 'drakehorn_forge',
      roomType: 'elite',
    });

    expect(normal.kind).toBe('procedural');
    expect(elite.kind).toBe('procedural');

    const normalEnemyCount =
      normal.encounter?.enemies.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
    const eliteEnemyCount =
      elite.encounter?.enemies.reduce((sum, entry) => sum + entry.count, 0) ?? 0;

    expect(eliteEnemyCount).toBeGreaterThanOrEqual(normalEnemyCount);
    expect((elite.encounter?.rewards.gold ?? 0)).toBeGreaterThan(normal.encounter?.rewards.gold ?? 0);
  });

  it('assigns anomaly metadata deterministically when rolled', () => {
    const stages = Array.from({ length: 29 }, (_, i) => i + 1).filter(
      (stage) => ![5, 10].includes(stage),
    );
    const seeds = [20260422, 9901];

    const firstPass = seeds.flatMap((seed) =>
      stages.map((stage) =>
        selectStage({
          seed,
          stage,
          activeClassId: 'drakehorn_forge.ember_initiate',
          activeLineageId: 'drakehorn_forge',
        }),
      ),
    );

    const secondPass = seeds.flatMap((seed) =>
      stages.map((stage) =>
        selectStage({
          seed,
          stage,
          activeClassId: 'drakehorn_forge.ember_initiate',
          activeLineageId: 'drakehorn_forge',
        }),
      ),
    );

    expect(firstPass).toEqual(secondPass);

    const anomalousSelections = firstPass.filter(
      (selection) => selection.kind === 'procedural' && selection.encounter?.anomalyId !== undefined,
    );
    expect(anomalousSelections.length).toBeGreaterThan(0);
    for (const selection of anomalousSelections) {
      expect(selection.encounter?.anomalyKind).toBeDefined();
    }
  });

  it('throws on out-of-range stage input', () => {
    expect(() =>
      selectStage({
        seed: 1,
        stage: 0,
        activeClassId: 'drakehorn_forge.ember_initiate',
        activeLineageId: 'drakehorn_forge',
      }),
    ).toThrow('Invalid stage');

    expect(() =>
      selectStage({
        seed: 1,
        stage: 31,
        activeClassId: 'drakehorn_forge.ember_initiate',
        activeLineageId: 'drakehorn_forge',
      }),
    ).toThrow('Invalid stage');
  });
});
