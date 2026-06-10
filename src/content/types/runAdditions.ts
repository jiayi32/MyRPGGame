import type { RunPassiveId } from './ids';
import type { SynergyTag } from './synergy';

export interface RunPassiveDef {
  id: RunPassiveId;
  name: string;
  description: string;
  effectLabel: string;
  draftStageInterval: number;
  /** Explicit synergy tags — takes precedence over keyword auto-derivation. */
  tags?: readonly SynergyTag[];
}

export interface InnDecisionDef {
  id: string;
  name: string;
  description: string;
  effectLabel: string;
}
