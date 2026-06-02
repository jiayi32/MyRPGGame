// ─── Sci-Fi Damage Types ──────────────────────────────────────────
// Replaces the fantasy DamageType enum in skill.ts.
// Used by combat engine for resistances / weaknesses.

export type SciFiDamageType =
  | 'kinetic'        // bullets, blunt force, explosions
  | 'plasma'         // superheated energy, thermal
  | 'cryo'           // freezing, thermal drain
  | 'electro'        // electricity, EMP
  | 'corrosion'      // acid, nano-deconstruction
  | 'data'           // digital/code attacks, memory corruption
  | 'radiation'      // ionizing, cellular decay
  | 'psionic'        // mental, telepathic
  | 'gravity'        // spatial distortion, crushing
  | 'true';          // untyped / absolute damage

/** Legacy compatibility — maps old fantasy types to sci-fi equivalents. */
export const LEGACY_DAMAGE_MAP: Record<string, SciFiDamageType> = {
  physical: 'kinetic',
  fire: 'plasma',
  poison: 'corrosion',
  ice: 'cryo',
  shadow: 'data',
  radiant: 'radiation',
  arcane: 'psionic',
  lightning: 'electro',
  true: 'true',
};
