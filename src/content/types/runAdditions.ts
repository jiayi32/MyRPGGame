import type { RunPassiveId } from './ids';

export interface RunPassiveDef {
  id: RunPassiveId;
  name: string;
  description: string;
  effectLabel: string;
  draftStageInterval: number;
}

export interface InnDecisionDef {
  id: string;
  name: string;
  description: string;
  effectLabel: string;
}
