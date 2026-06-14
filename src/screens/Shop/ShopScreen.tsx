// ─── Shop Screen ──────────────────────────────────────────────────
// Cyberpunk-themed shop with three sections: Consumables, Gear, Upgrades.
// Inspired by reference image 3.

import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { type ShopOffer } from '@/features/run/types';
import { buyGear, formatCallableError, getShopOffer } from '@/services/runApi';
import { usePlayerStore } from '@/stores';
import { OfferRow } from './OfferRow';

type ShopTab = 'consumables' | 'gear' | 'upgrades';

export function ShopScreen() {
  const credits = usePlayerStore((state) => state.credits);
  const quantumCores = usePlayerStore((state) => state.quantumCores);
  const applyPlayerSnapshot = usePlayerStore((state) => state.applyPlayerSnapshot);

  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShopTab>('gear');

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
      setStatusText(`Purchased ${offer.templateId} for ${response.goldSpent}c.`);
    } catch (err) {
      setError(formatCallableError(err));
    } finally {
      setBusyTemplateId(null);
    }
  };

  const tabs: { key: ShopTab; label: string }[] = [
    { key: 'gear', label: 'GEAR' },
    { key: 'consumables', label: 'CONSUMABLES' },
    { key: 'upgrades', label: 'UPGRADES' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SHOP</Text>
        <View style={styles.currencyStrip}>
          <Text style={styles.currencyText}>⬡ {credits.toLocaleString()}</Text>
          <Text style={styles.currencyText}>◇ {quantumCores}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {error !== null && <Text style={styles.error}>{error}</Text>}
        {statusText !== null && <Text style={styles.status}>{statusText}</Text>}

        {activeTab === 'gear' && (
          <>
            {loading ? (
              <View style={styles.card}><Text style={styles.cardText}>Loading offers...</Text></View>
            ) : sortedOffers.length === 0 ? (
              <View style={styles.card}><Text style={styles.cardText}>No gear available. Check back later.</Text></View>
            ) : (
              sortedOffers.map((offer) => (
                <OfferRow
                  key={offer.templateId}
                  offer={offer}
                  canAfford={credits >= offer.priceGold}
                  buying={busyTemplateId === offer.templateId}
                  onBuy={() => { handleBuy(offer).catch(() => undefined); }}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'consumables' && (
          <View style={styles.placeholderSection}>
            <Text style={styles.placeholderIcon}>🧪</Text>
            <Text style={styles.placeholderTitle}>Stims & Consumables</Text>
            <Text style={styles.placeholderHint}>
              Combat stims, nano-repair patches, barrier injectors, and more.
              Coming in a future update — found as loot and purchasable here.
            </Text>
          </View>
        )}

        {activeTab === 'upgrades' && (
          <View style={styles.upgradesSection}>
            <Text style={styles.sectionTitle}>PERMANENT UPGRADES</Text>
            <Text style={styles.sectionHint}>One-time purchases that persist across all runs.</Text>
            {[
              { name: 'Inventory Expansion', desc: '+5 gear slots', cost: '500 ⬡', locked: false },
              { name: 'Fusion Success +5%', desc: 'Permanent fusion rate boost', cost: '1000 ⬡', locked: false },
              { name: 'Stim Capacity +1', desc: 'Carry one more consumable', cost: '300 ⬡ + 2 ◇', locked: false },
              { name: 'Scrap Collector', desc: '+20% scrap from dismantling', cost: '750 ⬡', locked: false },
              { name: 'Quantum Refinery', desc: 'Chance for extra cores when dismantling', cost: '5 ◇', locked: false },
            ].map((upgrade, i) => (
              <View key={i} style={styles.upgradeCard}>
                <View style={styles.upgradeLeft}>
                  <Text style={styles.upgradeName}>{upgrade.name}</Text>
                  <Text style={styles.upgradeDesc}>{upgrade.desc}</Text>
                </View>
                <TouchableOpacity style={styles.upgradeBuyBtn}>
                  <Text style={styles.upgradeBuyText}>{upgrade.cost}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    padding: 20,
    paddingTop: 48,
    backgroundColor: 'rgba(0,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.1)',
  },
  title: { color: '#00ffff', fontSize: 22, fontWeight: '700', fontFamily: 'JetBrainsMono', letterSpacing: 3 },
  currencyStrip: { flexDirection: 'row', gap: 16, marginTop: 8 },
  currencyText: { color: '#aabbcc', fontSize: 12, fontFamily: 'JetBrainsMono' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,255,255,0.15)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#00ffff' },
  tabText: { color: '#667788', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  tabTextActive: { color: '#00ffff' },
  content: { flex: 1, padding: 16 },
  error: { backgroundColor: 'rgba(255,68,102,0.1)', borderRadius: 6, padding: 10, color: '#ff4466', fontSize: 12, marginBottom: 10 },
  status: { backgroundColor: 'rgba(0,255,136,0.1)', borderRadius: 6, padding: 10, color: '#00ff88', fontSize: 12, marginBottom: 10 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, alignItems: 'center' },
  cardText: { color: '#667788', fontSize: 13 },
  placeholderSection: { alignItems: 'center', padding: 40, gap: 10 },
  placeholderIcon: { fontSize: 40 },
  placeholderTitle: { color: '#aabbcc', fontSize: 15, fontWeight: '600' },
  placeholderHint: { color: '#667788', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  upgradesSection: { gap: 10 },
  sectionTitle: { color: '#00ffff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  sectionHint: { color: '#667788', fontSize: 11, marginBottom: 4 },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,255,255,0.1)', borderRadius: 8, padding: 12, gap: 10 },
  upgradeLeft: { flex: 1, gap: 2 },
  upgradeName: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  upgradeDesc: { color: '#667788', fontSize: 11 },
  upgradeBuyBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(0,255,255,0.3)', backgroundColor: 'rgba(0,255,255,0.08)' },
  upgradeBuyText: { color: '#00ffff', fontSize: 11, fontWeight: '600', fontFamily: 'JetBrainsMono' },
});
