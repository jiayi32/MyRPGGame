// Gear definitions for the RPG game
// This file will contain the static data for all gear, including tier, set, and synergy information.

export interface Gear {
  id: string;
  name: string;
  tier: number;
  lineageId?: string;
  type: 'weapon' | 'armor' | 'passive';
  description: string;
  synergyHook?: string;
}

export const GEAR: Gear[] = [
  // Example gear
  // { id: 'warrior_sword', name: 'Warrior Sword', tier: 5, lineageId: 'warrior', type: 'weapon', description: 'Build-defining sword.', synergyHook: 'berserk' },
];
