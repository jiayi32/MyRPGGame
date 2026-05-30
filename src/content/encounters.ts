import type { Encounter, EncounterCompositionTemplate, EncounterId } from './types';

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

const compositionTemplates: readonly EncounterCompositionTemplate[] = [
  {
    id: 'encounter.template.opening_skirmish',
    stageMin: 1,
    stageMax: 4,
    tags: ['opening', 'tempo'],
    entries: [
      { archetypeId: 'dps_race', count: 2 },
      { archetypeId: 'speed_pressure', count: 1 },
    ],
  },
  {
    id: 'encounter.template.opening_pressure',
    stageMin: 1,
    stageMax: 4,
    tags: ['opening', 'attrition'],
    entries: [
      { archetypeId: 'dps_race', count: 1 },
      { archetypeId: 'sustain_denial', count: 1 },
    ],
  },
  {
    id: 'encounter.template.opening_wall',
    stageMin: 1,
    stageMax: 4,
    tags: ['opening', 'defense_check'],
    entries: [
      { archetypeId: 'speed_pressure', count: 1 },
      { archetypeId: 'stat_wall', count: 1 },
    ],
  },
  {
    id: 'encounter.template.mid_attrition',
    stageMin: 6,
    stageMax: 9,
    tags: ['midgame', 'attrition'],
    entries: [
      { archetypeId: 'dps_race', count: 2 },
      { archetypeId: 'sustain_denial', count: 1 },
    ],
  },
  {
    id: 'encounter.template.mid_tempo_spike',
    stageMin: 6,
    stageMax: 9,
    tags: ['midgame', 'tempo'],
    entries: [
      { archetypeId: 'speed_pressure', count: 2 },
      { archetypeId: 'ct_manipulator', count: 1 },
    ],
  },
  {
    id: 'encounter.template.mid_mixed_front',
    stageMin: 6,
    stageMax: 9,
    tags: ['midgame', 'mixed'],
    entries: [
      { archetypeId: 'stat_wall', count: 1 },
      { archetypeId: 'dps_race', count: 1 },
      { archetypeId: 'sustain_denial', count: 1 },
    ],
  },
  {
    id: 'encounter.template.late_swarm_control',
    stageMin: 11,
    stageMax: 29,
    tags: ['lategame', 'swarm', 'control'],
    entries: [
      { archetypeId: 'ct_manipulator', count: 1 },
      { archetypeId: 'summoner', count: 1 },
      { archetypeId: 'dps_race', count: 2 },
    ],
  },
  {
    id: 'encounter.template.late_shield_break',
    stageMin: 11,
    stageMax: 29,
    tags: ['lategame', 'tempo', 'counterplay'],
    entries: [
      { archetypeId: 'nullshield', count: 1 },
      { archetypeId: 'speed_pressure', count: 2 },
      { archetypeId: 'sustain_denial', count: 1 },
    ],
  },
  {
    id: 'encounter.template.late_chaos_engine',
    stageMin: 11,
    stageMax: 29,
    tags: ['lategame', 'burst', 'chaos'],
    entries: [
      { archetypeId: 'chaos_dps', count: 2 },
      { archetypeId: 'engineer', count: 1 },
      { archetypeId: 'dps_race', count: 1 },
    ],
  },
];

export const ENCOUNTERS: readonly Encounter[] = [
  procEncounterStages1to4,
  procEncounterStages6to9,
  procEncounterStages11to29,
];

export const ENCOUNTER_BY_ID: ReadonlyMap<EncounterId, Encounter> = new Map(
  ENCOUNTERS.map((e) => [e.id, e]),
);

export const ENCOUNTER_COMPOSITION_TEMPLATES: readonly EncounterCompositionTemplate[] =
  compositionTemplates;

export const ENCOUNTER_COMPOSITION_TEMPLATE_BY_ID: ReadonlyMap<string, EncounterCompositionTemplate> =
  new Map(ENCOUNTER_COMPOSITION_TEMPLATES.map((template) => [template.id, template]));
