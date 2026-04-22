import type { Encounter, EncounterId } from './types';

/**
 * Procedural encounter templates for Drakehorn Forge stages 1-4, 6-9, 11-29.
 * Stage 5 (mini-boss), 10 (gate boss), and 30 (counter boss) use dedicated boss encounters.
 * Enemy count and HP scale with stage number.
 *
 * NOTE: Enemy compositions are handled by RunDirector (Phase 2).
 * This module defines encounter metadata only.
 */

const procEncounterStages1to4: Encounter = {
  id: 'encounter.proc_stages_1_4',
  name: 'Procedural Stages 1-4',
  description: 'Early-game encounters: 2-3 weak fire mobs',
  stageMin: 1,
  stageMax: 4,
};

const procEncounterStages6to9: Encounter = {
  id: 'encounter.proc_stages_6_9',
  name: 'Procedural Stages 6-9',
  description: 'Mid-game encounters: 2-4 moderate fire enemies',
  stageMin: 6,
  stageMax: 9,
};

const procEncounterStages11to29: Encounter = {
  id: 'encounter.proc_stages_11_29',
  name: 'Procedural Stages 11-29',
  description: 'Late-game encounters: 3-5 strong fire enemies',
  stageMin: 11,
  stageMax: 29,
};

export const ENCOUNTERS: readonly Encounter[] = [
  procEncounterStages1to4,
  procEncounterStages6to9,
  procEncounterStages11to29,
];

export const ENCOUNTER_BY_ID: ReadonlyMap<EncounterId, Encounter> = new Map(
  ENCOUNTERS.map((e) => [e.id, e]),
);
