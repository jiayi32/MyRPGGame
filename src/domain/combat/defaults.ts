import {
  isSpecified,
  type MagnitudeUnit,
  type SkillEffect,
  type SkillEffectKind,
} from '../../content/types';

interface MagnitudeDefault {
  readonly magnitude: number;
  readonly magnitudeUnit: MagnitudeUnit;
}

export const DEFAULTS: Readonly<Record<SkillEffectKind, MagnitudeDefault>> = {
  damage: { magnitude: 1.0, magnitudeUnit: 'multiplier' },
  dot: { magnitude: 0.05, magnitudeUnit: 'max_hp_percent' },
  heal: { magnitude: 0.2, magnitudeUnit: 'max_hp_percent' },
  hot: { magnitude: 0.05, magnitudeUnit: 'max_hp_percent' },
  buff: { magnitude: 0.1, magnitudeUnit: 'percent' },
  debuff: { magnitude: 0.1, magnitudeUnit: 'percent' },
  shield: { magnitude: 0.15, magnitudeUnit: 'max_hp_percent' },
  counter: { magnitude: 0.5, magnitudeUnit: 'multiplier' },
  summon: { magnitude: 0, magnitudeUnit: 'flat' },
  ct_shift: { magnitude: 10, magnitudeUnit: 'flat' },
  status: { magnitude: 3, magnitudeUnit: 'flat' },
  execute: { magnitude: 0.1, magnitudeUnit: 'max_hp_percent' },
  cleanse: { magnitude: 1, magnitudeUnit: 'flat' },
  lifesteal: { magnitude: 0.3, magnitudeUnit: 'percent' },
  utility: { magnitude: 0, magnitudeUnit: 'flat' },
};

export const DEFAULT_DURATION_SEC: Readonly<
  Partial<Record<SkillEffectKind, number>>
> = {
  dot: 4,
  hot: 4,
  buff: 8,
  debuff: 8,
  shield: 6,
  status: 3,
  counter: 6,
};

export const DEFAULT_STACKS = 1;

export const DEFAULT_CHANCE = 1;

export const DEFAULT_TICK_INTERVAL_SEC = 1;

export const resolveMagnitude = (effect: SkillEffect): MagnitudeDefault => {
  if (effect.magnitude !== undefined && isSpecified(effect.magnitude)) {
    return {
      magnitude: effect.magnitude,
      magnitudeUnit: effect.magnitudeUnit ?? DEFAULTS[effect.kind].magnitudeUnit,
    };
  }
  return DEFAULTS[effect.kind];
};

export const resolveDurationSec = (effect: SkillEffect): number => {
  if (effect.durationSec !== undefined && isSpecified(effect.durationSec)) {
    return effect.durationSec;
  }
  return DEFAULT_DURATION_SEC[effect.kind] ?? 0;
};

export const resolveStacks = (effect: SkillEffect): number => {
  if (effect.stacks !== undefined && isSpecified(effect.stacks)) {
    return effect.stacks;
  }
  return DEFAULT_STACKS;
};

export const resolveChance = (effect: SkillEffect): number => {
  if (effect.chance !== undefined && isSpecified(effect.chance)) {
    return effect.chance;
  }
  return DEFAULT_CHANCE;
};
