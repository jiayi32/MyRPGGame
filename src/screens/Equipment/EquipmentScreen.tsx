import { useState } from 'react';
import {
  Alert,
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
  const credits = usePlayerStore((state) => state.credits);
  const { bySlot, equippedBySlot, instances, loading, error, equip, unequip, temper, dismantle } =
    useGearInventory();
  const [busyInstanceId, setBusyInstanceId] = useState<string | null>(null);
  const [temperBusyInstanceId, setTemperBusyInstanceId] = useState<string | null>(null);
  const [temperFeedback, setTemperFeedback] = useState<string | null>(null);
  const [dismantleBusyId, setDismantleBusyId] = useState<string | null>(null);

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

  const handleTemper = (instanceId: string) => {
    setTemperBusyInstanceId(instanceId);
    setTemperFeedback(null);
    temper(instanceId)
      .then((result) => {
        if (result.success) {
          setTemperFeedback(
            `Temper successful! +${result.newLevel}  (${result.goldSpent}g spent)`,
          );
        } else {
          setTemperFeedback(
            `Temper failed — lost ${result.goldSpent}g. Try again!`,
          );
        }
      })
      .catch((err) => {
        setTemperFeedback(err instanceof Error ? err.message : 'Temper failed');
      })
      .finally(() => {
        setTemperBusyInstanceId(null);
      });
  };

  const handleDismantle = (instanceId: string) => {
    const inst = instances.find((i) => i.instanceId === instanceId);
    const name = inst?.resolved?.name ?? instanceId;
    Alert.alert(
      'Dismantle Gear',
      `Break down "${name}" for scrap and components? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismantle',
          style: 'destructive',
          onPress: () => {
            setDismantleBusyId(instanceId);
            dismantle(instanceId)
              .then((yield_) => {
                Alert.alert(
                  'Dismantled!',
                  `+${yield_.scrap} scrap${yield_.quantumCores > 0 ? `, +${yield_.quantumCores} quantum cores` : ''}${yield_.credits > 0 ? `, +${yield_.credits} credits` : ''}`,
                );
              })
              .catch((err) => {
                Alert.alert('Error', err instanceof Error ? err.message : 'Dismantle failed');
              })
              .finally(() => setDismantleBusyId(null));
          },
        },
      ],
    );
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
        <Text style={styles.goldLabel}>Credits: {credits}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error !== null && <Text style={styles.error}>{error}</Text>}
        {temperFeedback !== null && (
          <Text style={temperFeedback.startsWith('Temper successful') ? styles.temperSuccess : styles.temperFailure}>
            {temperFeedback}
          </Text>
        )}
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
              onTemper={handleTemper}
              onDismantle={handleDismantle}
              busyInstanceId={busyInstanceId}
              temperBusyInstanceId={temperBusyInstanceId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.1)',
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#aabbcc' },
  goldLabel: { fontSize: 13, color: '#ffb000', fontWeight: '700' },
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
    borderColor: 'rgba(0,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    alignItems: 'center',
  },
  loadingText: { fontSize: 14, color: '#889999' },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  emptyHint: { fontSize: 13, color: '#889999', textAlign: 'center', lineHeight: 18 },
  temperSuccess: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 10,
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  temperFailure: {
    backgroundColor: '#fde8e8',
    borderRadius: 8,
    padding: 10,
    color: '#8b1a1a',
    fontSize: 13,
  },
});
