/**
 * companionUnlocks — defines unlock requirements for each character.
 *
 * ~8 characters free from start, others locked behind level or achievement gates.
 * Characters with more complex/flashy animations are gated at higher levels.
 *
 * Beta testers get all characters unlocked via gameProfile.isBetaTester flag.
 */

import type { CharacterId } from './types';

export interface UnlockRequirement {
  type: 'free' | 'level' | 'achievement';
  /** Required level (when type === 'level') */
  level?: number;
  /** Required achievement ID (when type === 'achievement') */
  achievementId?: string;
  /** Human-readable description of the requirement */
  description?: string;
}

export const COMPANION_UNLOCKS: Record<CharacterId, UnlockRequirement> = {
  // Free characters (~8, simpler/smaller sprites)
  KingMont:     { type: 'free' },
  RainNormal:   { type: 'free' },
  Olberic:      { type: 'free' },
  Therion:      { type: 'free' },
  Tressa:       { type: 'free' },
  Primrose:     { type: 'free' },
  Tilith:       { type: 'free' },
  Nier9S:       { type: 'free' },

  // Level-gated characters
  Serah:          { type: 'free' }, // { type: 'level', level: 2, description: 'Reach Level 2' }, //uncomment to make gated
  EdwardFMA:      { type: 'free' }, // { type: 'level', level: 2, description: 'Reach Level 2' }, //uncomment to make gated
  RoyNV:          { type: 'free' }, // { type: 'level', level: 3, description: 'Reach Level 3' }, //uncomment to make gated
  AceWild:        { type: 'free' }, // { type: 'level', level: 3, description: 'Reach Level 3' }, //uncomment to make gated
  Yshtola:        { type: 'free' }, // { type: 'level', level: 4, description: 'Reach Level 4' }, //uncomment to make gated
  Nier2B:         { type: 'free' }, // { type: 'level', level: 4, description: 'Reach Level 4' }, //uncomment to make gated
  NierA2:         { type: 'free' }, // { type: 'level', level: 5, description: 'Reach Level 5' }, //uncomment to make gated
  Lenneth:        { type: 'free' }, // { type: 'level', level: 5, description: 'Reach Level 5' }, //uncomment to make gated
  RainKing:       { type: 'free' }, // { type: 'level', level: 6, description: 'Reach Level 6' }, //uncomment to make gated
  WOL:            { type: 'free' }, // { type: 'level', level: 6, description: 'Reach Level 6' }, //uncomment to make gated
  LightningX1:    { type: 'free' }, // { type: 'level', level: 7, description: 'Reach Level 7' }, //uncomment to make gated
  LightningX2:    { type: 'free' }, // { type: 'level', level: 7, description: 'Reach Level 7' }, //uncomment to make gated

  // Achievement-gated characters (most complex sprites)
  RainDemon:      { type: 'free' }, // { type: 'achievement', achievementId: 'streak_7', description: 'Earn "On a Roll" achievement' },  //uncomment to make gated
  LightningOdin:  { type: 'free' }, // { type: 'level', level: 8, description: 'Reach Level 8' }, //uncomment to make gated
  LightningX3:    { type: 'free' }, // { type: 'level', level: 9, description: 'Reach Level 9' }, //uncomment to make gated
};

/** Check if a character is unlocked for a given user profile */
export function isCharacterUnlocked(
  characterId: CharacterId,
  userLevel: number,
  earnedAchievementIds: string[],
  isBetaTester: boolean = false,
): boolean {
  if (isBetaTester) return true;

  const req = COMPANION_UNLOCKS[characterId];
  if (!req) return false;

  switch (req.type) {
    case 'free':
      return true;
    case 'level':
      return userLevel >= (req.level || 1);
    case 'achievement':
      return req.achievementId ? earnedAchievementIds.includes(req.achievementId) : false;
    default:
      return false;
  }
}

/** Get the unlock description for display */
export function getUnlockDescription(characterId: CharacterId): string | null {
  const req = COMPANION_UNLOCKS[characterId];
  if (!req || req.type === 'free') return null;
  return req.description || null;
}
