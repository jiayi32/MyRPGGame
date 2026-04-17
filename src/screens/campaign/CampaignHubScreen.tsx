/**
 * CampaignHubScreen — Central hub for the campaign RPG system.
 *
 * Shows avatar, boss status, quest board link, party roster, and archive.
 * If no active campaign exists, shows a CTA to create one.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useGamification } from '../../contexts/GamificationContext';
import BattleUnitSprite from '../../components/campaign/BattleUnitSprite';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import CampaignCompleteModal from '../../components/campaign/CampaignCompleteModal';
import * as CampaignService from '../../services/gamification/CampaignService';
import { getPrimaryClass } from '../../services/gamification/CampaignDefinitions';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { CampaignBoss, QueueUnit } from '../../services/gamification/CampaignTypes';
import { buildAvatarQueueUnit } from '../../services/gamification/CampaignUnitBuilder';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'CampaignHubScreen'>;

export default function CampaignHubScreen({ navigation }: Props) {
  const {
    campaign, avatar, partyAvatars, quests, currentBoss, loading, campaignComplete,
    startEndlessBattle,
  } = useCampaign();
  const insets = useSafeAreaInsets();

  const [fledRivals, setFledRivals] = useState<CampaignBoss[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Show completion modal when campaign is completed
  useEffect(() => {
    if (campaignComplete) setShowCompleteModal(true);
  }, [campaignComplete]);

  // Load fled rivals
  useEffect(() => {
    if (!campaign?.campaignId) return;
    CampaignService.getFledRivals(campaign.campaignId)
      .then(setFledRivals)
      .catch(console.warn);
  }, [campaign?.campaignId, campaign?.bossesDefeated]);

  const cls = useMemo(() => avatar ? getPrimaryClass(avatar.primaryClassId) : null, [avatar]);

  const pendingQuests = useMemo(() =>
    quests.filter(q => q.status === 'available' || q.status === 'in_progress').length,
    [quests]);

  // Gear-resolved preview unit — same builder the combat engine uses.
  // We override name with the class display label since the hub shows it.
  const avatarUnit: QueueUnit | null = useMemo(() => {
    if (!avatar) return null;
    return {
      ...buildAvatarQueueUnit(avatar),
      name: cls?.name ?? avatar.primaryClassId,
    };
  }, [avatar, cls]);

  // ── No campaign state — redirect to selection screen ─────────────
  if (!campaign) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <>
              <Text style={styles.emptyTitle}>No Campaign Selected</Text>
              <Text style={styles.emptyDesc}>
                Select or create a campaign from the campaign list.
              </Text>
              <Pressable
                style={styles.startBtn}
                onPress={() => navigation.navigate('CampaignSelectScreen')}
              >
                <Text style={styles.startBtnText}>View Campaigns</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Active campaign ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
        {/* Header */}
        <Text style={styles.headerTitle}>Campaign</Text>
        <Text style={styles.headerSub}>
          Chapter {campaign.currentChapter} | {campaign.bossesDefeated} bosses defeated
        </Text>

        {/* Avatar Card */}
        {avatar && avatarUnit && (
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <BattleUnitSprite
                unit={avatarUnit}
                animState="standby"
                displayWidth={64}
                displayHeight={64}
              />
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarClass}>{cls?.name ?? avatar.primaryClassId}</Text>
                <Text style={styles.avatarLevel}>
                  Lvl {avatar.campaignLevel} | Class Rank {avatar.classRank}/10
                  {avatar.secondaryClassId ? ` | ${avatar.secondaryClassId}` : ''}
                </Text>
                <AnimatedProgressBar
                  value={avatar.campaignXP}
                  total={avatar.campaignXP + 100}
                  height={5}
                  color={Colors.primary}
                  label="Campaign XP"
                />
              </View>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                style={styles.cardAction}
                onPress={() => navigation.navigate('StatAllocationScreen')}
              >
                <Text style={styles.cardActionText}>Allocate Stats</Text>
              </Pressable>
              <Pressable
                style={styles.cardAction}
                onPress={() => navigation.navigate('GearScreen')}
              >
                <Text style={styles.cardActionText}>Gear</Text>
              </Pressable>
              <Pressable
                style={[styles.cardAction, styles.switchClassAction]}
                onPress={() => navigation.navigate('ClassPickerScreen', { mode: 'respec' })}
              >
                <Text style={styles.cardActionText}>Switch Class</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Boss Status Card */}
        {currentBoss && (
          <View style={[styles.card, styles.bossCard]}>
            <Text style={styles.bossLabel}>Current Boss</Text>
            <Text style={styles.bossName}>{currentBoss.name}</Text>
            <View style={styles.bossMetaRow}>
              <Text style={styles.bossMeta}>{currentBoss.archetype}</Text>
              <Text style={styles.bossMeta}>Lv {currentBoss.level}</Text>
              {currentBoss.isRival && <Text style={styles.rivalBadge}>RIVAL</Text>}
            </View>
            <AnimatedProgressBar
              value={currentBoss.hp}
              total={currentBoss.maxHp}
              height={8}
              color="#D32F2F"
              showStats
            />
            <View style={styles.traitRow}>
              {currentBoss.traits?.map(t => (
                <View key={t} style={styles.traitBadge}>
                  <Text style={styles.traitText}>{t}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={styles.challengeBtn}
              onPress={() => navigation.navigate('QuestPrepScreen', { bossId: currentBoss.bossId })}
            >
              <Text style={styles.challengeBtnText}>Challenge Boss</Text>
            </Pressable>
          </View>
        )}

        {/* Fled Rivals */}
        {fledRivals.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fled Rivals ({fledRivals.length})</Text>
            {fledRivals.slice(0, 3).map(rival => (
              <View key={rival.bossId} style={styles.rivalRow}>
                <Text style={styles.rivalName}>{rival.name}</Text>
                <Text style={styles.rivalMeta}>Lv {rival.level} | {rival.archetype}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quest Board Card */}
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('QuestBoardScreen')}
        >
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>Quest Board</Text>
            {pendingQuests > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingQuests}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDesc}>
            {quests.length} quests total | {quests.filter(q => q.status === 'completed').length} completed
          </Text>
        </Pressable>

        {/* Endless Arena Card */}
        <Pressable
          style={[styles.card, styles.arenaCard]}
          onPress={() => {
            startEndlessBattle();
            navigation.navigate('BattleScreen', { endlessMode: true });
          }}
        >
          <Text style={styles.cardTitle}>Endless Arena</Text>
          <Text style={styles.cardDesc}>Fight endless waves of enemies for XP and Gold</Text>
        </Pressable>

        {/* Party Roster Card (group campaigns) */}
        {campaign.type === 'group' && partyAvatars.length > 0 && (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('RosterScreen')}
          >
            <Text style={styles.cardTitle}>Party Roster</Text>
            <Text style={styles.cardDesc}>{partyAvatars.length} members</Text>
          </Pressable>
        )}

        {/* Archive Card */}
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('CampaignArchiveScreen')}
        >
          <Text style={styles.cardTitle}>Campaign Archive</Text>
          <Text style={styles.cardDesc}>View battle history and milestones</Text>
        </Pressable>
      </ScrollView>

      {/* Campaign Complete Modal */}
      {campaign && (
        <CampaignCompleteModal
          visible={showCompleteModal}
          campaign={campaign}
          onNewCampaign={() => {
            setShowCompleteModal(false);
            CampaignService.archiveCampaign(campaign.campaignId).catch(console.warn);
            navigation.navigate('ClassPickerScreen', { mode: 'create' });
          }}
          onViewArchive={() => {
            setShowCompleteModal(false);
            navigation.navigate('CampaignArchiveScreen');
          }}
          onDismiss={() => setShowCompleteModal(false)}
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
  scrollContent: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    paddingBottom: 120, // account for tab bar
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bossCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  arenaCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarInfo: {
    flex: 1,
  },
  avatarClass: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  avatarLevel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginVertical: 2,
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardAction: {},
  switchClassAction: {},
  cardActionText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  bossLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bossName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B6B',
  },
  bossMetaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
    alignItems: 'center',
  },
  bossMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  rivalBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  traitRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  traitBadge: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  traitText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  challengeBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  challengeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rivalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rivalName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  rivalMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
