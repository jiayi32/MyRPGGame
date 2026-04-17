/**
 * RivalBossCard — Card for fled rival bosses shown in CampaignHubScreen.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import type { CampaignBoss } from '../../services/gamification/CampaignTypes';

interface RivalBossCardProps {
  boss: CampaignBoss;
  onChallenge: () => void;
}

export default function RivalBossCard({ boss, onChallenge }: RivalBossCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.rivalBadge}>RIVAL</Text>
        <Text style={styles.levelBadge}>Lv {boss.level}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{boss.name}</Text>
      <Text style={styles.archetype}>{boss.archetype}</Text>
      {boss.rivalData && (
        <Text style={styles.fleeCount}>Fled {boss.rivalData.fleeCount ?? 0}×</Text>
      )}
      <Pressable style={styles.challengeBtn} onPress={onChallenge}>
        <Text style={styles.challengeText}>Challenge</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rivalBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  levelBadge: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  archetype: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  fleeCount: {
    fontSize: 10,
    color: '#FF9800',
    marginBottom: Spacing.xs,
  },
  challengeBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  challengeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
