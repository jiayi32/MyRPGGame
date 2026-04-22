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
