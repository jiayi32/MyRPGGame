import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { GearInstance } from '@/hooks/useGearInventory';
import type { GearRarity } from '@/content/gear';
import { computeTemperChance, computeTemperCost, formatTemperLevel } from '@/domain/run/temper';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: '#6e6e6e',
  rare: '#2e7ad8',
  epic: '#9a2bd8',
  legendary: '#c87f1e',
  mythic: '#c81e3a',
};

function formatStatSummary(instance: GearInstance): string | null {
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
}

export function GearRow({
  instance,
  onToggleEquip,
  onTemper,
  onDismantle,
  temperBusy,
  busy,
}: {
  instance: GearInstance;
  onToggleEquip: () => void;
  onTemper?: (() => void) | undefined;
  onDismantle?: (() => void) | undefined;
  temperBusy?: boolean;
  busy: boolean;
}) {
  const resolved = instance.resolved;
  const name = resolved?.name ?? instance.templateId;
  const tier = resolved?.tier ?? '?';
  const rarity = resolved?.rarity;
  const rarityColor = rarity ? RARITY_COLORS[rarity] : '#888';
  const statSummary = formatStatSummary(instance);
  const temperLevel = instance.temperLevel ?? 0;
  const hasTemper = onTemper !== undefined;
  const temperCost = computeTemperCost(temperLevel);
  const temperChance = computeTemperChance(temperLevel);
  const temperChancePct = Math.round(temperChance * 100);

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
          {temperLevel > 0 && (
            <View style={styles.temperBadge}>
              <Text style={styles.temperBadgeText}>{formatTemperLevel(temperLevel)}</Text>
            </View>
          )}
        </View>
        {rarity !== undefined && (
          <Text style={[styles.rarityLabel, { color: rarityColor }]}>{rarity}</Text>
        )}
        {statSummary !== null && <Text style={styles.statSummary}>{statSummary}</Text>}
        {resolved === undefined && (
          <Text style={styles.unknownTemplate}>unknown template</Text>
        )}
        {hasTemper && (
          <View style={styles.temperRow}>
            <Text style={styles.temperInfo}>
              Temper: {temperCost}g · {temperChancePct}% chance
            </Text>
            <TouchableOpacity
              onPress={onTemper}
              disabled={temperBusy}
              style={[styles.temperBtn, temperBusy && styles.temperBtnBusy]}
            >
              <Text style={styles.temperBtnText}>
                {temperBusy ? '…' : 'Temper'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {onDismantle !== undefined && !instance.equipped && (
          <View style={styles.dismantleRow}>
            <TouchableOpacity
              onPress={onDismantle}
              disabled={busy}
              style={[styles.dismantleBtn, busy && styles.dismantleBtnBusy]}
            >
              <Text style={styles.dismantleBtnText}>🔧 Dismantle</Text>
            </TouchableOpacity>
          </View>
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

const styles = StyleSheet.create({
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
  temperBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: '#e07b20',
  },
  temperBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  temperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  temperInfo: { fontSize: 10, color: '#7a5a30', flex: 1 },
  temperBtn: {
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#e07b20',
    minWidth: 56,
    alignItems: 'center',
  },
  temperBtnBusy: { opacity: 0.5 },
  dismantleRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dismantleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 100, 50, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200, 100, 50, 0.4)',
  },
  dismantleBtnBusy: { opacity: 0.5 },
  dismantleBtnText: {
    fontSize: 11,
    color: '#cc9966',
    fontWeight: '600',
  },
  temperBtnText: { fontSize: 11, color: '#fff', fontWeight: '600' },
});
