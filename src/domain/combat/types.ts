import type {
  ClassId,
  DamageType,
  EnemyArchetypeId,
  MagnitudeUnit,
  SkillId,
} from '../../content/types';

export type Team = 'player' | 'enemy';

export type InstanceId = string & { readonly __brand: 'InstanceId' };

export const toInstanceId = (raw: string): InstanceId => raw as InstanceId;

export interface ResolvedStats {
  readonly strength: number;
  readonly intellect: number;
  readonly agility: number;
  readonly stamina: number;
  readonly defense: number;
  readonly magicDefense: number;
  readonly speed: number;
  readonly critChance: number;
  readonly critMultiplier: number;
  readonly ctReductionPct: number;
  readonly resistances: Readonly<Partial<Record<DamageType, number>>>;
}

export type StatusKind =
  | 'dot'
  | 'hot'
  | 'buff'
  | 'debuff'
  | 'shield'
  | 'stun'
  | 'counter';

export interface StatusSnapshot {
  readonly magnitude: number;
  readonly magnitudeUnit: MagnitudeUnit;
  readonly sourceStrength: number;
  readonly sourceIntellect: number;
  readonly sourceAgility: number;
  readonly damageType?: DamageType;
  readonly statTag?: string;
}

export interface StatusInstance {
  readonly id: InstanceId;
  readonly kind: StatusKind;
  readonly sourceUnitId: InstanceId;
  readonly skillId: SkillId;
  readonly snapshot: StatusSnapshot;
  readonly remainingSec: number;
  readonly stacks: number;
  readonly tickIntervalSec: number;
  readonly secSinceLastTick: number;
  readonly tags: readonly string[];
}

export interface Unit {
  readonly id: InstanceId;
  readonly team: Team;
  readonly classId?: ClassId;
  readonly archetypeId?: EnemyArchetypeId;
  readonly displayName: string;
  readonly hp: number;
  readonly hpMax: number;
  readonly mp: number;
  readonly mpMax: number;
  readonly ct: number;
  readonly baseStats: ResolvedStats;
  readonly skillIds: readonly SkillId[];
  readonly basicAttackSkillId?: SkillId;
  readonly cooldowns: Readonly<Record<SkillId, number>>;
  readonly statuses: readonly StatusInstance[];
  readonly insertionIndex: number;
  readonly isDead: boolean;
}

export type BattleResult = 'ongoing' | 'won' | 'lost' | 'draw';

export interface BattleState {
  readonly seed: number;
  readonly rngCursor: number;
  readonly tick: number;
  readonly elapsedSec: number;
  readonly units: Readonly<Record<InstanceId, Unit>>;
  readonly turnOrder: readonly InstanceId[];
  readonly log: readonly BattleEvent[];
  readonly result: BattleResult;
}

export type Action =
  | {
      readonly kind: 'cast_skill';
      readonly unitId: InstanceId;
      readonly skillId: SkillId;
      readonly targetIds: readonly InstanceId[];
    }
  | {
      readonly kind: 'basic_attack';
      readonly unitId: InstanceId;
      readonly targetId: InstanceId;
    }
  | { readonly kind: 'wait'; readonly unitId: InstanceId };

export type StepError =
  | 'not_ready'
  | 'unit_dead'
  | 'unit_stunned'
  | 'skill_not_owned'
  | 'skill_on_cooldown'
  | 'insufficient_resource'
  | 'invalid_target'
  | 'battle_ended';

export type StepResult =
  | { readonly ok: true; readonly state: BattleState }
  | {
      readonly ok: false;
      readonly reason: StepError;
      readonly state: BattleState;
    };

export type BattleEvent =
  | {
      readonly tick: number;
      readonly type: 'battle_started';
      readonly seed: number;
    }
  | {
      readonly tick: number;
      readonly type: 'skill_cast';
      readonly unitId: InstanceId;
      readonly skillId: SkillId;
      readonly targetIds: readonly InstanceId[];
      readonly hitTier: HitTier;
      readonly severity: number;
    }
  | {
      readonly tick: number;
      readonly type: 'damage';
      readonly sourceUnitId: InstanceId;
      readonly targetUnitId: InstanceId;
      readonly amount: number;
      readonly damageType: DamageType;
      readonly hitTier: HitTier;
    }
  | {
      readonly tick: number;
      readonly type: 'heal';
      readonly sourceUnitId: InstanceId;
      readonly targetUnitId: InstanceId;
      readonly amount: number;
    }
  | {
      readonly tick: number;
      readonly type: 'status_applied';
      readonly sourceUnitId: InstanceId;
      readonly targetUnitId: InstanceId;
      readonly statusKind: StatusKind;
      readonly skillId: SkillId;
      readonly remainingSec: number;
      readonly stacks: number;
    }
  | {
      readonly tick: number;
      readonly type: 'status_expired';
      readonly targetUnitId: InstanceId;
      readonly statusKind: StatusKind;
      readonly skillId: SkillId;
    }
  | {
      readonly tick: number;
      readonly type: 'status_tick';
      readonly targetUnitId: InstanceId;
      readonly statusKind: StatusKind;
      readonly amount: number;
    }
  | {
      readonly tick: number;
      readonly type: 'ct_shift';
      readonly targetUnitId: InstanceId;
      readonly delta: number;
    }
  | {
      readonly tick: number;
      readonly type: 'unit_died';
      readonly unitId: InstanceId;
    }
  | {
      readonly tick: number;
      readonly type: 'unit_spawned';
      readonly unitId: InstanceId;
      readonly displayName: string;
    }
  | {
      readonly tick: number;
      readonly type: 'effect_stub';
      readonly kind: string;
      readonly skillId: SkillId;
    }
  | {
      readonly tick: number;
      readonly type: 'battle_ended';
      readonly result: BattleResult;
    };

export type HitTier = 'fail' | 'normal' | 'strong' | 'critical';
