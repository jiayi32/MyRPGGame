import type { AnomalyId } from './ids';

export type AnomalyCategoryKind =
  | 'class_infusion'
  | 'gear_mutation'
  | 'lineage_shift'
  | 'rule_break';

export interface AnomalyTrigger {
  chargeThreshold: number;
  chargeSources: { event: string; delta: number }[];
}

export interface AnomalyCategory {
  id: AnomalyId;
  kind: AnomalyCategoryKind;
  name: string;
  description: string;
  trigger: AnomalyTrigger;
}
