import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { lookupGearTemplate, type GearRarity } from '@/content/gear';
import { type ShopOffer } from '@/features/run/types';
import { buyGear, formatCallableError, getShopOffer } from '@/services/runApi';
import { usePlayerStore } from '@/stores';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: '#6e6e6e',
  rare: '#2e7ad8',
  epic: '#9a2bd8',
  legendary: '#c87f1e',
  mythic: '#c81e3a',
};

function OfferRow({
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
        <Text style={styles.offerPrice}>{offer.priceGold}g</Text>
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

export function ShopScreen() {
  const goldBank = usePlayerStore((state) => state.goldBank);
  const applyPlayerSnapshot = usePlayerStore((state) => state.applyPlayerSnapshot);

  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getShopOffer()
      .then((res) => {
        if (!mounted) return;
        setOffers(res.offers);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(formatCallableError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sortedOffers = useMemo(
    () => [...offers].sort((a, b) => a.priceGold - b.priceGold || a.templateId.localeCompare(b.templateId)),
    [offers],
  );

  const handleBuy = async (offer: ShopOffer): Promise<void> => {
    setBusyTemplateId(offer.templateId);
    setError(null);
    try {
      const response = await buyGear({ templateId: offer.templateId });
      applyPlayerSnapshot(response.player);
      setStatusText(`Purchased ${offer.templateId} for ${response.goldSpent}g.`);
    } catch (err) {
      setError(formatCallableError(err));
    } finally {
      setBusyTemplateId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <Text style={styles.subtitle}>Spend gold on baseline gear for test builds.</Text>
        <Text style={styles.wallet}>Gold: {goldBank}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error !== null && <Text style={styles.error}>{error}</Text>}
        {statusText !== null && <Text style={styles.status}>{statusText}</Text>}

        {loading ? (
          <View style={styles.card}><Text style={styles.cardText}>Loading offers...</Text></View>
        ) : sortedOffers.length === 0 ? (
          <View style={styles.card}><Text style={styles.cardText}>No offers available.</Text></View>
        ) : (
          sortedOffers.map((offer) => (
            <OfferRow
              key={offer.templateId}
              offer={offer}
              canAfford={goldBank >= offer.priceGold}
              buying={busyTemplateId === offer.templateId}
              onBuy={() => {
                handleBuy(offer).catch(() => undefined);
              }}
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
  wallet: { fontSize: 13, color: '#7a3b00', fontWeight: '700' },
  content: { padding: 16, gap: 10 },
  error: {
    backgroundColor: '#fde8e8',
    borderRadius: 8,
    padding: 10,
    color: '#8b1a1a',
    fontSize: 13,
  },
  status: {
    backgroundColor: '#ebf8ee',
    borderRadius: 8,
    padding: 10,
    color: '#1e6a35',
    fontSize: 13,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 16,
  },
  cardText: { fontSize: 13, color: '#5d4d35' },
  offerRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offerRowMythic: {
    borderColor: '#c81e3a',
    backgroundColor: '#fff8f9',
  },
  offerLeft: { flex: 1, gap: 2 },
  offerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offerTitle: { fontSize: 14, fontWeight: '600', color: '#2b1f10' },
  offerRarity: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  offerSubtitle: { fontSize: 12, color: '#7b684a' },
  offerStats: { fontSize: 11, color: '#5d4d35', marginTop: 1 },
  offerPassive: { fontSize: 11, color: '#7b684a', fontStyle: 'italic', marginTop: 1 },
  offerRight: { alignItems: 'flex-end', gap: 5 },
  offerPrice: { fontSize: 13, color: '#7a3b00', fontWeight: '700' },
  buyBtn: {
    borderRadius: 6,
    backgroundColor: '#7a3b00',
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  buyBtnDisabled: { backgroundColor: '#b9ab96' },
  buyBtnBusy: { opacity: 0.7 },
  buyBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
});
