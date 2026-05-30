import type { SkillId } from '../../content/types';
import {
  CLASS_BY_ID,
  isSpecified,
  SKILL_BY_ID,
  SKILLS,
  resolveTags,
} from '../../content';
import { collectSynergyTags } from './synergy';
import type { SynergyTag } from '../../content/types/synergy';

export interface SkillDraftOption {
  skillId: SkillId;
  name: string;
  description: string;
  slotType: 'lineage' | 'synergy' | 'wildcard';
}

function hash(seed: number, salt: number): number {
  let x = (Math.trunc(Math.abs(seed)) >>> 0) ^ Math.imul(salt | 0, 0x45d9f3b);
  x ^= x >>> 16;
  x = Math.imul(x, 0x45d9f3b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

function pickOne<T>(items: readonly T[], seed: number, salt: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[hash(seed, salt) % items.length];
}

/**
 * Build a 3-option draft pool for a player at a given stage.
 * Deterministic: same seed + stage + class always produces the same pool.
 */
export const buildDraftPool = (
  seed: number,
  stage: number,
  activeClassId: string,
  equippedGearTemplateIds: readonly string[],
  runPassiveIds: readonly string[],
  draftedSkillIds: readonly SkillId[],
): readonly SkillDraftOption[] => {
  const options: SkillDraftOption[] = [];
  const alreadyOwned = new Set<SkillId>(draftedSkillIds);

  // Include class skills in the "already owned" set
  const classData = CLASS_BY_ID.get(activeClassId);
  if (classData !== undefined) {
    for (const sid of classData.skillIds) alreadyOwned.add(sid);
    if (isSpecified(classData.basicAttackSkillId) && typeof classData.basicAttackSkillId === 'string') {
      alreadyOwned.add(classData.basicAttackSkillId);
    }
  }

  const allSkills = SKILLS.filter(
    (s) =>
      !alreadyOwned.has(s.id) &&
      !s.id.startsWith('enemy.') &&
      !s.id.startsWith('boss.'),
  );

  // Determine lineage prefix from the active class
  const lineageId = classData?.lineageId ?? '';
  const lineagePrefix = lineageId.length > 0 ? `${lineageId}.` : '';

  // Get current synergy tags for synergy-weighted selection
  const currentTags = collectSynergyTags(
    activeClassId,
    draftedSkillIds,
    equippedGearTemplateIds,
    runPassiveIds,
  );

  // ---- Lineage option ----
  const lineageSkills = lineagePrefix.length > 0
    ? allSkills.filter((s) => s.id.startsWith(lineagePrefix))
    : allSkills;
  const lineagePick = pickOne(lineageSkills, seed, stage * 31 + 1);
  if (lineagePick !== undefined) {
    options.push({
      skillId: lineagePick.id,
      name: lineagePick.name,
      description: lineagePick.description,
      slotType: 'lineage',
    });
  }

  // ---- Synergy option ----
  const synergyTagSet = new Set<SynergyTag>(currentTags as SynergyTag[]);
  const synergySkills = allSkills.filter((s) => {
    if (synergyTagSet.size === 0) return false;
    const skillTags = resolveTags(s.effects[0]?.damageType, s.name) as SynergyTag[];
    return skillTags.some((tag) => synergyTagSet.has(tag));
  });
  // Fall back to lineage skills if no synergy match
  const synergyPool = synergySkills.length > 0 ? synergySkills : lineageSkills;
  const synergyPick = pickOne(synergyPool, seed, stage * 31 + 2);
  if (synergyPick !== undefined) {
    options.push({
      skillId: synergyPick.id,
      name: synergyPick.name,
      description: synergyPick.description,
      slotType: synergySkills.length > 0 ? 'synergy' : 'lineage',
    });
  }

  // ---- Wildcard option ----
  const wildcardSkills = allSkills.filter(
    (s) => lineagePrefix.length === 0 || !s.id.startsWith(lineagePrefix),
  );
  // Fall back to any skill if no wildcard available
  const wildcardPool = wildcardSkills.length > 0 ? wildcardSkills : allSkills;
  const wildcardPick = pickOne(wildcardPool, seed, stage * 31 + 3);
  if (wildcardPick !== undefined) {
    options.push({
      skillId: wildcardPick.id,
      name: wildcardPick.name,
      description: wildcardPick.description,
      slotType: 'wildcard',
    });
  }

  // Deduplicate by skillId (rare edge case where lineage=wildcard for single-lineage)
  const seen = new Set<string>();
  return options.filter((opt) => {
    if (seen.has(opt.skillId)) return false;
    seen.add(opt.skillId);
    return true;
  });
};
