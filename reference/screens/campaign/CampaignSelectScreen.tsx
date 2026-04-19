/**
 * CampaignSelectScreen — Pick an existing campaign or create a new one.
 *
 * Lists all campaigns owned by the current user (active first, then archived).
 * Tapping an active campaign switches to it and navigates to CampaignHubScreen.
 * A "New Campaign" button navigates to ClassPickerScreen (disabled at MAX_ACTIVE_CAMPAIGNS).
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaign } from '../../contexts/CampaignContext';
import { useAuth } from '../../contexts/AuthContext';
import * as CampaignService from '../../services/gamification/CampaignService';
import { getPrimaryClass } from '../../services/gamification/CampaignDefinitions';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding, getFABBottomPosition } from '../../constants/navigation';
import type { Campaign, MAX_ACTIVE_CAMPAIGNS as _MAC } from '../../services/gamification/CampaignTypes';
import { MAX_ACTIVE_CAMPAIGNS } from '../../services/gamification/CampaignTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'CampaignSelectScreen'>;

export default function CampaignSelectScreen({ navigation }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { campaign: activeCampaign, switchCampaign } = useCampaign();
  const insets = useSafeAreaInsets();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'past'>('active');

  // ── Fetch campaigns on mount ────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const results = await CampaignService.getUserCampaigns(uid);
      setCampaigns(results);
    } catch (err) {
      console.warn('[CampaignSelect] Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Refresh when returning to this screen (e.g. after creating a campaign)
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadCampaigns);
    return unsub;
  }, [navigation, loadCampaigns]);

  // ── Derived data ────────────────────────────────────────────────────
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'active'), [campaigns]);
  const archivedCampaigns = useMemo(() => campaigns.filter(c => c.status === 'archived'), [campaigns]);
  const filteredCampaigns = filter === 'active' ? activeCampaigns : archivedCampaigns;
  const canCreate = activeCampaigns.length < MAX_ACTIVE_CAMPAIGNS;

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSelectCampaign = useCallback((c: Campaign) => {
    if (c.status !== 'active') return;
    switchCampaign(c.campaignId);
    navigation.navigate('CampaignHubScreen');
  }, [switchCampaign, navigation]);

  const handleCreateCampaign = useCallback(() => {
    navigation.navigate('ClassPickerScreen', { mode: 'create' });
  }, [navigation]);

  // ── Render helpers ─────────────────────────────────────────────────

  const formatDate = (ts: any): string => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderCampaignCard = ({ item }: { item: Campaign }) => {
    const cls = getPrimaryClass(item.campaignName?.split(' ')[0]?.toLowerCase() ?? '');
    const isActive = item.status === 'active';
    const isCurrent = activeCampaign?.campaignId === item.campaignId;

    return (
      <Pressable
        style={[styles.card, !isActive && styles.cardArchived, isCurrent && styles.cardCurrent]}
        onPress={() => handleSelectCampaign(item)}
        disabled={!isActive}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, !isActive && styles.textMuted]} numberOfLines={1}>
              {item.campaignName || 'Unnamed Campaign'}
            </Text>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>ACTIVE</Text>
              </View>
            )}
            {!isActive && (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardSub, !isActive && styles.textMuted]}>
            {item.type === 'group' ? 'Group' : 'Solo'} | Chapter {item.currentChapter} | {item.bossesDefeated} bosses
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>
            {item.totalQuestsCompleted} quests | {item.totalXPEarned} XP
          </Text>
          <Text style={styles.cardDate}>
            {formatDate(item.lastPlayedAt ?? item.updatedAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Campaigns</Text>
        <Text style={styles.headerSub}>
          {activeCampaigns.length} / {MAX_ACTIVE_CAMPAIGNS} active
        </Text>
      </View>

      {/* Segmented Filter */}
      {campaigns.length > 0 && (
        <View style={styles.segmentContainer}>
          <Pressable
            style={[styles.segmentTab, filter === 'active' && styles.segmentTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.segmentText, filter === 'active' && styles.segmentTextActive]}>
              Active{activeCampaigns.length > 0 ? ` (${activeCampaigns.length})` : ''}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentTab, filter === 'past' && styles.segmentTabActive]}
            onPress={() => setFilter('past')}
          >
            <Text style={[styles.segmentText, filter === 'past' && styles.segmentTextActive]}>
              Past{archivedCampaigns.length > 0 ? ` (${archivedCampaigns.length})` : ''}
            </Text>
          </Pressable>
        </View>
      )}

      {loading && campaigns.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Campaigns Yet</Text>
          <Text style={styles.emptyDesc}>
            Start your first adventure! Choose a class and embark on a solo campaign.
          </Text>
        </View>
      ) : filteredCampaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {filter === 'active' ? 'No Active Campaigns' : 'No Past Campaigns'}
          </Text>
          <Text style={styles.emptyDesc}>
            {filter === 'active'
              ? 'Start a new campaign to begin your adventure!'
              : 'Completed and archived campaigns will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCampaigns}
          keyExtractor={c => c.campaignId}
          renderItem={renderCampaignCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getBottomContentPadding(insets.bottom, 80) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Campaign Button */}
      <View style={[styles.fabContainer, { bottom: getFABBottomPosition(insets.bottom) }]}>
        <Pressable
          style={[styles.fab, !canCreate && styles.fabDisabled]}
          onPress={canCreate ? handleCreateCampaign : undefined}
          disabled={!canCreate}
        >
          <Text style={[styles.fabText, !canCreate && styles.fabTextDisabled]}>
            {canCreate ? '+ New Campaign' : 'Campaign In Progress'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  segmentTabActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    paddingBottom: 120,
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
  listContent: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  cardArchived: {
    borderLeftColor: Colors.textSecondary,
    opacity: 0.65,
  },
  cardCurrent: {
    borderLeftColor: Colors.success,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  cardHeader: {
    marginBottom: Spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  textMuted: {
    color: Colors.textSecondary,
  },
  currentBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.success,
  },
  archivedBadge: {
    backgroundColor: Colors.textSecondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  fabContainer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fabDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fabTextDisabled: {
    color: '#fff',
  },
});
