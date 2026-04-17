// Skill definitions for the RPG game
// This file will contain the static data for all skills, their CT cost, cooldown, resource, target, and resolution profile.

export interface Skill {
  id: string;
  name: string;
  ctCost: number;
  cooldown: number;
  resource: string;
  target: 'enemy' | 'ally' | 'self' | 'all';
  description: string;
}

export const SKILLS: Skill[] = [
  // Example skill
  // { id: 'slash', name: 'Slash', ctCost: 100, cooldown: 0, resource: 'none', target: 'enemy', description: 'Deal physical damage.' },
];
