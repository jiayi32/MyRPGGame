import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { lookupGearTemplate, type GearRarity } from '@/content/gear';
import type { ShopOffer } from '@/features/run/types';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: '#889999',
  rare: '#4488ff',
  epic: '#cc44ff',
  legendary: '#ffaa00',
  mythic: '#ff4466',
};

export function OfferRow({
  offer,
  canAfford,
  buying,
  onBuy,
}: {
  offer: ShopOffer;
  canAfford: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const resolved = lookupGearTemplate(offer.templateId);
  const title = resolved?.name ?? offer.templateId;
  const rarity = resolved?.rarity;
  const rarityColor = rarity ? RARITY_COLORS[rarity] : undefined;
  const subtitle = resolved ? `${resolved.slot.toUpperCase()}  T${resolved.tier}` : 'Unknown template';

  const baseStats =
    resolved?.source === 'unique'
      ? resolved.item?.baseStats
      : resolved?.template?.baseStatsHint;
  const STAT_LABELS: Record<string, string> = {
    strength: 'STR', intellect: 'INT', constitution: 'CON', dexterity: 'DEX',
  };
  const statSummary =
    baseStats && typeof baseStats === 'object'
      ? Object.entries(baseStats)
          .filter(([, v]) => typeof v === 'number' && (v as number) !== 0)
          .map(([k, v]) => `${STAT_LABELS[k] ?? k.toUpperCase()} +${Math.round(v as number)}`)
          .join('  ')
      : null;

  const passiveText =
    resolved?.source === 'unique' && resolved.item?.passives?.[0]
      ? resolved.item.passives[0].effect
      : null;

  return (
    <View style={[styles.offerRow, rarity === 'mythic' && styles.offerRowMythic]}>
      <View style={styles.offerLeft}>
        <View style={styles.offerNameRow}>
          <Text style={styles.offerTitle}>{title}</Text>
          {rarity !== undefined && (
            <Text style={[styles.offerRarity, { color: rarityColor }]}>{rarity.toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.offerSubtitle}>{subtitle}</Text>
        {statSummary !== null && <Text style={styles.offerStats}>{statSummary}</Text>}
        {passiveText !== null && <Text style={styles.offerPassive}>{passiveText}</Text>}
      </View>
      <View style={styles.offerRight}>
        <Text style={styles.offerPrice}>{offer.priceGold}c</Text>
        <TouchableOpacity
          style={[
            styles.buyBtn,
            !canAfford && styles.buyBtnDisabled,
            buying && styles.buyBtnBusy,
          ]}
          disabled={!canAfford || buying}
          onPress={onBuy}
        >
          <Text style={styles.buyBtnText}>{buying ? 'Buying...' : canAfford ? 'Buy' : 'Too Poor'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offerRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  offerRowMythic: {
    borderColor: 'rgba(255,68,102,0.4)',
    backgroundColor: 'rgba(255,68,102,0.06)',
  },
  offerLeft: { flex: 1, gap: 2 },
  offerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offerTitle: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  offerRarity: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, fontFamily: 'JetBrainsMono' },
  offerSubtitle: { fontSize: 11, color: '#667788', fontFamily: 'JetBrainsMono' },
  offerStats: { fontSize: 11, color: '#aabbcc', marginTop: 1, fontFamily: 'JetBrainsMono' },
  offerPassive: { fontSize: 11, color: '#889999', fontStyle: 'italic', marginTop: 1 },
  offerRight: { alignItems: 'flex-end', gap: 5 },
  offerPrice: { fontSize: 13, color: '#ffb000', fontWeight: '700', fontFamily: 'JetBrainsMono' },
  buyBtn: {
    borderRadius: 5,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' },
  buyBtnBusy: { opacity: 0.5 },
  buyBtnText: { fontSize: 12, fontWeight: '600', color: '#00ffff' },
});
