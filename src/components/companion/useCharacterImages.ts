/**
 * useCharacterImages — preloads all sprite sheet PNGs for a character.
 *
 * Calls useImage once per WIDGET_ANIM_NAMES slot (fixed count = 11, hooks-safe).
 * Returns a map from animation name to SkImage so SpriteAnimator never
 * has to wait for an image load during animation transitions.
 */

import { useImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { SPRITE_REGISTRY } from './spriteRegistry';
import { WIDGET_ANIM_NAMES } from './types';
import type { CharacterId, SpriteAnimName } from './types';

export type ImageMap = Partial<Record<SpriteAnimName, SkImage>>;

/**
 * Preload all animation images for a character.
 * Always calls useImage exactly WIDGET_ANIM_NAMES.length times (hooks rules).
 * Slots without an animation pass null → useImage returns null harmlessly.
 */
export function useCharacterImages(characterId: CharacterId): ImageMap {
  const manifest = SPRITE_REGISTRY[characterId];

  // Each call corresponds to a fixed slot in WIDGET_ANIM_NAMES
  // Order: idle, standby, win, win_before, move, atk, magic_atk, magic_standby, limit_atk, dying, dead
  const img0 = useImage(manifest.animations[WIDGET_ANIM_NAMES[0]]?.image ?? null);
  const img1 = useImage(manifest.animations[WIDGET_ANIM_NAMES[1]]?.image ?? null);
  const img2 = useImage(manifest.animations[WIDGET_ANIM_NAMES[2]]?.image ?? null);
  const img3 = useImage(manifest.animations[WIDGET_ANIM_NAMES[3]]?.image ?? null);
  const img4 = useImage(manifest.animations[WIDGET_ANIM_NAMES[4]]?.image ?? null);
  const img5 = useImage(manifest.animations[WIDGET_ANIM_NAMES[5]]?.image ?? null);
  const img6 = useImage(manifest.animations[WIDGET_ANIM_NAMES[6]]?.image ?? null);
  const img7 = useImage(manifest.animations[WIDGET_ANIM_NAMES[7]]?.image ?? null);
  const img8 = useImage(manifest.animations[WIDGET_ANIM_NAMES[8]]?.image ?? null);
  const img9 = useImage(manifest.animations[WIDGET_ANIM_NAMES[9]]?.image ?? null);
  const img10 = useImage(manifest.animations[WIDGET_ANIM_NAMES[10]]?.image ?? null);

  const images = [img0, img1, img2, img3, img4, img5, img6, img7, img8, img9, img10];

  const map: ImageMap = {};
  for (let i = 0; i < WIDGET_ANIM_NAMES.length; i++) {
    const img = images[i];
    if (img) {
      map[WIDGET_ANIM_NAMES[i]] = img;
    }
  }
  return map;
}
