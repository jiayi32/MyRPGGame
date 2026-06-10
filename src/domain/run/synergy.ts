import type { SkillId, SynergyTag } from '../../content/types';
import {
  CLASS_BY_ID,
  GEAR_TEMPLATES_BY_ID,
  isSpecified,
  SKILL_BY_ID,
  RUN_PASSIVE_BY_ID,
  resolveTags,
} from '../../content';
import {
  SYNERGY_BONUS_BY_TAG,
  SYNERGY_THRESHOLD,
  resolveTraitTiers,
  type ActiveTrait,
} from '../../content/types/synergy';

// Re-export for consumers
export type { ActiveTrait };

/** @deprecated Use ActiveTrait instead. */
export interface ActiveSynergy {
  tag: SynergyTag;
  count: number;
  label: string;
  description: string;
}

/**
 * Collect all synergy tags from the player's current build:
 * class skills, drafted skills, equipped gear, and active run passives.
 */
export const collectSynergyTags = (
  activeClassId: string,
  draftedSkillIds: readonly SkillId[],
  equippedGearTemplateIds: readonly string[],
  runPassiveIds: readonly string[],
): readonly SynergyTag[] => {
  const tags: SynergyTag[] = [];

  // Class skills (including basic attack)
  const classData = CLASS_BY_ID.get(activeClassId);
  if (classData !== undefined) {
    const allClassSkillIds = [
      ...classData.skillIds,
      ...(isSpecified(classData.basicAttackSkillId) && typeof classData.basicAttackSkillId === 'string'
        ? [classData.basicAttackSkillId]
        : []),
    ];
    for (const skillId of allClassSkillIds) {
      const skill = SKILL_BY_ID.get(skillId);
      if (skill !== undefined) {
        tags.push(...resolveTags(skill.effects[0]?.damageType, skill.name));
      }
    }
  }

  // Drafted skills
  for (const skillId of draftedSkillIds) {
    const skill = SKILL_BY_ID.get(skillId);
    if (skill !== undefined) {
      tags.push(...resolveTags(skill.effects[0]?.damageType, skill.name));
    }
  }

  // Equipped gear
  for (const templateId of equippedGearTemplateIds) {
    const template = GEAR_TEMPLATES_BY_ID.get(templateId);
    if (template !== undefined) {
      // Use description for keyword matching (richer than ID dot-notation)
      tags.push(...resolveTags(undefined, `${template.id} ${template.description}`));
    }
  }

  // Run passives — explicit tags take precedence over name keyword matching
  for (const passiveId of runPassiveIds) {
    const passive = RUN_PASSIVE_BY_ID.get(passiveId);
    if (passive !== undefined) {
      tags.push(...resolveTags(undefined, passive.name, passive.tags));
    }
  }

  return tags;
};

/**
 * Resolve which synergy bonuses are active given a collection of tags.
 * A bonus activates when tag count ≥ SYNERGY_THRESHOLD (3).
 */
export const resolveSynergyBonuses = (
  tags: readonly SynergyTag[],
): readonly ActiveSynergy[] => {
  const counts = new Map<SynergyTag, number>();
  for (const tag of tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const active: ActiveSynergy[] = [];
  for (const [tag, count] of counts) {
    if (count >= SYNERGY_THRESHOLD) {
      const def = SYNERGY_BONUS_BY_TAG.get(tag);
      active.push({
        tag,
        count,
        label: def?.label ?? `${tag} Synergy`,
        description: def?.description ?? '',
      });
    }
  }

  return active;
};

/**
 * Count passives by their explicit element tags and resolve active trait tiers.
 * Only passives with explicit `tags` contribute. Wildcards (no tags) are excluded.
 * Uses the TFT-style 2/4/6 threshold model from TRAITS definitions.
 */
export const resolveTraitsFromPassives = (
  passiveIds: readonly string[],
): readonly ActiveTrait[] => {
  const counts = new Map<SynergyTag, number>();
  for (const pid of passiveIds) {
    const passive = RUN_PASSIVE_BY_ID.get(pid);
    if (passive?.tags) {
      for (const tag of passive.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }
  return resolveTraitTiers(counts);
};
