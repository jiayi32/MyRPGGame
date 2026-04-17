// Combat Engine core logic (CT-based, single player focus)
// Handles turn order, skill resolution, and battle state

import { CTQueue, CTEntity } from './ctSystem';
import { Skill, SKILLS } from '../content/skills';

export interface Combatant extends CTEntity {
  name: string;
  hp: number;
  maxHp: number;
  skills: string[]; // Skill IDs
  isPlayer: boolean;
}

export interface CombatState {
  queue: CTQueue;
  combatants: Combatant[];
  turn: number;
  log: string[];
  finished: boolean;
}

export class CombatEngine {
  state: CombatState;

  constructor(combatants: Combatant[]) {
    this.state = {
      queue: new CTQueue(combatants),
      combatants,
      turn: 1,
      log: [],
      finished: false,
    };
  }

  getCurrentCombatant(): Combatant | undefined {
    return this.state.queue.nextReady() as Combatant;
  }

  performSkill(userId: string, skillId: string, targetId: string) {
    const user = this.state.combatants.find(c => c.id === userId);
    const target = this.state.combatants.find(c => c.id === targetId);
    const skill = SKILLS.find(s => s.id === skillId);
    if (!user || !target || !skill) return;
    // Example: simple damage logic
    if (skill.target === 'enemy') {
      target.hp = Math.max(0, target.hp - skill.ctCost); // Use ctCost as damage for now
      this.state.log.push(`${user.name} uses ${skill.name} on ${target.name} for ${skill.ctCost} damage.`);
    }
    // Advance CT for user
    this.state.queue.setCT(user.id, user.maxCt);
    this.state.turn++;
    // Check for battle end
    if (this.state.combatants.filter(c => c.isPlayer && c.hp > 0).length === 0 ||
        this.state.combatants.filter(c => !c.isPlayer && c.hp > 0).length === 0) {
      this.state.finished = true;
      this.state.log.push('Battle finished.');
    }
  }

  advance(time: number) {
    this.state.queue.advance(time);
  }

  getLog() {
    return this.state.log;
  }
}
