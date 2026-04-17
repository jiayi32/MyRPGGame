/**
 * CompanionSelectScreen — Browse and select a companion character.
 *
 * 3-column grid showing all 23 characters with idle animation previews.
 * Locked characters are greyed out with level/achievement requirement.
 * Tapping an unlocked character sets it as the active companion.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGamification } from '../../contexts/GamificationContext';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import SpriteAnimator from '../../components/companion/SpriteAnimator';
import { SPRITE_REGISTRY } from '../../components/companion/spriteRegistry';
import { ALL_CHARACTER_IDS } from '../../components/companion/types';
import { isCharacterUnlocked, getUnlockDescription } from '../../components/companion/companionUnlocks';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import type { CharacterId, CompanionMood, SpriteAnimName } from '../../components/companion/types';

const NUM_COLUMNS = 3;
const CARD_GAP = 10;

const MOOD_OPTIONS = [
  { label: 'Idle', value: 'idle' },
  { label: 'Excited', value: 'excited' },
  { label: 'Sleepy', value: 'sleepy' },
  { label: 'Adventure', value: 'adventuring' },
];

/** Map mood to a representative preview animation */
function getPreviewAnimName(mood: CompanionMood): SpriteAnimName {
  switch (mood) {
    case 'excited': return 'win';
    case 'sleepy': return 'dying';
    case 'adventuring': return 'move';
    default: return 'idle';
  }
}

export default function CompanionSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const contentPadding = Spacing.md || 16;
  const cardWidth = (screenWidth - contentPadding * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const spriteSize = cardWidth - 16; // padding inside card

  const {
    level,
    achievements,
    companionCharacter,
    equipCompanion,
    gameProfile,
    setCompanionMood,
    companionMood,
  } = useGamification() as any;

  // Sync previewMood with context mood
  const [previewMood, setPreviewMood] = useState<CompanionMood>(companionMood || 'idle');

  // When context mood changes (e.g. from another screen), update preview
  useEffect(() => {
    setPreviewMood(companionMood || 'idle');
  }, [companionMood]);

  const earnedAchievementIds = useMemo(
    () => (achievements || []).map((a: any) => a.achievementId),
    [achievements],
  );

  const isBetaTester = gameProfile?.isBetaTester ?? false;

  const currentCompanion: CharacterId = companionCharacter || 'KingMont';

  const handleSelect = useCallback(
    (charId: CharacterId) => {
      if (equipCompanion) {
        equipCompanion(charId);
      }
      navigation.goBack();
    },
    [equipCompanion, navigation],
  );

  // Handle mood select: update context (don't navigate away)
  const handleMoodSelect = useCallback(
    (val: string) => {
      setPreviewMood(val as CompanionMood);
      setCompanionMood(val as CompanionMood);
    },
    [setCompanionMood],
  );


  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getBottomContentPadding(insets.bottom) },
      ]}
    >
      <Text style={styles.header}>Choose Your Companion</Text>
      <Text style={styles.subtitle}>
        Select a companion to join you on your journey
      </Text>

      <AnimatedSegmentedControl
        options={MOOD_OPTIONS}
        selected={previewMood}
        onSelect={handleMoodSelect}
        style={styles.moodSwitcher}
      />

      <View style={styles.grid}>
        {ALL_CHARACTER_IDS.map((charId) => {
          const manifest = SPRITE_REGISTRY[charId];
          const unlocked = isCharacterUnlocked(charId, level || 1, earnedAchievementIds, isBetaTester);
          const isEquipped = charId === currentCompanion;
          const unlockDesc = getUnlockDescription(charId);
          const previewAnimName = getPreviewAnimName(previewMood);
          const previewAsset = manifest.animations[previewAnimName] || manifest.animations.idle;

          return (
            <TouchableOpacity
              key={charId}
              style={[
                styles.card,
                { width: cardWidth },
                isEquipped && styles.cardEquipped,
                !unlocked && styles.cardLocked,
              ]}
              activeOpacity={unlocked ? 0.7 : 1}
              onPress={() => unlocked && handleSelect(charId)}
            >
              {/* Sprite preview */}
              <View style={[styles.spriteWrapper, !unlocked && styles.spriteLocked]}>
                {previewAsset ? (
                  <SpriteAnimator
                    asset={previewAsset}
                    playing={unlocked}
                    displayWidth={spriteSize}
                    displayHeight={spriteSize}
                  />
                ) : (
                  <View style={{ width: spriteSize, height: spriteSize }} />
                )}

                {/* Lock overlay */}
                {!unlocked && (
                  <View style={styles.lockOverlay}>
                    <MaterialCommunityIcons name="lock" size={22} color="rgba(255,255,255,0.9)" />
                  </View>
                )}

                {/* Equipped checkmark */}
                {isEquipped && (
                  <View style={styles.equippedBadge}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
                  </View>
                )}
              </View>

              {/* Character name */}
              <Text
                style={[styles.charName, !unlocked && styles.charNameLocked]}
                numberOfLines={1}
              >
                {manifest.displayName}
              </Text>

              {/* Unlock requirement */}
              {!unlocked && unlockDesc && (
                <Text style={styles.unlockText} numberOfLines={1}>
                  {unlockDesc}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background || '#F9FAFB',
  },
  content: {
    paddingHorizontal: Spacing.md || 16,
    paddingTop: Spacing.md || 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary || '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary || '#6B7280',
    marginBottom: 12,
  },
  moodSwitcher: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.md || 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardEquipped: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primaryBackground || '#E5F1FF',
  },
  cardLocked: {
    opacity: 0.6,
  },
  spriteWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  spriteLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  equippedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
  },
  charName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary || '#1F2937',
    marginTop: 6,
    textAlign: 'center',
  },
  charNameLocked: {
    color: Colors.textSecondary || '#6B7280',
  },
  unlockText: {
    fontSize: 9,
    color: Colors.textSecondary || '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
});
