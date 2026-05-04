import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useGearInventory } from '@/hooks/useGearInventory';
import type { GearSlot } from '@/content/gear';
import { usePlayerStore } from '@/stores';
import { GearRow } from './GearRow';
import { SlotSection } from './SlotSection';

const SLOT_ORDER: readonly GearSlot[] = ['weapon', 'armor', 'accessory'];

export function EquipmentScreen() {
  const playerStatus = usePlayerStore((state) => state.status);
  const { bySlot, equippedBySlot, instances, loading, error, equip, unequip } =
    useGearInventory();
  const [busyInstanceId, setBusyInstanceId] = useState<string | null>(null);

  const handleToggleEquip = async (instanceId: string): Promise<void> => {
    const inst = instances.find((i) => i.instanceId === instanceId);
    if (inst === undefined) return;
    setBusyInstanceId(instanceId);
    try {
      if (inst.equipped) {
        await unequip(instanceId);
      } else {
        await equip(instanceId);
      }
    } finally {
      setBusyInstanceId(null);
    }
  };

  const isLoading = playerStatus !== 'ready' || loading;
  const totalItems = instances.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipment</Text>
        <Text style={styles.subtitle}>
          {totalItems === 0
            ? 'Gear acquired from completed runs'
            : `${totalItems} item${totalItems === 1 ? '' : 's'} in inventory`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error !== null && <Text style={styles.error}>{error}</Text>}
        {isLoading && instances.length === 0 ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : totalItems === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛡</Text>
            <Text style={styles.emptyTitle}>No gear yet</Text>
            <Text style={styles.emptyHint}>
              Win stages to earn gear drops. Equipped gear takes effect on the next run.
            </Text>
          </View>
        ) : (
          SLOT_ORDER.map((slot) => (
            <SlotSection
              key={slot}
              slot={slot}
              instances={bySlot[slot] ?? []}
              equipped={equippedBySlot[slot]}
              onToggleEquip={handleToggleEquip}
              busyInstanceId={busyInstanceId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4ef' },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d8cdbb',
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#2b1f10' },
  subtitle: { fontSize: 13, color: '#5d4d35' },
  content: { padding: 16, gap: 16 },
  error: {
    backgroundColor: '#fde8e8',
    borderRadius: 8,
    padding: 10,
    color: '#8b1a1a',
    fontSize: 13,
  },
  loadingCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 24,
    alignItems: 'center',
  },
  loadingText: { fontSize: 14, color: '#7b684a' },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#4a3a28' },
  emptyHint: { fontSize: 13, color: '#7b684a', textAlign: 'center', lineHeight: 18 },
});
