import type { Encounter, EncounterId } from './types';

export const ENCOUNTERS: readonly Encounter[] = [];

export const ENCOUNTER_BY_ID: ReadonlyMap<EncounterId, Encounter> = new Map(
  ENCOUNTERS.map((e) => [e.id, e]),
);
