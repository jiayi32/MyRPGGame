/**
 * CampaignArchiveScreen — Browse past campaign events (boss defeats, quest completions, milestones).
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import { useCampaign } from '../../contexts/CampaignContext';
import * as CampaignService from '../../services/gamification/CampaignService';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { ArchiveEntry } from '../../services/gamification/CampaignTypes';

const TABS = ['All', 'Bosses', 'Quests', 'Milestones'];
const TYPE_MAP: Record<number, string | null> = {
  0: null, // all
  1: 'boss_defeated',
  2: 'quest_completed',
  3: 'chapter_completed',
};

const TYPE_ICONS: Record<string, string> = {
  boss_defeated: '⚔️',
  quest_completed: '📜',
  chapter_completed: '🏰',
  campaign_archived: '🏆',
};

export default function CampaignArchiveScreen() {
  const { campaign } = useCampaign();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (!campaign?.campaignId) return;
    setLoadingEntries(true);
    CampaignService.getArchiveEntries(campaign.campaignId)
      .then(setEntries)
      .catch(console.warn)
      .finally(() => setLoadingEntries(false));
  }, [campaign?.campaignId]);

  const filtered = useMemo(() => {
    const type = TYPE_MAP[tabIndex];
    if (!type) return entries;
    return entries.filter(e => e.entryType === type);
  }, [entries, tabIndex]);

  const renderItem = useCallback(({ item }: { item: ArchiveEntry }) => {
    const icon = TYPE_ICONS[item.entryType] ?? '📋';
    const date = item.timestamp?.toDate
      ? item.timestamp.toDate().toLocaleDateString()
      : '';

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryIcon}>{icon}</Text>
          <View style={styles.entryInfo}>
            <Text style={styles.entryTitle}>{item.title}</Text>
            {date ? <Text style={styles.entryDate}>{date}</Text> : null}
          </View>
        </View>
        {item.description ? (
          <Text style={styles.entryDesc}>{item.description}</Text>
        ) : null}
        {item.earnedRewards && (
          <View style={styles.rewardRow}>
            {item.earnedRewards.xp > 0 && (
              <Text style={styles.rewardText}>+{item.earnedRewards.xp} XP</Text>
            )}
            {item.earnedRewards.gold > 0 && (
              <Text style={styles.rewardText}>+{item.earnedRewards.gold} Gold</Text>
            )}
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.tabContainer}>
        <AnimatedSegmentedControl
          values={TABS}
          selectedIndex={tabIndex}
          onChange={setTabIndex}
        />
      </View>

      {loadingEntries ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.archiveEntryId}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: getBottomContentPadding(insets.bottom) }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No archive entries yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabContainer: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryIcon: {
    fontSize: 20,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  entryDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  entryDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  rewardText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
