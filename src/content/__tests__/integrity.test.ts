import { ANOMALY_CATEGORIES } from '../anomalies';
import { BOSSES } from '../bosses';
import { CLASSES, CLASS_BY_ID } from '../classes';
import { ENEMY_ARCHETYPES } from '../enemies';
import { GEAR_ITEMS, GEAR_TEMPLATES } from '../gear';
import { LINEAGES, LINEAGE_BY_ID } from '../lineages';
import { SKILLS, SKILL_BY_ID } from '../skills';
import {
  isSpecified,
  isUnspecified,
  type ClassData,
  type ClassTier,
  type LineageId,
} from '../types';

describe('content integrity', () => {
  test('no duplicate ids within each entity space', () => {
    const spaces: readonly (readonly [string, readonly { id: string }[]])[] = [
      ['lineage', LINEAGES],
      ['class', CLASSES],
      ['skill', SKILLS],
      ['gear_item', GEAR_ITEMS],
      ['gear_template', GEAR_TEMPLATES],
      ['enemy_archetype', ENEMY_ARCHETYPES],
      ['anomaly', ANOMALY_CATEGORIES],
      ['boss', BOSSES],
    ];
    for (const [name, entries] of spaces) {
      const ids = entries.map((e) => e.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect({ space: name, dupes }).toEqual({ space: name, dupes: [] });
    }
  });

  test('every class.skillIds entry resolves to a known skill', () => {
    const unresolved: { classId: string; skillId: string }[] = [];
    for (const c of CLASSES) {
      for (const sid of c.skillIds) {
        if (!SKILL_BY_ID.has(sid)) unresolved.push({ classId: c.id, skillId: sid });
      }
      if (isSpecified(c.basicAttackSkillId) && !SKILL_BY_ID.has(c.basicAttackSkillId)) {
        unresolved.push({ classId: c.id, skillId: c.basicAttackSkillId });
      }
    }
    expect(unresolved).toEqual([]);
  });

  test('every class.evolutionTargetClassIds entry resolves to a known class (real or stub)', () => {
    const unresolved: { classId: string; target: string }[] = [];
    for (const c of CLASSES) {
      for (const t of c.evolutionTargetClassIds) {
        if (!CLASS_BY_ID.has(t)) unresolved.push({ classId: c.id, target: t });
      }
    }
    expect(unresolved).toEqual([]);
  });

  test('class.lineageId always resolves to a known lineage', () => {
    const unresolved = CLASSES.filter((c) => !LINEAGE_BY_ID.has(c.lineageId)).map((c) => c.id);
    expect(unresolved).toEqual([]);
  });

  test('gear.lineageId (when present) resolves to a known lineage', () => {
    const unresolved = GEAR_ITEMS.filter(
      (g) => g.lineageId !== undefined && !LINEAGE_BY_ID.has(g.lineageId),
    ).map((g) => g.id);
    expect(unresolved).toEqual([]);
  });

  test('boss.lineageCounter (when present) resolves to a known lineage', () => {
    const unresolved = BOSSES.filter(
      (b) => b.lineageCounter !== undefined && !LINEAGE_BY_ID.has(b.lineageCounter),
    ).map((b) => b.id);
    expect(unresolved).toEqual([]);
  });

  test('adjacency targets resolve; symmetry is warned (not asserted)', () => {
    const unresolved: { lineage: string; target: string }[] = [];
    for (const l of LINEAGES) {
      for (const adj of l.adjacentLineageIds) {
        if (!LINEAGE_BY_ID.has(adj)) unresolved.push({ lineage: l.id, target: adj });
      }
    }
    expect(unresolved).toEqual([]);

    const asymmetric: { a: LineageId; b: LineageId }[] = [];
    for (const l of LINEAGES) {
      for (const adj of l.adjacentLineageIds) {
        const other = LINEAGE_BY_ID.get(adj);
        if (other && !other.adjacentLineageIds.includes(l.id)) {
          asymmetric.push({ a: l.id, b: adj });
        }
      }
    }
    if (asymmetric.length > 0) {
      console.warn('adjacency asymmetry detected:', asymmetric);
    }
  });

  test('every class has a valid combatArchetype', () => {
    const valid = new Set(['burst_dps', 'sustain_dps', 'tank', 'support', 'trickster']);
    const invalid = CLASSES.filter((c) => !valid.has(c.combatArchetype)).map((c) => ({
      id: c.id,
      combatArchetype: c.combatArchetype,
    }));
    expect(invalid).toEqual([]);
  });

  test('Drakehorn Forge has a walkable T5→T1 same-lineage evolution chain', () => {
    const drakehornClasses = CLASSES.filter(
      (c) => c.lineageId === 'drakehorn_forge' && c.isStub !== true,
    );
    const byTier = new Map<ClassTier, ClassData>();
    for (const c of drakehornClasses) byTier.set(c.tier, c);
    const tiers: ClassTier[] = [1, 2, 3, 4, 5];
    for (const t of tiers) expect(byTier.has(t)).toBe(true);

    for (const t of [1, 2, 3, 4] as const) {
      const next = (t + 1) as ClassTier;
      const here = byTier.get(t)!;
      const sameLineageTargets = here.evolutionTargetClassIds.filter((id) => {
        const tgt = CLASS_BY_ID.get(id);
        return tgt?.lineageId === 'drakehorn_forge';
      });
      const hasNext = sameLineageTargets.some((id) => CLASS_BY_ID.get(id)?.tier === next);
      expect({ tier: t, hasNext }).toEqual({ tier: t, hasNext: true });
    }
  });

  test('sentinel audit snapshot', () => {
    const counts: Record<string, number> = {};
    const bump = (k: string): void => {
      counts[k] = (counts[k] ?? 0) + 1;
    };

    for (const l of LINEAGES) {
      if (isUnspecified(l.upgradeBonuses)) bump('lineage.upgradeBonuses');
      else
        for (const ub of l.upgradeBonuses)
          if (isUnspecified(ub.magnitude)) bump('lineage.upgradeBonus.magnitude');
      if (isUnspecified(l.uniqueMechanic)) bump('lineage.uniqueMechanic');
    }
    for (const c of CLASSES) {
      if (isUnspecified(c.ctRange)) bump('class.ctRange');
      if (isUnspecified(c.basicAttackSkillId)) bump('class.basicAttackSkillId');
      for (const p of c.passives) if (isUnspecified(p.magnitude)) bump('class.passive.magnitude');
    }
    for (const s of SKILLS) {
      for (const e of s.effects) if (isUnspecified(e.magnitude)) bump('skill.effect.magnitude');
    }
    for (const g of GEAR_ITEMS) {
      if (isUnspecified(g.baseStats)) bump('gear.baseStats');
      if (isUnspecified(g.multStats)) bump('gear.multStats');
      if (isUnspecified(g.tradeoffs)) bump('gear.tradeoffs');
      if (isUnspecified(g.upgradeLevels)) bump('gear.upgradeLevels');
      for (const p of g.passives) if (isUnspecified(p.magnitude)) bump('gear.passive.magnitude');
    }
    for (const b of BOSSES) {
      if (isUnspecified(b.hp)) bump('boss.hp');
      if (isUnspecified(b.atk)) bump('boss.atk');
      if (isUnspecified(b.def)) bump('boss.def');
      for (const m of b.mechanics) if (isUnspecified(m.magnitude)) bump('boss.mechanic.magnitude');
    }

    expect(counts).toMatchSnapshot();
  });
});
