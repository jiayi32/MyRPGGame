/**
 * GearScreen — Manage the avatar's equipped gear and inventory.
 *
 * Data flow:
 *   - Source of truth: avatar from useCampaign() (auto-refreshed via onSnapshot
 *     after equip/unequip mutations land in Firestore).
 *   - Only local state is `selectedId` — the inventory item being previewed.
 *   - Stat deltas, CT-reduction summary, and slot grouping are all derived
 *     via useMemo from the avatar + selection. No mirrored state, no
 *     optimistic clones.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import {
  resolveEquippedItems,
  resolveInventory,
} from '../../services/gamification/GearDefinitions';
import {
  resolveGearStats,
  calculateGearCtReduction,
  previewEquipDelta,
} from '../../services/gamification/GearMath';
import {
  GEAR_CT_REDUCTION_CAP,
  ITEM_SLOTS,
  type Equipment,
  type ItemSlot,
  type StatBlock,
  type StatKey,
} from '../../services/gamification/CampaignTypes';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'GearScreen'>;

const STAT_DISPLAY: { key: StatKey; label: string }[] = [
  { key: 'strength', label: 'STR' },
  { key: 'defense', label: 'DEF' },
  { key: 'speed', label: 'SPD' },
  { key: 'health', label: 'HP' },
  { key: 'mana', label: 'MNA' },
  { key: 'precision', label: 'PRC' },
  { key: 'cdr', label: 'CDR' },
];

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'Weapon',
  armour: 'Armour',
  accessory: 'Accessory',
};

export default function GearScreen({ navigation }: Props) {
  const { avatar, campaign } = useCampaign();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Derived state ─────────────────────────────────────────────────
  const baseStats: StatBlock | null = avatar?.stats ?? null;

  const currentEquipped = useMemo(
    () => resolveEquippedItems(avatar?.equippedGear),
    [avatar?.equippedGear],
  );

  const inventory = useMemo(
    () => resolveInventory(avatar?.gearInventory),
    [avatar?.gearInventory],
  );

  // Group inventory by slot for the per-section list. Currently-equipped
  // items are filtered out (they appear in their own row).
  const inventoryBySlot = useMemo(() => {
    const equippedIds = new Set(currentEquipped.map(e => e.id));
    const grouped: Record<ItemSlot, Equipment[]> = { weapon: [], armour: [], accessory: [] };
    for (const item of inventory) {
      if (equippedIds.has(item.id)) continue;
      grouped[item.slot].push(item);
    }
    return grouped;
  }, [inventory, currentEquipped]);

  const equippedBySlot = useMemo(() => {
    const map: Partial<Record<ItemSlot, Equipment>> = {};
    for (const item of currentEquipped) map[item.slot] = item;
    return map;
  }, [currentEquipped]);

  const selectedItem = useMemo(
    () => (selectedId ? inventory.find(i => i.id === selectedId) ?? null : null),
    [selectedId, inventory],
  );

  // Delta = next minus current. Null when nothing's selected.
  const previewDelta = useMemo(() => {
    if (!selectedItem || !baseStats) return null;
    const replacing = equippedBySlot[selectedItem.slot];
    return previewEquipDelta(baseStats, currentEquipped, selectedItem, replacing);
  }, [selectedItem, baseStats, currentEquipped, equippedBySlot]);

  const currentResolved = useMemo(
    () => (baseStats ? resolveGearStats(baseStats, currentEquipped) : null),
    [baseStats, currentEquipped],
  );

  const currentCtReduction = useMemo(
    () => calculateGearCtReduction(currentEquipped),
    [currentEquipped],
  );

  const previewCtReduction = useMemo(() => {
    if (!selectedItem) return null;
    const replacing = equippedBySlot[selectedItem.slot];
    const next = currentEquipped.filter(e => e.id !== replacing?.id).concat(selectedItem);
    return calculateGearCtReduction(next);
  }, [selectedItem, currentEquipped, equippedBySlot]);

  // ── Mutations ──────────────────────────────────────────────────────
  const handleEquip = useCallback(async () => {
    if (!selectedItem || !campaign || !avatar) return;
    setBusy(true);
    try {
      await CampaignService.equipItem(campaign.campaignId, avatar.userId, selectedItem.id);
      setSelectedId(null);
    } catch (e) {
      Alert.alert('Failed to equip', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [selectedItem, campaign, avatar]);

  const handleUnequip = useCallback(async (slot: ItemSlot) => {
    if (!campaign || !avatar) return;
    setBusy(true);
    try {
      await CampaignService.unequipItem(campaign.campaignId, avatar.userId, slot);
      setSelectedId(null);
    } catch (e) {
      Alert.alert('Failed to unequip', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [campaign, avatar]);

  // ── Empty state ───────────────────────────────────────────────────
  if (!avatar || !campaign || !baseStats || !currentResolved) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No avatar found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) + 80 },
        ]}
      >
        {/* Stats summary card with optional preview deltas */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>
            {selectedItem ? `Preview: ${selectedItem.name}` : 'Effective Stats'}
          </Text>
          <View style={styles.statsGrid}>
            {STAT_DISPLAY.map(({ key, label }) => {
              const value = currentResolved[key];
              const delta = previewDelta?.[key] ?? 0;
              return (
                <View key={key} style={styles.statRow}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={styles.statValue}>{value}</Text>
                  {delta !== 0 && (
                    <Text style={[styles.statDelta, delta > 0 ? styles.deltaUp : styles.deltaDown]}>
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.ctRow}>
            <Text style={styles.ctLabel}>CT Reduction</Text>
            <Text style={styles.ctValue}>{Math.round(currentCtReduction * 100)}%</Text>
            {previewCtReduction != null && previewCtReduction !== currentCtReduction && (
              <Text
                style={[
                  styles.statDelta,
                  previewCtReduction > currentCtReduction ? styles.deltaUp : styles.deltaDown,
                ]}
              >
                → {Math.round(previewCtReduction * 100)}%
              </Text>
            )}
            <Text style={styles.ctCap}>(cap {Math.round(GEAR_CT_REDUCTION_CAP * 100)}%)</Text>
          </View>
        </View>

        {/* Slot sections */}
        {ITEM_SLOTS.map(slot => {
          const equipped = equippedBySlot[slot];
          const owned = inventoryBySlot[slot];
          return (
            <View key={slot} style={styles.slotSection}>
              <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>

              {/* Currently equipped row */}
              <View style={[styles.itemRow, styles.equippedRow]}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>
                    {equipped?.name ?? <Text style={styles.emptySlotText}>(empty)</Text>}
                  </Text>
                  {equipped?.description && (
                    <Text style={styles.itemDesc}>{equipped.description}</Text>
                  )}
                </View>
                {equipped && (
                  <Pressable
                    style={styles.unequipBtn}
                    onPress={() => handleUnequip(slot)}
                    disabled={busy}
                  >
                    <Text style={styles.unequipBtnText}>Unequip</Text>
                  </Pressable>
                )}
              </View>

              {/* Owned (not equipped) */}
              {owned.length > 0 && (
                <View style={styles.ownedList}>
                  {owned.map(item => {
                    const isSelected = item.id === selectedId;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                        onPress={() => setSelectedId(isSelected ? null : item.id)}
                      >
                        <View style={styles.itemMain}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemDesc}>{item.description}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky equip confirmation footer */}
      {selectedItem && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable
            style={[styles.equipBtn, busy && styles.equipBtnDisabled]}
            onPress={handleEquip}
            disabled={busy}
          >
            <Text style={styles.equipBtnText}>
              Equip {selectedItem.name}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statRow: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    width: 36,
  },
  statValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
    minWidth: 28,
  },
  statDelta: {
    fontSize: 12,
    fontWeight: '700',
  },
  deltaUp: { color: '#4CAF50' },
  deltaDown: { color: '#E53935' },

  ctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  ctLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  ctValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
  },
  ctCap: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  slotSection: {
    marginBottom: Spacing.md,
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  equippedRow: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  itemRowSelected: {
    borderColor: Colors.primary,
  },
  itemMain: { flex: 1 },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySlotText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ownedList: {},

  unequipBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  unequipBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  equipBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  equipBtnDisabled: { opacity: 0.5 },
  equipBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
