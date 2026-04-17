/**
 * ClassPickerScreen — Select primary and optional secondary class for campaign creation.
 *
 * On confirm, creates a solo campaign and navigates back to the hub.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaign } from '../../contexts/CampaignContext';
import { useCompanionState } from '../../components/companion/useCompanionState';
import {
  PRIMARY_CLASS_DEFINITIONS,
  SECONDARY_CLASS_DEFINITIONS,
} from '../../services/gamification/CampaignDefinitions';
import { getAvatarClassRank } from '../../services/gamification/CampaignTypes';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { PrimaryClassId, SecondaryClassId } from '../../services/gamification/CampaignTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'ClassPickerScreen'>;

export default function ClassPickerScreen({ navigation, route }: Props) {
  const { createSoloCampaign, switchClass, avatar, loading } = useCampaign();
  const { characterId } = useCompanionState();
  const insets = useSafeAreaInsets();
  const isRespec = route.params?.mode === 'respec';

  const [primaryId, setPrimaryId] = useState<PrimaryClassId | null>(
    isRespec ? avatar?.primaryClassId ?? null : null,
  );
  const [secondaryId, setSecondaryId] = useState<SecondaryClassId | null>(
    isRespec ? avatar?.secondaryClassId ?? null : null,
  );

  const handleConfirm = useCallback(async () => {
    if (!primaryId) return;
    try {
      if (isRespec) {
        await switchClass(primaryId, secondaryId);
      } else {
        if (!characterId) return;
        await createSoloCampaign(characterId, primaryId, secondaryId);
      }
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to confirm class selection:', e);
    }
  }, [primaryId, secondaryId, characterId, isRespec, createSoloCampaign, switchClass, navigation]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getBottomContentPadding(insets.bottom) }]}
      >
        {/* Primary class section */}
        <Text style={styles.sectionTitle}>{isRespec ? 'Switch Class' : 'Choose Your Class'}</Text>
        <Text style={styles.sectionDesc}>
          {isRespec
            ? 'Each class has its own rank. Stats will reset to the new class baseline and stat points will be refunded.'
            : 'Your primary class determines your combat role and skill tree.'}
        </Text>

        <View style={styles.grid}>
          {PRIMARY_CLASS_DEFINITIONS.map(cls => {
            const rank = isRespec && avatar ? getAvatarClassRank(avatar, cls.id) : 0;
            return (
              <Pressable
                key={cls.id}
                style={[styles.classCard, primaryId === cls.id && styles.selectedCard]}
                onPress={() => setPrimaryId(cls.id)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.className}>{cls.name}</Text>
                  {rank > 0 && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>Rank {rank}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.classDesc} numberOfLines={2}>{cls.description}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Primary: {cls.statBias.primary}</Text>
                  <Text style={styles.statLabel}>Cost: {cls.costBias}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Secondary class section */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Secondary Class (Optional)</Text>
        <Text style={styles.sectionDesc}>Adds 2 active skills and 2 passives to complement your build.</Text>

        <View style={styles.grid}>
          {SECONDARY_CLASS_DEFINITIONS.map(cls => (
            <Pressable
              key={cls.id}
              style={[styles.classCard, secondaryId === cls.id && styles.selectedCard]}
              onPress={() => setSecondaryId(cls.id)}
            >
              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classDesc} numberOfLines={2}>{cls.description}</Text>
              <Text style={styles.focusLabel}>{cls.focus}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
        <Pressable
          style={[styles.confirmBtn, (!primaryId || loading || (!isRespec && !characterId)) && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={!primaryId || loading || (!isRespec && !characterId)}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>
              {route.params?.mode === 'respec' ? 'Confirm Respec' : 'Begin Campaign'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  classCard: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  noneCard: {
    backgroundColor: Colors.surfaceSecondary ?? Colors.surface,
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  rankBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  classDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginBottom: 6,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary ?? Colors.textSecondary,
    textTransform: 'capitalize',
  },
  focusLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
