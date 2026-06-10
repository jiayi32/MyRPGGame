// ─── Synergy / Trait System ──────────────────────────────────────
// Sci-fi themed elements with TFT-style trait tiers (2/4/6).
// Passives count toward trait thresholds; wildcards are stronger but
// grant no trait progress.
//
// Type effectiveness: Pokémon-style matrix — each element is strong
// vs 2, weak vs 2, resists itself (½×).

export type SynergyTag = 'thermal' | 'cryo' | 'void' | 'radiant' | 'kinetic' | 'digital';

// ─── Trait Tier Definitions ──────────────────────────────────────

export type TraitTier = 1 | 2 | 3;

export interface TraitTierBonus {
  tier: TraitTier;
  threshold: number;
  label: string;
  description: string;
}

export interface TraitDef {
  tag: SynergyTag;
  name: string;
  icon: string;
  tiers: readonly TraitTierBonus[];
}

export const TRAITS: readonly TraitDef[] = [
  {
    tag: 'thermal',
    name: 'Thermal',
    icon: '🔥',
    tiers: [
      { tier: 1, threshold: 2, label: 'Heat Sink',
        description: '+15% thermal damage. Basic attacks apply 1 stack of Burn (3% HP/sec, 4s).' },
      { tier: 2, threshold: 4, label: 'Thermal Cascade',
        description: 'Burn has 30% chance to spread to adjacent enemy on tick. +10% crit with thermal skills.' },
      { tier: 3, threshold: 6, label: 'Plasma Overload',
        description: 'Thermal attacks ignore 25% enemy defense. Burn stacks cap increased to 5.' },
    ],
  },
  {
    tag: 'cryo',
    name: 'Cryo',
    icon: '❄️',
    tiers: [
      { tier: 1, threshold: 2, label: 'Sub-Zero',
        description: '+15% cryo damage. Cryo skills apply Chill (−10% CT speed, 5s).' },
      { tier: 2, threshold: 4, label: 'Permafrost',
        description: '20% chance to CT-freeze target on cryo hit. +15% chill duration.' },
      { tier: 3, threshold: 6, label: 'Absolute Zero',
        description: 'Cryo kills reset cooldown of one cryo skill. Chilled enemies take +15% damage.' },
    ],
  },
  {
    tag: 'void',
    name: 'Void',
    icon: '🌑',
    tiers: [
      { tier: 1, threshold: 2, label: 'Dark Matter',
        description: '+12% void damage. 8% lifesteal on void damage.' },
      { tier: 2, threshold: 4, label: 'Ghost Protocol',
        description: 'First void skill each battle hits all enemies. Stealth for 1 tick after void kill.' },
      { tier: 3, threshold: 6, label: 'Null-Space',
        description: 'Void crits apply Vulnerable (+20% damage taken, 3s). Lifesteal increased to 15%.' },
    ],
  },
  {
    tag: 'radiant',
    name: 'Radiant',
    icon: '💡',
    tiers: [
      { tier: 1, threshold: 2, label: 'Photon Barrier',
        description: '+10% healing received. Cleanse 1 debuff at battle start.' },
      { tier: 2, threshold: 4, label: 'Overheal Matrix',
        description: 'Excess healing converts to shield (up to 20% max HP). Shield persists within the same stage.' },
      { tier: 3, threshold: 6, label: 'Second Dawn',
        description: 'Once per run: revive at 40% HP on death. +25% all stats for rest of battle.' },
    ],
  },
  {
    tag: 'kinetic',
    name: 'Kinetic',
    icon: '🔫',
    tiers: [
      { tier: 1, threshold: 2, label: 'Ballistic Calibration',
        description: '+12% kinetic damage. +8% crit multiplier.' },
      { tier: 2, threshold: 4, label: 'Breach & Clear',
        description: 'Kinetic crits ignore 35% enemy defense. Consecutive kinetic hits: +10% dmg (max +30%).' },
      { tier: 3, threshold: 6, label: 'Kinetic Overload',
        description: 'Every 4th kinetic hit is guaranteed crit + stuns for 1 CT tick. Momentum persists between battles.' },
    ],
  },
  {
    tag: 'digital',
    name: 'Digital',
    icon: '💻',
    tiers: [
      { tier: 1, threshold: 2, label: 'Code Injection',
        description: '+10% MP regen. Digital skills reduce enemy mdef by 8% for 5s.' },
      { tier: 2, threshold: 4, label: 'Spell Fork',
        description: '25% chance to cast digital skills twice at 50% power. +5% MP on kill.' },
      { tier: 3, threshold: 6, label: 'System Override',
        description: 'Digital skills cost 0 MP while above 50% MP. Spell Fork chance → 35%.' },
    ],
  },
];

