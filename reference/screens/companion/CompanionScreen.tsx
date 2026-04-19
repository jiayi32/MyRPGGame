/**
 * CompanionScreen — Full companion interaction hub (Companion tab root).
 *
 * Layout:
 * 1. Large sprite display using CompanionWidget at full size
 * 2. Mood picker (AnimatedSegmentedControl)
 * 3. Action cards — 1 active ("Choose Companion") + 3 "Coming Soon" placeholders
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGamification } from '../../contexts/GamificationContext';
import { useCompanionState } from '../../components/companion/useCompanionState';
import { isExpeditionComplete } from '../../services/gamification/ExpeditionService';
import CompanionWidget from '../../components/companion/CompanionWidget';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import GoldDisplay from '../../components/GoldDisplay';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { CompanionMood } from '../../components/companion/types';

const MOOD_OPTIONS = [
  { label: 'Idle 😊', value: 'idle' },
  { label: 'Excited ⚡', value: 'excited' },
  { label: 'Sleepy 😴', value: 'sleepy' },
  { label: 'Adventure ⚔️', value: 'adventuring' },
];

interface ActionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onPress?: () => void;
}

function ActionCard({ icon, title, subtitle, disabled, onPress }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, disabled && styles.actionCardDisabled]}
      activeOpacity={disabled ? 1 : 0.7}
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.actionCardLeft}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={disabled ? Colors.textSecondary || '#9CA3AF' : Colors.primary || '#4200FF'}
        />
        <View style={styles.actionCardText}>
          <Text style={[styles.actionCardTitle, disabled && styles.actionCardTitleDisabled]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.actionCardSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      <MaterialCommunityIcons
        name={disabled ? 'lock' : 'chevron-right'}
        size={20}
        color={disabled ? Colors.textSecondary || '#9CA3AF' : Colors.textSecondary || '#6B7280'}
      />
    </TouchableOpacity>
  );
}

export default function CompanionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { setCompanionMood, gold, expedition, townBuildings, currentTownTier } = useGamification() as any;
  const { mood, characterId } = useCompanionState();

  // Tracks the widget's active mood (including drifts) for the segmented filter
  const [displayMood, setDisplayMood] = useState<CompanionMood>(mood);

  const handleMoodSelect = useCallback(
    (val: string) => {
      setCompanionMood(val as CompanionMood);
    },
    [setCompanionMood],
  );

  // Minute tick — drives per-minute refresh of expedition time remaining
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const isActive = expedition?.active && !expedition.resolved && !isExpeditionComplete(expedition);
    if (!isActive) return;
    const t = setInterval(() => setMinuteTick(v => v + 1), 60_000);
    return () => clearInterval(t);
  }, [expedition]);

  const expeditionSubtitle = useMemo(() => {
    if (!expedition?.active) return 'Send your companion out';
    if (expedition.resolved) return 'Send your companion out';
    if (isExpeditionComplete(expedition)) return 'Companion returned!';
    // In progress — show remaining time (refreshes every minute via minuteTick)
    try {
      const returnsAt = expedition.returnsAt?.toDate
        ? expedition.returnsAt.toDate()
        : new Date(expedition.returnsAt);
      const ms = returnsAt.getTime() - Date.now();
      if (ms <= 0) return 'Companion returned!';
      const totalMin = Math.ceil(ms / 60000);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      return `In progress — ${timeStr} remaining`;
    } catch {
      return 'In progress...';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedition, minuteTick]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getBottomContentPadding(insets.bottom) },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Companion</Text>
        <GoldDisplay gold={gold || 0} />
      </View>

      {/* Large sprite display — reuses full CompanionWidget */}
      <CompanionWidget
        characterId={characterId}
        mood={mood}
        onMoodChange={(m: string) => setCompanionMood(m)}
        onActiveMoodChange={setDisplayMood}
        hideMoodPicker
        onPress={() => navigation.navigate('CompanionSelect')}
        style={styles.widgetContainer}
      />

      {/* Mood picker */}
      <Text style={styles.sectionLabel}>Mood</Text>
      <AnimatedSegmentedControl
        options={MOOD_OPTIONS}
        selected={displayMood}
        onSelect={handleMoodSelect}
        style={styles.moodPicker}
      />

      {/* Action cards */}
      <Text style={styles.sectionLabel}>Actions</Text>
      <ActionCard
        icon="sword-cross"
        title="Campaign"
        subtitle="Quests, battles, and boss encounters"
        onPress={() => navigation.navigate('CampaignSelectScreen')}
      />
      {/* Temporarily disabled after review of expedition content and pacing. Will return in a future update with more expedition options and clearer progression! */}
      {/* <ActionCard
        icon="compass-outline"
        title="Send on Expedition"
        subtitle={expeditionSubtitle}
        onPress={() => navigation.navigate('ExpeditionScreen')}
      /> */}
      {/* Temporarily disabled - Adventure map to be reviewed for pacing and content after initial release. Will return in a future update! */}
      {/* <ActionCard
        icon="map-outline"
        title="Adventure Map"
        subtitle="Earn gold while your companion fights"
        onPress={() => navigation.navigate('AdventureMapScreen')}
      /> */}
      <ActionCard
        icon="home-city-outline"
        title="Town"
        subtitle={townBuildings?.length > 0
          ? `${currentTownTier?.name || 'Hamlet'} · ${townBuildings.length} building${townBuildings.length !== 1 ? 's' : ''}`
          : 'Build and upgrade your base'}
        onPress={() => navigation.navigate('TownScreen')}
      />
      {/* Companion Shop - Temporarily removed until we have more content to justify the screen. Will return in a future update! */}
      {/* <ActionCard
        icon="shopping-outline"
        title="Companion Shop"
        subtitle="Outfits and items for your companion"
        onPress={() => navigation.navigate('ShopScreen')}
      /> */}
      
      <ActionCard
        icon="swap-horizontal"
        title="Choose Companion"
        subtitle="Browse and equip a companion"
        onPress={() => navigation.navigate('CompanionSelect')}
      />
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
    paddingTop: Spacing.lg || 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary || '#1F2937',
  },
  widgetContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
    marginBottom: 8,
    marginTop: 8,
  },
  moodPicker: {
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md || 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionCardText: {
    marginLeft: 12,
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary || '#1F2937',
  },
  actionCardTitleDisabled: {
    color: Colors.textSecondary || '#6B7280',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
    marginTop: 2,
  },
});
