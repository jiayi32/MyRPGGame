import type { UnspecifiedOr } from './sentinel';
import type { SkillId } from './ids';

export type ResourceType = 'HP' | 'MP' | 'none';

export type SkillTarget = 'self' | 'single' | 'area' | 'global' | 'cone' | 'ally' | 'allies';

export type DamageType =
  | 'physical'
  | 'fire'
  | 'poison'
  | 'ice'
  | 'shadow'
  | 'radiant'
  | 'arcane'
  | 'lightning'
  | 'true';

export type SkillEffectKind =
  | 'damage'
  | 'dot'
  | 'heal'
  | 'hot'
  | 'buff'
  | 'debuff'
  | 'shield'
  | 'counter'
  | 'summon'
  | 'ct_shift'
  | 'status'
  | 'execute'
  | 'cleanse'
  | 'lifesteal'
  | 'utility';

export type MagnitudeUnit =
  | 'flat'
  | 'percent'
  | 'multiplier'
  | 'hp_percent'
  | 'mp_percent'
  | 'max_hp_percent';

export interface SkillEffect {
  kind: SkillEffectKind;
  description: string;
  magnitude?: UnspecifiedOr<number>;
  magnitudeUnit?: MagnitudeUnit;
  damageType?: DamageType;
  durationSec?: UnspecifiedOr<number>;
  stacks?: UnspecifiedOr<number>;
  chance?: UnspecifiedOr<number>;
  statTag?: string;
}

export interface SkillResourceCost {
  type: ResourceType;
  cost: UnspecifiedOr<number>;
}

export type SkillTag =
  | 'burst'
  | 'sustain'
  | 'control'
  | 'ct_manipulation'
  | 'defense_break'
  | 'summon'
  | 'execute'
  | 'dot'
  | 'heal'
  | 'aoe'
  | 'ranged'
  | 'multi-hit'
  | 'cone'
  | 'fire'
  | 'self-damage'
  | 'ultimate'
  | 'self-sacrifice'
  | 'counter'
  | 'knockback'
  | 'pull'
  | 'team buff'
  | 'debuff'
  | 'dot buff'
  | 'life drain'
  | 'area'
  | 'cleanse'
  | 'buff'
  | 'passive-buff'
  | 'single-target'
  | 'physical';

export interface Skill {
  id: SkillId;
  name: string;
  description: string;
  ctCost: UnspecifiedOr<number>;
  cooldownSec: UnspecifiedOr<number>;
  resource: SkillResourceCost;
  target: SkillTarget;
  tags: SkillTag[];
  effects: SkillEffect[];
  /** When true, this skill never misses regardless of agility differential. */
  neverMiss?: boolean;
  /** Adjusts hit threshold: positive = easier to hit (subtracts from failThreshold), negative = harder. */
  accuracyBonus?: number;
}
