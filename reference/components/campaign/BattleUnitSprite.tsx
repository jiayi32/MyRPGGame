/**
 * BattleUnitSprite — Renders a single combat unit's sprite in battle.
 *
 * Players render via SpriteAnimator using unit.companionCharacterId.
 * Enemies use the first available character sprite (flipped).
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import SpriteAnimator from '../companion/SpriteAnimator';
import { getCharacterManifest, hasAnim } from '../companion/spriteRegistry';
import type { SpriteAnimName } from '../companion/types';
import type { QueueUnit } from '../../services/gamification/CampaignTypes';

const ENEMY_FALLBACK_CHARACTER = 'AceWild';

interface BattleUnitSpriteProps {
  unit: QueueUnit;
  animState: SpriteAnimName;
  displayWidth: number;
  displayHeight: number;
  flipped?: boolean;
  loops?: number;
  onAnimationEnd?: () => void;
}

export default function BattleUnitSprite({
  unit,
  animState,
  displayWidth,
  displayHeight,
  flipped,
  loops,
  onAnimationEnd,
}: BattleUnitSpriteProps) {
  const characterId = unit.unitType === 'player'
    ? (unit.companionCharacterId || ENEMY_FALLBACK_CHARACTER)
    : ENEMY_FALLBACK_CHARACTER;

  const manifest = getCharacterManifest(characterId as any);

  const asset = useMemo(() => {
    if (!manifest) return null;
    // Try requested anim, fallback to idle
    if (hasAnim(characterId as any, animState)) {
      return manifest.animations[animState]!;
    }
    if (hasAnim(characterId as any, 'idle')) {
      return manifest.animations.idle!;
    }
    return null;
  }, [manifest, characterId, animState]);

  if (!asset) return <View style={{ width: displayWidth, height: displayHeight }} />;

  return (
    <View style={[
      styles.container,
      { width: displayWidth, height: displayHeight },
      flipped && styles.flipped,
    ]}>
      <SpriteAnimator
        asset={asset}
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        playing
        loops={loops}
        onAnimationEnd={onAnimationEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
