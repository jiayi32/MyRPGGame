import type { UnspecifiedOr } from './sentinel';
import type { BossId, LineageId, SkillId } from './ids';

export type BossType = 'mini' | 'standard' | 'counter';

export interface BossPhase {
  hpThreshold: UnspecifiedOr<number>;
  description: string;
  mechanicChanges: string[];
}

export interface BossMechanic {
  name: string;
  description: string;
  magnitude: UnspecifiedOr<number>;
  magnitudeUnit?: 'flat' | 'percent' | 'seconds';
}

export interface BossDef {
  id: BossId;
  name: string;
  bossType: BossType;
  stage: 5 | 10 | 30;
  lineageCounter?: LineageId;
  hp: UnspecifiedOr<number>;
  atk: UnspecifiedOr<number>;
  def: UnspecifiedOr<number>;
  /** Boss combat ability set. Empty → boss falls back to the synthetic basic attack only. */
  skillIds?: SkillId[];
  basicAttackSkillId?: UnspecifiedOr<SkillId>;
  /** Speed override; defaults to 80 (faster than tier-4 enemies, slower than late-tier players). */
  speed?: number;
  phases: BossPhase[];
  mechanics: BossMechanic[];
  description: string;
  isStub?: boolean;
}
