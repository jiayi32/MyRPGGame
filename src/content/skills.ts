import type { Skill, SkillId } from './types';
import { DRAKEHORN_SKILLS } from './skills/drakehornForge';
import { BULL_CATHEDRAL_SKILLS } from './skills/bullCathedral';
import { BOSS_SKILLS } from './skills/bosses';
import { ENEMY_SKILLS } from './skills/enemies';
import { ITEM_SKILLS } from './skills/items';
import { CT_MANIPULATION_SKILLS } from './skills/ctManipulation';

export const SKILLS: readonly Skill[] = [...DRAKEHORN_SKILLS, ...BULL_CATHEDRAL_SKILLS, ...BOSS_SKILLS, ...ENEMY_SKILLS, ...ITEM_SKILLS, ...CT_MANIPULATION_SKILLS];

export const SKILL_BY_ID: ReadonlyMap<SkillId, Skill> = new Map(SKILLS.map((s) => [s.id, s]));
