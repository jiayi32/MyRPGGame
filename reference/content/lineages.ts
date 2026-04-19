// Lineage definitions for the RPG game
// This file will contain the static data for all 12 lineages and their properties.

export interface Lineage {
  id: string;
  name: string;
  description: string;
  adjacency: string[]; // IDs of adjacent lineages for evolution
  bonuses: string[];
}

export const LINEAGES: Lineage[] = [
  // Example lineage
  // { id: 'warrior', name: 'Warrior', description: '...', adjacency: ['paladin', 'berserker'], bonuses: ['+HP', '+Defense'] },
];
