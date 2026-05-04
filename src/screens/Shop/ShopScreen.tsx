import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { type ShopOffer } from '@/features/run/types';
import { buyGear, formatCallableError, getShopOffer } from '@/services/runApi';
import { usePlayerStore } from '@/stores';
import { OfferRow } from './OfferRow';

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
});
