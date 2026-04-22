import { CLASS_BY_ID, ENEMY_ARCHETYPE_BY_ID, SKILL_BY_ID } from '../../../content';
import { buildEnemyUnit, buildPlayerUnit, createEngine } from '../../combat';
import { selectStage } from '../director';

const ACTIVE_CLASS_ID = 'drakehorn_forge.ember_initiate';

const runReplay = (seed: number, stage: number) => {
  const selection = selectStage({
    seed,
    stage,
    activeClassId: ACTIVE_CLASS_ID,
    activeLineageId: 'drakehorn_forge',
  });

  if (selection.kind !== 'procedural' || selection.encounter === undefined) {
    throw new Error(`Expected procedural stage, got ${selection.kind}.`);
  }

  const classData = CLASS_BY_ID.get(ACTIVE_CLASS_ID);
  if (classData === undefined) {
    throw new Error('Missing active class for replay test.');
  }

  const units = [
    buildPlayerUnit(classData, {
      instanceId: 'player_1',
      insertionIndex: 0,
    }),
  ];

  let idx = 0;
  for (const entry of selection.encounter.enemies) {
    const archetype = ENEMY_ARCHETYPE_BY_ID.get(entry.archetypeId);
    if (archetype === undefined) {
      throw new Error(`Missing enemy archetype ${entry.archetypeId}.`);
    }
    for (let i = 0; i < entry.count; i += 1) {
      idx += 1;
      units.push(
        buildEnemyUnit(archetype, {
          instanceId: `enemy_${idx}`,
          tier: entry.tier,
          insertionIndex: idx,
        }),
      );
    }
  }

  let engine = createEngine({
    seed,
    units,
    skillLookup: (id) => SKILL_BY_ID.get(id),
  });

  let guard = 0;
  while (engine.state.result === 'ongoing' && guard < 3000) {
    guard += 1;
    const ready = engine.ready();
    if (ready === null) {
      engine = engine.advance();
      continue;
    }

    const target = Object.values(engine.state.units).find(
      (u) => !u.isDead && u.team !== ready.team,
    );
    if (target === undefined) {
      break;
    }

    const stepped = engine.step({
      kind: 'basic_attack',
      unitId: ready.id,
      targetId: target.id,
    });
    engine = stepped.engine;
  }

  return {
    selection,
    summary: {
      result: engine.state.result,
      tick: engine.state.tick,
      rngCursor: engine.state.rngCursor,
      elapsedSec: engine.state.elapsedSec,
      logLength: engine.state.log.length,
      survivors: Object.values(engine.state.units)
        .filter((u) => !u.isDead)
        .map((u) => ({ id: u.id, team: u.team, hp: u.hp })),
    },
  };
};

describe('run replay determinism', () => {
  it('produces identical stage selection and battle summary for the same replay input', () => {
    const a = runReplay(20260422, 2);
    const b = runReplay(20260422, 2);

    expect(a.selection).toEqual(b.selection);
    expect(a.summary).toEqual(b.summary);
  });

  it('reaches a terminal result in procedural replay simulation', () => {
    const run = runReplay(424242, 3);
    expect(run.selection.kind).toBe('procedural');
    expect(run.summary.result).not.toBe('ongoing');
  });
});
