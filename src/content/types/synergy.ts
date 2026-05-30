export type SynergyTag = 'fire' | 'frost' | 'shadow' | 'light' | 'physical' | 'arcane';

export interface SynergyBonusDef {
  tag: SynergyTag;
  label: string;
  description: string;
}

export const SYNERGY_BONUSES: readonly SynergyBonusDef[] = [
  {
    tag: 'fire',
    label: 'Fire Synergy',
    description: '+15% fire damage, burn applied on critical hit',
  },
  {
    tag: 'frost',
    label: 'Frost Synergy',
    description: '+10% chill/slow duration, +1 frost stack on hit',
  },
  {
    tag: 'shadow',
    label: 'Shadow Synergy',
    description: '8% lifesteal on shadow damage, +5% crit chance',
  },
  {
    tag: 'light',
    label: 'Light Synergy',
    description: '+10% healing received, cleanse 1 debuff at battle start',
  },
  {
    tag: 'physical',
    label: 'Physical Synergy',
    description: '+12% physical damage, +5% crit multiplier',
  },
  {
    tag: 'arcane',
    label: 'Arcane Synergy',
    description: '+10% MP regen rate, -5% enemy magic defense',
  },
];

export const SYNERGY_BONUS_BY_TAG: ReadonlyMap<SynergyTag, SynergyBonusDef> = new Map(
  SYNERGY_BONUSES.map((bonus) => [bonus.tag, bonus]),
);

/** Minimum count of a tag to activate its synergy bonus. */
export const SYNERGY_THRESHOLD = 3;
