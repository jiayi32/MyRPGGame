// Class definitions for the RPG game
// This file will contain the static data for all 60 classes, their tiers, and properties.

export interface RPGClass {
  id: string;
  name: string;
  lineageId: string;
  tier: number;
  description: string;
  skills: string[];
}

export const CLASSES: RPGClass[] = [
  // Example class
  // { id: 'warrior_t1', name: 'Warrior', lineageId: 'warrior', tier: 1, description: '...', skills: ['slash', 'guard'] },
];
