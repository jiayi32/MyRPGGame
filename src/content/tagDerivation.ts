import type { DamageType } from './types/skill';
import type { SynergyTag } from './types/synergy';
import { LEGACY_TAG_MAP } from './types/synergy';

/**
 * Auto-derive synergy tags from damage type.
 * Manual overrides in content files take precedence over this mapping.
 */
const DAMAGE_TYPE_TAG_MAP: Readonly<Record<DamageType, SynergyTag>> = {
  fire: 'thermal',
  ice: 'cryo',
  shadow: 'void',
  radiant: 'radiant',
  physical: 'kinetic',
  arcane: 'digital',
  lightning: 'digital',
  poison: 'void',
  true: 'digital',
};

/**
 * Auto-derive synergy tags from skill/gear name keyword matching.
 * Lowercase matching on the name field.
 */
const NAME_KEYWORD_TAGS: Readonly<Array<[string[], SynergyTag]>> = [
  // Thermal
  [['burn','ember','flame','inferno','ignite','pyre','lava','heat','blaze','fire','plasma','thermal','melt','scorch','cinder'], 'thermal'],
  // Cryo
  [['frost','chill','cold','ice','frozen','winter','glacier','rime','cryo','freeze','hail','blizzard','shard','arctic'], 'cryo'],
  // Void
  [['shadow','void','dark','umbra','night','shade','eclipse','gloom','stealth','null','abyss','phantom','ghost','nether'], 'void'],
  // Radiant
  [['light','radiant','holy','divine','seraph','solar','dawn','gleam','bless','laser','photon','beam','prism','flash','glow'], 'radiant'],
  // Kinetic
  [['strike','slash','blade','axe','hammer','spear','bow','fist','rend','cleave','physical','kinetic','ballistic','bullet','impact','force','crush','bash'], 'kinetic'],
  // Digital
  [['arcane','flux','mana','spell','rune','glyph','scroll','wand','staff','orb','digital','code','hack','data','virus','byte','algorithm','virtual','cyber'], 'digital'],
];

/**
 * Derive synergy tags from damage type.
 */
export const tagsFromDamageType = (damageType?: DamageType): SynergyTag[] => {
  if (damageType === undefined) return [];
  const tag = DAMAGE_TYPE_TAG_MAP[damageType];
  return tag !== undefined ? [tag] : [];
};

/**
 * Derive synergy tags from a name string via keyword matching.
 */
export const tagsFromName = (name: string): SynergyTag[] => {
  const lower = name.toLowerCase();
  const tags: SynergyTag[] = [];
  for (const [keywords, tag] of NAME_KEYWORD_TAGS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags;
};

/**
 * Combine derived tags with manual overrides.
 * Manual tags replace auto-derived tags for the same tag value.
 * Returns deduplicated array.
 */
export const resolveTags = (
  damageType: DamageType | undefined,
  name: string,
  manualTags?: readonly SynergyTag[],
): SynergyTag[] => {
  const autoTags = [...tagsFromDamageType(damageType), ...tagsFromName(name)];
  const explicit = new Set(manualTags ?? []);
  // Manual overrides take precedence — if explicitly tagged, keep only manual
  if (explicit.size > 0) {
    return [...explicit];
  }
  return [...new Set(autoTags)];
};
