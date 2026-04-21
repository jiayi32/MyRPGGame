import type { EncounterId } from './ids';

export interface RunDirectorWeights {
  normal: number;
  elite: number;
  miniBoss: number;
  pressure: number;
  anomaly: number;
}

export const DEFAULT_RUN_DIRECTOR_WEIGHTS: RunDirectorWeights = {
  normal: 0.45,
  elite: 0.25,
  miniBoss: 0.15,
  pressure: 0.1,
  anomaly: 0.05,
};

export interface Encounter {
  id: EncounterId;
  name: string;
  stageMin: number;
  stageMax: number;
  description: string;
}
