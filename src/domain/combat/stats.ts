import type { DamageType } from '../../content/types';
import type { ResolvedStats, StatusInstance, Unit } from './types';

export const CT_REDUCTION_CAP = 0.1;

const ZERO_RESISTANCES: Readonly<Partial<Record<DamageType, number>>> = {};

export const makeBaseStats = (overrides: Partial<ResolvedStats>): ResolvedStats => ({
  strength: overrides.strength ?? 0,
  intellect: overrides.intellect ?? 0,
  agility: overrides.agility ?? 0,
  stamina: overrides.stamina ?? 0,
  defense: overrides.defense ?? 0,
  magicDefense: overrides.magicDefense ?? 0,
  speed: overrides.speed ?? 50,
  critChance: overrides.critChance ?? 0.05,
  critMultiplier: overrides.critMultiplier ?? 1.5,
  ctReductionPct: Math.min(overrides.ctReductionPct ?? 0, CT_REDUCTION_CAP),
  resistances: overrides.resistances ?? ZERO_RESISTANCES,
});

type StatKey = keyof Omit<ResolvedStats, 'resistances'>;

const STAT_KEYS: readonly StatKey[] = [
  'strength',
  'intellect',
  'agility',
  'stamina',
  'defense',
  'magicDefense',
  'speed',
  'critChance',
  'critMultiplier',
  'ctReductionPct',
];

const normalizeStatTag = (tag: string | undefined): StatKey | null => {
  if (tag === undefined) return null;
  const lower = tag.toLowerCase();
  const aliases: Readonly<Record<string, StatKey>> = {
    strength: 'strength',
    str: 'strength',
    atk: 'strength',
    attack: 'strength',
    intellect: 'intellect',
    int: 'intellect',
    magic: 'intellect',
    agility: 'agility',
    agi: 'agility',
    stamina: 'stamina',
    hp: 'stamina',
    defense: 'defense',
    def: 'defense',
    magicdefense: 'magicDefense',
    magic_defense: 'magicDefense',
    mdef: 'magicDefense',
    speed: 'speed',
    spd: 'speed',
    critchance: 'critChance',
    crit: 'critChance',
    critmultiplier: 'critMultiplier',
    ctreduction: 'ctReductionPct',
    ct_reduction: 'ctReductionPct',
  };
  return aliases[lower] ?? null;
};

const asDelta = (
  magnitude: number,
  magnitudeUnit: StatusInstance['snapshot']['magnitudeUnit'],
  baseline: number,
): number => {
  switch (magnitudeUnit) {
    case 'flat':
      return magnitude;
    case 'percent':
    case 'multiplier':
      return baseline * magnitude;
    default:
      return 0;
  }
};

export const effectiveStats = (unit: Unit): ResolvedStats => {
  const base = unit.baseStats;
  const delta: Record<StatKey, number> = {
    strength: 0,
    intellect: 0,
    agility: 0,
    stamina: 0,
    defense: 0,
    magicDefense: 0,
    speed: 0,
    critChance: 0,
    critMultiplier: 0,
    ctReductionPct: 0,
  };

  for (const status of unit.statuses) {
    if (status.kind !== 'buff' && status.kind !== 'debuff') continue;
    const sign = status.kind === 'buff' ? 1 : -1;
    const key = normalizeStatTag(status.snapshot.statTag);
    if (key === null) continue;
    const baseline = base[key];
    const d =
      sign *
      asDelta(status.snapshot.magnitude, status.snapshot.magnitudeUnit, baseline) *
      status.stacks;
    delta[key] += d;
  }

  const result: Record<StatKey, number> = { ...base };
  for (const key of STAT_KEYS) result[key] = base[key] + delta[key];
  result.ctReductionPct = Math.min(result.ctReductionPct, CT_REDUCTION_CAP);

  return {
    ...(result as unknown as Omit<ResolvedStats, 'resistances'>),
    resistances: base.resistances,
  };
};

export const defenseFor = (
  stats: ResolvedStats,
  damageType: DamageType,
): number => {
  if (damageType === 'physical') return stats.defense;
  if (damageType === 'true') return 0;
  return stats.magicDefense;
};

export const resistanceFor = (
  stats: ResolvedStats,
  damageType: DamageType,
): number => stats.resistances[damageType] ?? 0;
