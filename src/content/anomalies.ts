import type { AnomalyCategory, AnomalyCategoryKind, AnomalyId } from './types';

const sharedTrigger = {
  chargeThreshold: 5,
  chargeSources: [
    { event: 'elite_win', delta: 1 },
    { event: 'miniboss_defeat', delta: 2 },
    { event: 'low_hp_survival', delta: 1 },
  ],
} as const;

const anomalies: readonly AnomalyCategory[] = [
  {
    id: 'anomaly.class_infusion',
    kind: 'class_infusion',
    name: 'Class Infusion Event',
    description: 'A new class drop is forced on the player as a required choice.',
    trigger: { ...sharedTrigger, chargeSources: [...sharedTrigger.chargeSources] },
  },
  {
    id: 'anomaly.gear_mutation',
    kind: 'gear_mutation',
    name: 'Gear Mutation Event',
    description: 'An equipped item evolves mid-run, transforming its passive or tradeoffs.',
    trigger: { ...sharedTrigger, chargeSources: [...sharedTrigger.chargeSources] },
  },
  {
    id: 'anomaly.lineage_shift',
    kind: 'lineage_shift',
    name: 'Lineage Shift Event',
    description: 'Partial lineage transformation — borrows adjacent-lineage traits for the run.',
    trigger: { ...sharedTrigger, chargeSources: [...sharedTrigger.chargeSources] },
  },
  {
    id: 'anomaly.rule_break',
    kind: 'rule_break',
    name: 'Rule Break Event',
    description:
      'CT queue behaves differently for a bounded window (interval reversal, double-tick, etc.).',
    trigger: { ...sharedTrigger, chargeSources: [...sharedTrigger.chargeSources] },
  },
];

export const ANOMALY_CATEGORIES: readonly AnomalyCategory[] = anomalies;

export const ANOMALY_BY_ID: ReadonlyMap<AnomalyId, AnomalyCategory> = new Map(
  ANOMALY_CATEGORIES.map((a) => [a.id, a]),
);

export const ANOMALY_BY_KIND: ReadonlyMap<AnomalyCategoryKind, AnomalyCategory> = new Map(
  ANOMALY_CATEGORIES.map((a) => [a.kind, a]),
);
