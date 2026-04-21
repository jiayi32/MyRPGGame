import type { UnspecifiedOr } from './sentinel';
import type { EnemyArchetypeId } from './ids';

export type EnemyTier = 1 | 2 | 3 | 4;

export interface EnemyTierScaling {
  tier: EnemyTier;
  hp: UnspecifiedOr<number>;
  atk: UnspecifiedOr<number>;
  def: UnspecifiedOr<number>;
  ctPerTick: UnspecifiedOr<number>;
  notes?: string;
}

export interface EnemyArchetype {
  id: EnemyArchetypeId;
  name: string;
  role: string;
  signature: string;
  stressAxis: string;
  foreshadowsBossRole?: string;
  scaling: EnemyTierScaling[];
  description: string;
}
