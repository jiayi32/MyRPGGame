/**
 * QuestBoardScreen — Lists all campaign quests grouped by type.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import { useCampaign } from '../../contexts/CampaignContext';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { CampaignQuest } from '../../services/gamification/CampaignTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'QuestBoardScreen'>;

const QUEST_TABS = ['Main', 'Side', 'Bounty'];
const QUEST_TYPE_MAP: Record<number, string> = { 0: 'main', 1: 'side', 2: 'bounty' };

const STATUS_COLORS: Record<string, string> = {
  available: '#4CAF50',
  in_progress: '#FF9800',
  completed: '#2196F3',
  locked: '#666',
};

export default function QuestBoardScreen({ navigation }: Props) {
  const { quests, campaign } = useCampaign();
  const insets = useSafeAreaInsets();
  const [tabIndex, setTabIndex] = useState(0);

  const filtered = useMemo(() => {
    const type = QUEST_TYPE_MAP[tabIndex];
    return quests.filter(q => q.type === type);
  }, [quests, tabIndex]);

  const renderQuest = useCallback(({ item }: { item: CampaignQuest }) => {
    const isLocked = item.status === 'locked';
    const isCompleted = item.status === 'completed';
    const canAccept = item.status === 'available' || item.status === 'in_progress';

    return (
      <View style={[styles.questCard, isLocked && styles.lockedCard]}>
        <View style={styles.questHeader}>
          <Text style={[styles.questTitle, isLocked && styles.lockedText]}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#666' }]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <Text style={[styles.questDesc, isLocked && styles.lockedText]}>
          {item.description}
        </Text>

        {/* Difficulty */}
        <View style={styles.difficultyRow}>
          <Text style={styles.difficultyLabel}>Difficulty: </Text>
          {Array.from({ length: Math.min(item.difficulty, 8) }).map((_, i) => (
            <Text key={i} style={styles.star}>★</Text>
          ))}
        </View>

        {/* Rewards */}
        <View style={styles.rewardRow}>
          <Text style={styles.rewardText}>XP: {item.rewards.xp}</Text>
          <Text style={styles.rewardText}>Gold: {item.rewards.gold}</Text>
          {item.rewards.classRankXP > 0 && (
            <Text style={styles.rewardText}>Rank XP: {item.rewards.classRankXP}</Text>
          )}
        </View>

        {/* Lock requirement */}
        {isLocked && (
          <Text style={styles.lockText}>
            Requires {item.requiredBossesDefeated ?? 0} bosses defeated or quests completed
            (Bosses: {campaign?.bossesDefeated ?? 0} | Quests: {campaign?.totalQuestsCompleted ?? 0})
          </Text>
        )}

        {/* Accept button */}
        {canAccept && (
          <Pressable
            style={styles.acceptBtn}
            onPress={() => navigation.navigate('QuestPrepScreen', { questId: item.questId })}
          >
            <Text style={styles.acceptBtnText}>
              {item.status === 'in_progress' ? 'Continue' : 'Accept'}
            </Text>
          </Pressable>
        )}

        {/* Completed — show replay option */}
        {isCompleted && (
          <View style={styles.completedRow}>
            <Text style={styles.completedText}>Completed</Text>
            <Pressable
              style={styles.replayBtn}
              onPress={() => navigation.navigate('QuestPrepScreen', { questId: item.questId })}
            >
              <Text style={styles.replayBtnText}>Replay (50% rewards)</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }, [campaign, navigation]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.tabContainer}>
        <AnimatedSegmentedControl
          values={QUEST_TABS}
          selectedIndex={tabIndex}
          onChange={setTabIndex}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderQuest}
        keyExtractor={item => item.questId}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: getBottomContentPadding(insets.bottom) }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No {QUEST_TABS[tabIndex].toLowerCase()} quests available.</Text>
        }
      />
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
  questCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  lockedCard: {
    opacity: 0.6,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lockedText: {
    color: Colors.textSecondary,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  questDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  difficultyLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  star: {
    color: '#FFD700',
    fontSize: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rewardText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  lockText: {
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  completedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  replayBtn: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  replayBtnText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
