/**
 * ExpeditionScreen — Send companion on timed expeditions for gold.
 *
 * Three states:
 * 1. No expedition → expedition type selection list
 * 2. Active, in progress → countdown timer + adventuring info
 * 3. Active, returned → "Open Chest" to collect loot
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGamification } from '../../contexts/GamificationContext';
import { EXPEDITION_DEFINITIONS, isExpeditionComplete } from '../../services/gamification/ExpeditionService';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import { haptics } from '../../utils/haptics';
import GoldDisplay from '../../components/GoldDisplay';
import type { ExpeditionDefinition } from '../../services/gamification/ExpeditionTypes';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function ExpeditionScreen() {
  const insets = useSafeAreaInsets();
  const {
    gold,
    level,
    expedition,
    startExpedition,
    resolveExpedition,
    clearExpedition,
  } = useGamification() as any;

  const [remaining, setRemaining] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!expedition?.active || expedition?.resolved) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      try {
        const returnsAt = expedition.returnsAt?.toDate
          ? expedition.returnsAt.toDate()
          : new Date(expedition.returnsAt);
        const ms = returnsAt.getTime() - Date.now();
        setRemaining(Math.max(0, ms));
      } catch {
        setRemaining(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expedition]);

  const isReturned = expedition?.active && !expedition?.resolved && isExpeditionComplete(expedition);
  const isInProgress = expedition?.active && !expedition?.resolved && !isReturned;

  const handleSend = useCallback(async (def: ExpeditionDefinition) => {
    setSending(true);
    try {
      const result = await startExpedition(def.id);
      if (result?.success) {
        haptics.success?.() || haptics.selection();
      } else if (result?.error === 'level_too_low') {
        Alert.alert('Level Too Low', `You need Level ${def.levelRequired} to attempt this expedition.`);
      } else if (result?.error === 'expedition_active') {
        Alert.alert('Expedition Active', 'Your companion is already on an expedition.');
      }
    } finally {
      setSending(false);
    }
  }, [startExpedition]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Expedition',
      'Are you sure? Your companion will return empty-handed and you won\'t receive any rewards.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await clearExpedition();
              haptics.selection();
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }, [clearExpedition]);

  const handleCollect = useCallback(async () => {
    setResolving(true);
    try {
      haptics.success?.() || haptics.selection();
      await resolveExpedition();
      // After collecting, clear the expedition so user can start a new one
      setTimeout(() => clearExpedition(), 500);
    } finally {
      setResolving(false);
    }
  }, [resolveExpedition, clearExpedition]);

  const activeDef = expedition?.expeditionType
    ? EXPEDITION_DEFINITIONS.find((d) => d.id === expedition.expeditionType)
    : null;

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
        <Text style={styles.header}>Expeditions</Text>
        <GoldDisplay gold={gold} />
      </View>
      <Text style={styles.subtitle}>Send your companion on adventures to earn gold</Text>

      {/* State: Returned — collect loot */}
      {isReturned && activeDef && (
        <View style={styles.statusCard}>
          <MaterialCommunityIcons name="treasure-chest" size={48} color="#F59E0B" />
          <Text style={styles.returnedTitle}>Your companion has returned!</Text>
          <Text style={styles.returnedSubtitle}>from {activeDef.name}</Text>
          <TouchableOpacity
            style={styles.collectButton}
            onPress={handleCollect}
            disabled={resolving}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="gift-open" size={20} color="#fff" />
            <Text style={styles.collectButtonText}>
              {resolving ? 'Opening...' : 'Open Chest'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* State: In progress — countdown */}
      {isInProgress && activeDef && (
        <View style={styles.statusCard}>
          <MaterialCommunityIcons name={activeDef.icon as any} size={40} color={Colors.primary || '#4200FF'} />
          <Text style={styles.inProgressTitle}>{activeDef.name}</Text>
          <Text style={styles.inProgressSubtitle}>{activeDef.description}</Text>
          <View style={styles.timerContainer}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.textSecondary || '#6B7280'} />
            <Text style={styles.timerText}>{formatCountdown(remaining)}</Text>
          </View>
          <Text style={styles.timerLabel}>remaining</Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>
              {cancelling ? 'Cancelling...' : 'Cancel Expedition'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* State: No expedition — selection list */}
      {!expedition?.active && (
        <>
          <Text style={styles.sectionLabel}>Choose an Expedition</Text>
          {EXPEDITION_DEFINITIONS.map((def) => {
            const locked = (level || 1) < def.levelRequired;
            return (
              <View
                key={def.id}
                style={[styles.expeditionCard, locked && styles.expeditionCardLocked]}
              >
                <View style={styles.expeditionLeft}>
                  <MaterialCommunityIcons
                    name={def.icon as any}
                    size={28}
                    color={locked ? Colors.textSecondary || '#9CA3AF' : Colors.primary || '#4200FF'}
                  />
                  <View style={styles.expeditionInfo}>
                    <Text style={[styles.expeditionName, locked && styles.textLocked]}>
                      {def.name}
                    </Text>
                    <Text style={styles.expeditionDesc}>{def.description}</Text>
                    <View style={styles.rewardRow}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.textSecondary || '#6B7280'} />
                      <Text style={styles.rewardText}>{formatDuration(def.durationMinutes)}</Text>
                      <MaterialCommunityIcons name="circle-multiple" size={12} color="#F59E0B" />
                      <Text style={styles.rewardText}>{def.goldRange.min}–{def.goldRange.max}</Text>
                    </View>
                  </View>
                </View>
                {locked ? (
                  <View style={styles.lockBadge}>
                    <MaterialCommunityIcons name="lock" size={14} color="#fff" />
                    <Text style={styles.lockText}>Lv{def.levelRequired}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => handleSend(def)}
                    disabled={sending}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background || '#F9FAFB' },
  content: { paddingHorizontal: Spacing.md || 16, paddingTop: Spacing.lg || 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  header: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary || '#1F2937' },
  subtitle: { fontSize: 13, color: Colors.textSecondary || '#6B7280', marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary || '#6B7280', marginBottom: 12 },

  // Status card (returned / in-progress)
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.lg || 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  returnedTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary || '#1F2937', marginTop: 12 },
  returnedSubtitle: { fontSize: 13, color: Colors.textSecondary || '#6B7280', marginTop: 4, marginBottom: 16 },
  collectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  collectButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  inProgressTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary || '#1F2937', marginTop: 12 },
  inProgressSubtitle: { fontSize: 13, color: Colors.textSecondary || '#6B7280', marginTop: 4, marginBottom: 16 },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerText: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary || '#1F2937', fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 12, color: Colors.textSecondary || '#6B7280', marginTop: 4 },

  // Expedition selection cards
  expeditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.md || 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  expeditionCardLocked: { opacity: 0.5 },
  expeditionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  expeditionInfo: { flex: 1 },
  expeditionName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary || '#1F2937' },
  expeditionDesc: { fontSize: 12, color: Colors.textSecondary || '#6B7280', marginTop: 2 },
  textLocked: { color: Colors.textSecondary || '#6B7280' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rewardText: { fontSize: 11, color: Colors.textSecondary || '#6B7280', marginRight: 6 },

  sendButton: {
    backgroundColor: Colors.primary || '#4200FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  lockText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cancelButton: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
  },
});
