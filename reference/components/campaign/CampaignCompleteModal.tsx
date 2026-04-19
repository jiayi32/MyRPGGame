/**
 * CampaignCompleteModal — Shown when the final chapter is completed.
 *
 * Uses BlurModal pattern as an overlay.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurModal } from '../BlurModal';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import type { Campaign } from '../../services/gamification/CampaignTypes';

interface CampaignCompleteModalProps {
  visible: boolean;
  campaign: Campaign;
  onNewCampaign: () => void;
  onViewArchive: () => void;
  onDismiss: () => void;
}

export default function CampaignCompleteModal({
  visible,
  campaign,
  onNewCampaign,
  onViewArchive,
  onDismiss,
}: CampaignCompleteModalProps) {
  return (
    <BlurModal visible={visible} onDismiss={onDismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Campaign Complete!</Text>
        <Text style={styles.subtitle}>You have conquered all challenges.</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{campaign.bossesDefeated}</Text>
            <Text style={styles.statLabel}>Bosses Defeated</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{campaign.totalQuestsCompleted}</Text>
            <Text style={styles.statLabel}>Quests Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{campaign.currentChapter}</Text>
            <Text style={styles.statLabel}>Chapters</Text>
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={onNewCampaign}>
          <Text style={styles.primaryBtnText}>Start New Campaign</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={onViewArchive}>
          <Text style={styles.secondaryBtnText}>View Archive</Text>
        </Pressable>
      </View>
    </BlurModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
