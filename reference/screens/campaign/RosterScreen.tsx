/**
 * RosterScreen — Party member list with stats (group campaigns).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaign } from '../../contexts/CampaignContext';
import BattleUnitSprite from '../../components/campaign/BattleUnitSprite';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import { getPrimaryClass, getSkillById } from '../../services/gamification/CampaignDefinitions';
import { buildAvatarQueueUnit, resolveAvatarStats } from '../../services/gamification/CampaignUnitBuilder';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { CampaignAvatar, StatKey } from '../../services/gamification/CampaignTypes';

const STAT_DISPLAY: { key: StatKey; label: string }[] = [
  { key: 'strength', label: 'STR' },
  { key: 'defense', label: 'DEF' },
  { key: 'speed', label: 'SPD' },
  { key: 'health', label: 'HP' },
  { key: 'mana', label: 'MNA' },
  { key: 'precision', label: 'PRC' },
  { key: 'cdr', label: 'CDR' },
];

export default function RosterScreen() {
  const { partyAvatars } = useCampaign();
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((userId: string) => {
    setExpandedId(prev => prev === userId ? null : userId);
  }, []);

  const renderItem = useCallback(({ item }: { item: CampaignAvatar }) => {
    const cls = getPrimaryClass(item.primaryClassId);
    const isExpanded = expandedId === item.userId;

    // Single source of truth: resolves equipped gear, derives HP/MP/CT pools.
    const unit = {
      ...buildAvatarQueueUnit(item),
      name: cls?.name ?? item.primaryClassId,
    };
    const effectiveStats = resolveAvatarStats(item);

    return (
      <Pressable style={styles.card} onPress={() => toggleExpand(item.userId)}>
        <View style={styles.cardHeader}>
          <BattleUnitSprite
            unit={unit}
            animState="idle"
            displayWidth={48}
            displayHeight={48}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.className}>{cls?.name ?? item.primaryClassId}</Text>
            <Text style={styles.levelText}>
              Lvl {item.campaignLevel} | Rank {item.classRank}
              {item.secondaryClassId ? ` | ${item.secondaryClassId}` : ''}
            </Text>
            <AnimatedProgressBar
              value={item.campaignXP}
              total={item.campaignXP + 100} // simplified
              height={4}
              color={Colors.primary}
              showStats={false}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            <Text style={styles.expandedTitle}>Stats</Text>
            <View style={styles.statsGrid}>
              {STAT_DISPLAY.map(({ key, label }) => (
                <View key={key} style={styles.statItem}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={styles.statValue}>{effectiveStats[key]}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.expandedTitle, { marginTop: Spacing.sm }]}>Skills</Text>
            <View style={styles.skillList}>
              {[item.equippedLoadout.basicAttackSkillId, ...item.equippedLoadout.activeSkillIds].map(sid => {
                const skill = getSkillById(sid);
                return skill ? (
                  <Text key={sid} style={styles.skillText}>{skill.name} (Lv{skill.rankRequired})</Text>
                ) : null;
              })}
            </View>
          </View>
        )}
      </Pressable>
    );
  }, [expandedId, toggleExpand]);

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={partyAvatars}
        renderItem={renderItem}
        keyExtractor={item => item.userId}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: getBottomContentPadding(insets.bottom) }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No party members yet.</Text>
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  levelText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginVertical: 2,
    textTransform: 'capitalize',
  },
  expandedSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statItem: {
    width: '30%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  skillList: {
    gap: 2,
  },
  skillText: {
    fontSize: 12,
    color: Colors.text,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
