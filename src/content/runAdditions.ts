import type { InnDecisionDef, RunPassiveDef, RunPassiveId } from './types';

export const RUN_PASSIVES: readonly RunPassiveDef[] = [
  {
    id: 'passive.vanguard_heart',
    name: 'Vanguard Heart',
    description: 'Increase max HP for the run and recover a small amount after each victory.',
    effectLabel: '+10% max HP, heal 5% post-win',
    draftStageInterval: 3,
  },
  {
    id: 'passive.arc_flux',
    name: 'Arc Flux',
    description: 'Increase combat tempo through slightly faster CT gains.',
    effectLabel: '+8% CT gain',
    draftStageInterval: 3,
  },
  {
    id: 'passive.greedy_ledger',
    name: 'Greedy Ledger',
    description: 'Improves vault pressure value in long runs (future score/economy hook).',
    effectLabel: '+vault pressure conversion',
    draftStageInterval: 3,
  },
];

export const RUN_PASSIVE_BY_ID: ReadonlyMap<RunPassiveId, RunPassiveDef> = new Map(
  RUN_PASSIVES.map((passive) => [passive.id, passive]),
);

export const INN_DECISIONS: readonly InnDecisionDef[] = [
  {
    id: 'inn.recover',
    name: 'Recover',
    description: 'Restore a portion of HP before next combat.',
    effectLabel: 'Heal 25% HP',
  },
  {
    id: 'inn.cleanse',
    name: 'Cleanse',
    description: 'Remove one negative status at the next battle start.',
    effectLabel: 'Cleanse 1 debuff',
  },
  {
    id: 'inn.focus',
    name: 'Focus Drill',
    description: 'Grant a temporary battle opener buff for the next stage.',
    effectLabel: '+opening CT',
  },
];
