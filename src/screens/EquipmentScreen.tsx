import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGearInventory, type GearInstance } from '@/hooks/useGearInventory';
import type { GearRarity, GearSlot } from '@/content/gear';
import { usePlayerStore } from '@/stores';

const SLOT_ORDER: readonly GearSlot[] = ['weapon', 'armor', 'accessory'];
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

const RARITY_COLORS: Record<GearRarity, string> = {
  common: '#6e6e6e',
  rare: '#2e7ad8',
  epic: '#9a2bd8',
  legendary: '#c87f1e',
  mythic: '#c81e3a',
};

const formatStatSummary = (instance: GearInstance): string | null => {
  const resolved = instance.resolved;
  if (resolved === undefined) return null;
  const baseStats =
    resolved.source === 'unique' ? resolved.item?.baseStats : resolved.template?.baseStatsHint;
  if (!baseStats || typeof baseStats !== 'object') return null;
  const labels: Record<string, string> = {
    strength: 'STR',
    intellect: 'INT',
    constitution: 'CON',
    dexterity: 'DEX',
  };
  const parts = Object.entries(baseStats)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value !== 0)
    .map(([key, value]) => `${labels[key] ?? key.toUpperCase()} +${Math.round(value)}`);
  return parts.length > 0 ? parts.join('  ') : null;
};

function GearRow({
  instance,
  onToggleEquip,
  busy,
}: {
  instance: GearInstance;
  onToggleEquip: () => void;
  busy: boolean;
}) {
  const resolved = instance.resolved;
  const name = resolved?.name ?? instance.templateId;
  const tier = resolved?.tier ?? '?';
  const rarity = resolved?.rarity;
  const rarityColor = rarity ? RARITY_COLORS[rarity] : '#888';
  const statSummary = formatStatSummary(instance);

  return (
    <View style={[styles.gearRow, instance.equipped && styles.gearRowEquipped]}>
      <View style={styles.gearRowLeft}>
        <View style={styles.gearNameRow}>
          <Text style={[styles.gearName, instance.equipped && styles.gearNameEquipped]}>
            {name}
          </Text>
          <View style={[styles.tierBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.tierBadgeText}>T{tier}</Text>
          </View>
        </View>
        {rarity !== undefined && (
          <Text style={[styles.rarityLabel, { color: rarityColor }]}>{rarity}</Text>
        )}
        {statSummary !== null && <Text style={styles.statSummary}>{statSummary}</Text>}
        {resolved === undefined && (
          <Text style={styles.unknownTemplate}>unknown template</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onToggleEquip}
        disabled={busy}
        style={[
          styles.equipBtn,
          instance.equipped ? styles.equipBtnEquipped : styles.equipBtnUnequipped,
          busy && styles.equipBtnBusy,
        ]}
      >
        <Text
          style={[
            styles.equipBtnText,
            instance.equipped && styles.equipBtnTextEquipped,
          ]}
        >
          {busy ? '…' : instance.equipped ? 'Unequip' : 'Equip'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SlotSection({
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
  // Sort: equipped first, then by tier desc, then templateId.
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
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e0d4',
    backgroundColor: '#fdfbf5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  gearRowEquipped: {
    borderColor: '#4a9a5a',
    backgroundColor: '#f0faf2',
  },
  gearRowLeft: { flex: 1, gap: 2 },
  gearNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gearName: { fontSize: 14, fontWeight: '600', color: '#2b1f10' },
  gearNameEquipped: { color: '#1a5a2a' },
  tierBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tierBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  rarityLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statSummary: { fontSize: 11, color: '#5d4d35', marginTop: 1 },
  unknownTemplate: { fontSize: 10, color: '#a04040', fontStyle: 'italic' },
  equipBtn: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: 'center',
  },
  equipBtnUnequipped: {
    backgroundColor: '#7a3b00',
  },
  equipBtnEquipped: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1a5a2a',
  },
  equipBtnBusy: { opacity: 0.5 },
  equipBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  equipBtnTextEquipped: { color: '#1a5a2a' },
});
