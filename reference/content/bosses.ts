// Boss definitions for the RPG game
// This file will contain the static data for all bosses, their mechanics, and encounter types.

export interface Boss {
  id: string;
  name: string;
  description: string;
  mechanics: string[];
  type: 'mini-boss' | 'boss' | 'counter-boss';
}

export const BOSSES: Boss[] = [
  // Example boss
  // { id: 'golem', name: 'Stone Golem', description: 'A massive stone guardian.', mechanics: ['stun', 'defense up'], type: 'boss' },
];
