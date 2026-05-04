import { StyleSheet, Text, View } from 'react-native';
import type { GearInstance } from '@/hooks/useGearInventory';
import type { GearSlot } from '@/content/gear';
import { GearRow } from './GearRow';

const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};
const SLOT_ICONS: Record<GearSlot, string> = {
  weapon: '⚔',
  armor: '🛡',
  accessory: '💍',
};

export function SlotSection({
  slot,
  instances,
  equipped,
  onToggleEquip,
  busyInstanceId,
}: {
  slot: GearSlot;
  instances: GearInstance[];
  equipped: GearInstance | undefined;
  onToggleEquip: (instanceId: string) => Promise<void>;
  busyInstanceId: string | null;
}) {
  const sorted = [...instances].sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
    const ta = a.resolved?.tier ?? 0;
    const tb = b.resolved?.tier ?? 0;
    if (ta !== tb) return tb - ta;
    return a.templateId.localeCompare(b.templateId);
  });

  return (
    <View style={styles.slotSection}>
      <View style={styles.slotHeader}>
        <Text style={styles.slotIcon}>{SLOT_ICONS[slot]}</Text>
        <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>
        <Text style={styles.slotCount}>
          {instances.length} item{instances.length === 1 ? '' : 's'}
        </Text>
      </View>
      {equipped !== undefined && (
        <Text style={styles.equippedHint}>
          Equipped: {equipped.resolved?.name ?? equipped.templateId}
        </Text>
      )}
      {instances.length === 0 ? (
        <View style={styles.emptySlot}>
          <Text style={styles.emptySlotText}>No {SLOT_LABELS[slot].toLowerCase()} acquired yet.</Text>
        </View>
      ) : (
        sorted.map((inst) => (
          <GearRow
            key={inst.instanceId}
            instance={inst}
            busy={busyInstanceId === inst.instanceId}
            onToggleEquip={() => {
              onToggleEquip(inst.instanceId).catch(() => undefined);
            }}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slotSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 14,
    gap: 8,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotIcon: { fontSize: 20 },
  slotLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#2b1f10' },
  slotCount: { fontSize: 12, color: '#7b684a' },
  equippedHint: { fontSize: 12, color: '#1a5a2a', fontStyle: 'italic', marginTop: -4 },
  emptySlot: {
    borderRadius: 8,
    backgroundColor: '#f0ece4',
    padding: 10,
  },
  emptySlotText: { fontSize: 12, color: '#9e8870', fontStyle: 'italic' },
});
