/**
 * StatAllocationScreen — Allocate universal stat points earned from leveling.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaign } from '../../contexts/CampaignContext';
import * as CampaignService from '../../services/gamification/CampaignService';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { StatBlock, StatKey } from '../../services/gamification/CampaignTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'StatAllocationScreen'>;

// Single source of truth for allocatable stats. `cdr` is intentionally excluded —
// per design, cdr is granted only by gear (capped at 10%) and passives, never by
// stat-point allocation. Adding a key here automatically wires it through the UI.
const ALLOCATABLE_STATS: { key: StatKey; label: string; description: string }[] = [
  { key: 'strength',  label: 'STR', description: 'Physical damage scaling' },
  { key: 'defense',   label: 'DEF', description: 'Damage reduction' },
  { key: 'speed',     label: 'SPD', description: 'Turn order & dodge chance' },
  { key: 'health',    label: 'HP',  description: 'Max HP pool' },
  { key: 'mana',      label: 'MNA', description: 'Magic damage & mana pool' },
  { key: 'precision', label: 'PRC', description: 'Hit accuracy & D20 modifier' },
];

const ZERO_STATS: StatBlock = {
  strength: 10, mana: 10, speed: 10, health: 10, defense: 10, precision: 10, cdr: 0,
};

export default function StatAllocationScreen({ navigation }: Props) {
  const { avatar, campaign } = useCampaign();
  const insets = useSafeAreaInsets();

  const baseStats = useMemo(() => avatar?.stats ?? ZERO_STATS, [avatar]);

  // Calculate available points: each level grants 3 points, minus already allocated
  const totalPoints = useMemo(() => {
    const level = avatar?.campaignLevel ?? 1;
    return (level - 1) * 3;
  }, [avatar?.campaignLevel]);

  const alreadyAllocated = avatar?.universalPointsAllocated ?? 0;
  const availablePoints = totalPoints - alreadyAllocated;

  const [deltas, setDeltas] = useState<Partial<Record<StatKey, number>>>({});

  const spent = useMemo(() =>
    Object.values(deltas).reduce((sum, d) => sum + (d ?? 0), 0), [deltas]);

  const remaining = availablePoints - spent;

  const handleIncrement = useCallback((stat: StatKey) => {
    if (remaining <= 0) return;
    setDeltas(prev => ({ ...prev, [stat]: (prev[stat] ?? 0) + 1 }));
  }, [remaining]);

  const handleDecrement = useCallback((stat: StatKey) => {
    if ((deltas[stat] ?? 0) <= 0) return;
    setDeltas(prev => ({ ...prev, [stat]: (prev[stat] ?? 0) - 1 }));
  }, [deltas]);

  const handleConfirm = useCallback(async () => {
    if (spent === 0 || !campaign || !avatar) return;
    const newStats: StatBlock = { ...baseStats };
    for (const { key } of ALLOCATABLE_STATS) {
      newStats[key] = baseStats[key] + (deltas[key] ?? 0);
    }
    try {
      await CampaignService.allocateStatPoints(campaign.campaignId, avatar.userId, newStats, spent);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to allocate stats. Please try again.');
    }
  }, [spent, campaign, avatar, baseStats, deltas, navigation]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
        <Text style={styles.title}>Allocate Stats</Text>
        <Text style={styles.subtitle}>
          Level {avatar?.campaignLevel ?? 1} | {remaining} points remaining
        </Text>

        {ALLOCATABLE_STATS.map(({ key, label, description }) => {
          const base = baseStats[key];
          const delta = deltas[key] ?? 0;
          return (
            <View key={key} style={styles.statRow}>
              <View style={styles.statInfo}>
                <Text style={styles.statName}>{label}</Text>
                <Text style={styles.statDesc}>{description}</Text>
              </View>
              <View style={styles.statControls}>
                <Pressable
                  style={[styles.btn, delta <= 0 && styles.btnDisabled]}
                  onPress={() => handleDecrement(key)}
                  disabled={delta <= 0}
                >
                  <Text style={styles.btnText}>-</Text>
                </Pressable>
                <Text style={styles.statValue}>
                  {base + delta}
                  {delta > 0 && <Text style={styles.deltaText}> (+{delta})</Text>}
                </Text>
                <Pressable
                  style={[styles.btn, remaining <= 0 && styles.btnDisabled]}
                  onPress={() => handleIncrement(key)}
                  disabled={remaining <= 0}
                >
                  <Text style={styles.btnText}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
        <Pressable
          style={[styles.confirmBtn, spent === 0 && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={spent === 0}
        >
          <Text style={styles.confirmText}>Confirm ({spent} points)</Text>
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
  content: {
    padding: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  statInfo: {
    flex: 1,
  },
  statName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  statDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 60,
    textAlign: 'center',
  },
  deltaText: {
    color: '#4CAF50',
    fontSize: 14,
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
