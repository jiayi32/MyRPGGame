/**
 * GearDefinitions.ts — Static catalog of equipment.
 *
 * Gear is defined in code (not Firestore), matching how classes and skills are
 * defined in CampaignDefinitions.ts. Avatars only persist IDs, keeping Firestore
 * docs small and letting balance changes ship as app updates.
 *
 * Adding a new item:
 *   1. Add the Equipment literal to `GEAR_DEFINITIONS`.
 *   2. If it has an active ability, the referenced skill ID must exist in
 *      GearAbilityDefinitions.ts (Phase 4). Until then, leave `activeAbilitySkillId`
 *      unset.
 *
 * @see documentation/future/COMBATSYSTEM.md §8
 */

import type { Equipment, EquippedGear } from './CampaignTypes';

// ═══════════════════════════════════════════════════════════════════════
// Starter catalog
// ═══════════════════════════════════════════════════════════════════════

const GEAR_DEFINITIONS: readonly Equipment[] = [
  // ── Weapons ─────────────────────────────────────────────────────────
  {
    id: 'iron_sword',
    slot: 'weapon',
    name: 'Iron Sword',
    description: 'A reliable blade. +4 STR.',
    rank: 1,
    flatStatBonuses: { strength: 4 },
  },
  {
    id: 'runed_longblade',
    slot: 'weapon',
    name: 'Runed Longblade',
    description: '+6 STR, +10% STR scaling.',
    rank: 3,
    flatStatBonuses: { strength: 6 },
    multiplicativeBonuses: { strength: 1.10 },
    activeAbilitySkillId: 'runed_longblade_smite',
  },

  // ── Armour ──────────────────────────────────────────────────────────
  {
    id: 'leather_hauberk',
    slot: 'armour',
    name: 'Leather Hauberk',
    description: '+3 DEF, +2 HP.',
    rank: 1,
    flatStatBonuses: { defense: 3, health: 2 },
  },
  {
    id: 'stalkers_cloak',
    slot: 'armour',
    name: "Stalker's Cloak",
    description: '+2 DEF, +3 SPD. Lighten your footing by 5%.',
    rank: 2,
    flatStatBonuses: { defense: 2, speed: 3 },
    ctReductionPercent: 0.05,
  },

  // ── Accessories ─────────────────────────────────────────────────────
  {
    id: 'focus_charm',
    slot: 'accessory',
    name: 'Focus Charm',
    description: '+4 PRC, +5% CDR.',
    rank: 1,
    flatStatBonuses: { precision: 4, cdr: 5 },
  },
  {
    id: 'quickstep_ring',
    slot: 'accessory',
    name: 'Quickstep Ring',
    description: '+5% SPD. Lighten your footing by another 5%.',
    rank: 2,
    multiplicativeBonuses: { speed: 1.05 },
    ctReductionPercent: 0.05,
    activeAbilitySkillId: 'quickstep_ring_dash',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Registry & lookup
// ═══════════════════════════════════════════════════════════════════════

/** Fast lookup by equipment ID. Built once at module load. */
const GEAR_REGISTRY: Readonly<Record<string, Equipment>> = Object.freeze(
  Object.fromEntries(GEAR_DEFINITIONS.map(item => [item.id, item])),
);

/** Return every item in the catalog. Ordering is stable. */
export function getAllEquipment(): readonly Equipment[] {
  return GEAR_DEFINITIONS;
}

/** Look up an item by ID. Returns undefined if the ID is unknown or stale. */
export function getEquipment(id: string | undefined): Equipment | undefined {
  if (!id) return undefined;
  return GEAR_REGISTRY[id];
}

/**
 * Resolve an EquippedGear map to the concrete Equipment array. Unknown or
 * missing slot IDs are silently dropped — this keeps legacy avatars and
 * out-of-date clients safe.
 */
export function resolveEquippedItems(equipped: EquippedGear | undefined): Equipment[] {
  if (!equipped) return [];
  const items: Equipment[] = [];
  for (const slot of ['weapon', 'armour', 'accessory'] as const) {
    const item = getEquipment(equipped[slot]);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Resolve a flat inventory list of equipment IDs. Skips unknown IDs.
 * Used by the gear screen to render the "owned" panel.
 */
export function resolveInventory(inventory: readonly string[] | undefined): Equipment[] {
  if (!inventory) return [];
  const items: Equipment[] = [];
  for (const id of inventory) {
    const item = getEquipment(id);
    if (item) items.push(item);
  }
  return items;
}
