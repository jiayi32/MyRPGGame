/**
 * CampaignUnitBuilder.ts — Single source of truth for Avatar → QueueUnit.
 *
 * Every path that needs a combat-ready representation of an avatar (real battle
 * construction in CampaignContext, stat previews in CampaignHub / QuestPrep,
 * future gear UI delta display) must go through `buildAvatarQueueUnit`. This
 * guarantees gear, stats, CT reduction, and derived pools (HP/MP/CT) stay
 * consistent everywhere.
 *
 * Pure function — no I/O, no mutation of the avatar.
 */

import type { CampaignAvatar, QueueUnit, StatBlock } from './CampaignTypes';
import { resolveEquippedItems } from './GearDefinitions';
import { resolveGearStats, calculateGearCtReduction } from './GearMath';

/** Derive max HP from a resolved stat block. */
export function deriveMaxHp(stats: StatBlock): number {
  return stats.health * 5 + 50;
}

/** Derive max mana from a resolved stat block. */
export function deriveMaxMana(stats: StatBlock): number {
  return stats.mana * 3 + 20;
}

/** Derive initial CT from a resolved stat block (faster units act sooner). */
export function deriveInitialCt(stats: StatBlock): number {
  return Math.max(1, 100 - stats.speed);
}

/**
 * Build a QueueUnit from a CampaignAvatar, resolving equipped gear into the
 * final stat layer. This is the ONLY function that should construct a
 * player-side QueueUnit from persisted avatar state.
 */
export function buildAvatarQueueUnit(avatar: CampaignAvatar): QueueUnit {
  const equipped = resolveEquippedItems(avatar.equippedGear);
  const stats = resolveGearStats(avatar.stats, equipped);
  const gearCtReduction = calculateGearCtReduction(equipped);
  const maxHp = deriveMaxHp(stats);
  const maxMana = deriveMaxMana(stats);

  return {
    unitId: avatar.userId,
    unitType: 'player',
    name: avatar.primaryClassId.charAt(0).toUpperCase() + avatar.primaryClassId.slice(1),
    ct: deriveInitialCt(stats),
    currentStats: stats,
    maxHp,
    maxMana,
    hp: maxHp,
    mana: maxMana,
    shield: 0,
    isKO: false,
    statusEffects: [],
    cooldowns: {},
    skillIds: [
      avatar.equippedLoadout.basicAttackSkillId,
      ...avatar.equippedLoadout.activeSkillIds,
    ],
    classId: avatar.primaryClassId,
    isAutoBattle: true,
    passiveIds: avatar.equippedLoadout.passiveSkillIds,
    companionCharacterId: avatar.companionCharacterId,
    gearCtReduction: gearCtReduction > 0 ? gearCtReduction : undefined,
  };
}

/**
 * Resolve an avatar's effective (gear-applied) stats without building a full
 * QueueUnit. Useful for stat panels and loadout/gear preview UIs.
 */
export function resolveAvatarStats(avatar: CampaignAvatar): StatBlock {
  const equipped = resolveEquippedItems(avatar.equippedGear);
  return resolveGearStats(avatar.stats, equipped);
}
