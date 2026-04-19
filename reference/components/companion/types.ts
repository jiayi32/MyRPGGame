/**
 * Companion system types — sprite animation, mood state machine, character registry.
 */

export type CharacterId =
  | 'AceWild'
  | 'EdwardFMA'
  | 'KingMont'
  | 'Lenneth'
  | 'LightningOdin'
  | 'LightningX1'
  | 'LightningX2'
  | 'LightningX3'
  | 'Nier2B'
  | 'Nier9S'
  | 'NierA2'
  | 'Olberic'
  | 'Primrose'
  | 'RainDemon'
  | 'RainKing'
  | 'RainNormal'
  | 'RoyNV'
  | 'Serah'
  | 'Therion'
  | 'Tilith'
  | 'Tressa'
  | 'WOL'
  | 'Yshtola';

/** Animation names included in the widget (excludes jump, atk1, brave_shift, etc.) */
export type SpriteAnimName =
  | 'idle'
  | 'standby'
  | 'win'
  | 'win_before'
  | 'move'
  | 'atk'
  | 'magic_atk'
  | 'magic_standby'
  | 'limit_atk'
  | 'dying'
  | 'dead';

/** Simplified mood system — 4 moods */
export type CompanionMood = 'idle' | 'excited' | 'sleepy' | 'adventuring';

/** Metadata extracted from the sprite JSON files */
export interface SpriteAnimMeta {
  /** Per-frame delay in 1/60s ticks */
  frameDelays: number[];
  /** Width of a single frame in px */
  frameWidth: number;
  /** Height of a single frame in px */
  frameHeight: number;
  /** Total number of frames */
  frameCount: number;
  /** Total width of the horizontal strip PNG */
  imageWidth: number;
  /** Anchor point within the frame (px from right, px from bottom). Defaults to (0,0) = bottom-right corner. */
  anchor?: { fromRight: number; fromBottom: number };
}

/** A loadable sprite animation: bundled image + parsed metadata */
export interface SpriteAssetEntry {
  /** require() return value for the PNG strip */
  image: number;
  meta: SpriteAnimMeta;
}

/** Full manifest for one character — all widget-safe animations */
export interface CharacterManifest {
  characterId: CharacterId;
  displayName: string;
  animations: Partial<Record<SpriteAnimName, SpriteAssetEntry>>;
}

/** A single step in a mood animation sequence */
export interface AnimStep {
  anim: SpriteAnimName;
  /**
   * How many full cycles to play before firing onAnimationEnd.
   * - undefined or Infinity → loop forever (hold on this step until mood changes)
   * - 1 → play once then advance
   * - 3 → play 3 full cycles then advance
   */
  loops?: number;
}

export const ALL_CHARACTER_IDS: CharacterId[] = [
  'AceWild', 'EdwardFMA', 'KingMont', 'Lenneth',
  'LightningOdin', 'LightningX1', 'LightningX2', 'LightningX3',
  'Nier2B', 'Nier9S', 'NierA2', 'Olberic',
  'Primrose', 'RainDemon', 'RainKing', 'RainNormal',
  'RoyNV', 'Serah', 'Therion', 'Tilith',
  'Tressa', 'WOL', 'Yshtola',
];

/** Widget-safe animation names to include in the registry */
export const WIDGET_ANIM_NAMES: SpriteAnimName[] = [
  'idle', 'standby', 'win', 'win_before', 'move',
  'atk', 'magic_atk', 'magic_standby', 'limit_atk',
  'dying', 'dead',
];