export const TRAIT_BY_TAG: ReadonlyMap<SynergyTag, TraitDef> = new Map(
  TRAITS.map((t) => [t.tag, t]),
);

// ─── Active Trait (resolved at battle start) ─────────────────────

export interface ActiveTrait {
  tag: SynergyTag;
  name: string;
  icon: string;
  tier: TraitTier;
  count: number;
  label: string;
  description: string;
}

// ─── Type Effectiveness Matrix ───────────────────────────────────

export type TypeMatrix = Record<SynergyTag, Record<SynergyTag, number>>;

export const TYPE_MATRIX: TypeMatrix = {
  thermal:  { thermal: 0.5, cryo: 2.0,  void: 1.0, radiant: 1.0, kinetic: 2.0,  digital: 0.5 },
  cryo:     { thermal: 0.5, cryo: 0.5,  void: 1.0, radiant: 0.5, kinetic: 2.0,  digital: 2.0 },
  void:     { thermal: 2.0, cryo: 1.0,  void: 0.5, radiant: 2.0, kinetic: 0.5,  digital: 1.0 },
  radiant:  { thermal: 1.0, cryo: 2.0,  void: 0.5, radiant: 0.5, kinetic: 1.0,  digital: 2.0 },
  kinetic:  { thermal: 0.5, cryo: 0.5,  void: 2.0, radiant: 2.0, kinetic: 0.5,  digital: 1.0 },
  digital:  { thermal: 2.0, cryo: 1.0,  void: 1.0, radiant: 0.5, kinetic: 1.0,  digital: 0.5 },
};

export const getTypeMultiplier = (
  attackElement: SynergyTag | undefined,
  defenderElement: SynergyTag | undefined,
): number => {
  if (attackElement === undefined || defenderElement === undefined) return 1.0;
  return TYPE_MATRIX[attackElement]?.[defenderElement] ?? 1.0;
};

// ─── Trait Tier Resolution ───────────────────────────────────────

export const resolveTraitTiers = (
  elementCounts: ReadonlyMap<SynergyTag, number>,
): readonly ActiveTrait[] => {
  const active: ActiveTrait[] = [];
  for (const trait of TRAITS) {
    const count = elementCounts.get(trait.tag) ?? 0;
    let highestTier: TraitTier | null = null;
    for (const tierBonus of trait.tiers) {
      if (count >= tierBonus.threshold) {
        highestTier = tierBonus.tier;
      }
    }
    if (highestTier !== null) {
      const bonus = trait.tiers[highestTier - 1];
      if (bonus) {
        active.push({
          tag: trait.tag,
          name: trait.name,
          icon: trait.icon,
          tier: highestTier,
          count,
          label: bonus.label,
          description: bonus.description,
        });
      }
    }
  }
  return active;
};

// ─── Legacy compatibility ────────────────────────────────────────

export const LEGACY_TAG_MAP: Record<string, SynergyTag> = {
  fire: 'thermal',
  frost: 'cryo',
  shadow: 'void',
  light: 'radiant',
  physical: 'kinetic',
  arcane: 'digital',
};

/** @deprecated Use TRAIT_BY_TAG and resolveTraitTiers instead. */
export interface SynergyBonusDef {
  tag: SynergyTag;
  label: string;
  description: string;
}

/** @deprecated Use TRAIT_BY_TAG instead. */
export const SYNERGY_BONUSES: readonly SynergyBonusDef[] = TRAITS.map((t) => {
  const t1 = t.tiers[0];
  if (!t1) throw new Error(`Trait ${t.tag} missing tier 1`);
  return { tag: t.tag, label: t1.label, description: t1.description };
});

/** @deprecated Use TRAIT_BY_TAG instead. */
export const SYNERGY_BONUS_BY_TAG: ReadonlyMap<SynergyTag, SynergyBonusDef> = new Map(
  SYNERGY_BONUSES.map((b) => [b.tag, b]),
);

/** @deprecated Use TraitTier thresholds instead. */
export const SYNERGY_THRESHOLD = 2;
