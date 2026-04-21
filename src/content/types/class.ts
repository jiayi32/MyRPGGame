import type { UnspecifiedOr } from './sentinel';
import type { ClassId, LineageId, SkillId } from './ids';

export type ClassRole = 'DPS' | 'Tank' | 'Support' | 'Control' | 'Hybrid';

export type CombatArchetype =
  | 'burst_dps'
  | 'sustain_dps'
  | 'tank'
  | 'support'
  | 'trickster';

export type CtProfile = 'Fast' | 'Medium-Fast' | 'Medium' | 'Medium-Slow' | 'Slow';

export type PrimaryResource = 'HP' | 'MP' | 'None';

export interface ClassPassive {
  rank: number;
  name: string;
  description: string;
  magnitude: UnspecifiedOr<number>;
  magnitudeUnit?: 'flat' | 'percent' | 'multiplier' | 'seconds' | 'max_hp_percent';
  statTag?: string;
}

export type ClassTier = 1 | 2 | 3 | 4 | 5;

export interface ClassData {
  id: ClassId;
  name: string;
  lineageId: LineageId;
  tier: ClassTier;
  role: ClassRole;
  combatArchetype: CombatArchetype;
  ctProfile: CtProfile;
  ctRange: UnspecifiedOr<{ min: number; max: number }>;
  primaryResource: PrimaryResource;
  basicAttackSkillId: UnspecifiedOr<SkillId>;
  skillIds: SkillId[];
  passives: ClassPassive[];
  evolutionTargetClassIds: ClassId[];
  description: string;
  gearSynergy: string;
  coreLoop?: string;
  damageIdentity?: string;
  survivalIdentity?: string;
  isStub?: boolean;
}
