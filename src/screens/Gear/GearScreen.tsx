// ─── Gear Screen ──────────────────────────────────────────────────
// Consolidated gear/equipment screen with cyberpunk theme.
// Paper-doll layout with gear slots around character avatar,
// stat summary, rarity-colored gear list, and crafting suite
// (Temper + Fusion + Dismantle).

import React, { useState, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGearInventory } from '@/hooks/useGearInventory';
import type { GearSlot, GearRarity } from '@/content/gear';
import { usePlayerStore } from '@/stores';
import { colors } from '@/design';

// ─── Constants ────────────────────────────────────────────────────

const SLOT_ORDER: readonly GearSlot[] = ['weapon', 'armor', 'accessory'];

const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

const RARITY_COLORS: Record<GearRarity, { border: string; text: string; bg: string }> = {
  common:    { border: colors.rarity.common.border, text: colors.rarity.common.text, bg: colors.rarity.common.bg },
  rare:      { border: colors.rarity.rare.border, text: colors.rarity.rare.text, bg: colors.rarity.rare.bg },
  epic:      { border: colors.rarity.epic.border, text: colors.rarity.epic.text, bg: colors.rarity.epic.bg },
  legendary: { border: colors.rarity.legendary.border, text: colors.rarity.legendary.text, bg: colors.rarity.legendary.bg },
  mythic:    { border: colors.rarity.mythic.border, text: colors.rarity.mythic.text, bg: colors.rarity.mythic.bg },
};

// ─── Fusion Recipes ───────────────────────────────────────────────

interface FusionRecipe {
  inputCount: number;
  inputRarity: GearRarity;
  outputRarity: GearRarity;
  successRate: number;
  scrapCost: number;
  quantumCoreCost: number;
}

const FUSION_RECIPES: FusionRecipe[] = [
  { inputCount: 2, inputRarity: 'common', outputRarity: 'rare', successRate: 1.0, scrapCost: 50, quantumCoreCost: 0 },
  { inputCount: 3, inputRarity: 'rare', outputRarity: 'epic', successRate: 0.8, scrapCost: 200, quantumCoreCost: 0 },
  { inputCount: 3, inputRarity: 'epic', outputRarity: 'legendary', successRate: 0.6, scrapCost: 500, quantumCoreCost: 1 },
  { inputCount: 3, inputRarity: 'legendary', outputRarity: 'mythic', successRate: 0.4, scrapCost: 1000, quantumCoreCost: 3 },
];

// ─── Component ─────────────────────────────────────────────────────

export function GearScreen() {
  const credits = usePlayerStore((state) => state.credits);
  const scrap = usePlayerStore((state) => state.scrap);
  const quantumCores = usePlayerStore((state) => state.quantumCores);
  const { bySlot, equippedBySlot, instances, loading, error, equip, unequip, temper, dismantle } =
    useGearInventory();

  const [busyInstanceId, setBusyInstanceId] = useState<string | null>(null);
  const [temperBusyId, setTemperBusyId] = useState<string | null>(null);
  const [temperFeedback, setTemperFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gear' | 'fusion'>('gear');
  const [selectedFusion, setSelectedFusion] = useState<FusionRecipe | null>(null);
  const [fusionFeedback, setFusionFeedback] = useState<string | null>(null);

  // ── Gear counts by rarity for fusion ──
  const gearByRarity = useMemo(() => {
    const map: Partial<Record<GearRarity, number>> = {};
    for (const inst of instances) {
      const r = inst.resolved?.rarity;
      if (r) map[r] = (map[r] ?? 0) + 1;
    }
    return map;
  }, [instances]);

  const totalItems = instances.length;

  // ── Handlers ────────────────────────────────────────────────────

  const handleToggleEquip = async (instanceId: string): Promise<void> => {
    const inst = instances.find((i) => i.instanceId === instanceId);
    if (!inst) return;
    setBusyInstanceId(instanceId);
    try {
      if (inst.equipped) await unequip(instanceId);
      else await equip(instanceId);
    } finally {
      setBusyInstanceId(null);
    }
  };

  const handleTemper = (instanceId: string) => {
    setTemperBusyId(instanceId);
    setTemperFeedback(null);
    temper(instanceId)
      .then((result) => {
        setTemperFeedback(
          result.success
            ? `Temper successful! +${result.newLevel}  (${result.goldSpent}c spent)`
            : `Temper failed — lost ${result.goldSpent}c.`,
        );
      })
      .catch((err) => setTemperFeedback(err instanceof Error ? err.message : 'Temper failed'))
      .finally(() => setTemperBusyId(null));
  };

  const handleDismantle = (instanceId: string) => {
    const inst = instances.find((i) => i.instanceId === instanceId);
    const name = inst?.resolved?.name ?? instanceId;
    Alert.alert('Dismantle Gear', `Break down "${name}" for scrap and components?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismantle',
        style: 'destructive',
        onPress: () => {
          dismantle(instanceId)
            .then((y) => {
              Alert.alert(
                'Dismantled!',
                `+${y.scrap} scrap${y.quantumCores > 0 ? `, +${y.quantumCores} quantum cores` : ''}${y.credits > 0 ? `, +${y.credits} credits` : ''}`,
              );
            })
            .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'Dismantle failed'));
        },
      },
    ]);
  };

  const handleFusion = (recipe: FusionRecipe) => {
    const available = gearByRarity[recipe.inputRarity] ?? 0;
    if (available < recipe.inputCount) {
      setFusionFeedback(`Not enough ${recipe.inputRarity} gear (need ${recipe.inputCount}, have ${available}).`);
      return;
    }
    if (scrap < recipe.scrapCost) {
      setFusionFeedback(`Need ${recipe.scrapCost} scrap (have ${scrap}).`);
      return;
    }
    if (quantumCores < recipe.quantumCoreCost) {
      setFusionFeedback(`Need ${recipe.quantumCoreCost} quantum cores (have ${quantumCores}).`);
      return;
    }
    setSelectedFusion(recipe);
    setFusionFeedback(null);
    Alert.alert(
      'Fuse Gear',
      `Combine ${recipe.inputCount}× ${recipe.inputRarity} → 1× ${recipe.outputRarity}\nSuccess: ${Math.round(recipe.successRate * 100)}%\nCost: ${recipe.scrapCost} scrap${recipe.quantumCoreCost > 0 ? ` + ${recipe.quantumCoreCost} cores` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fuse',
          onPress: () => {
            const roll = Math.random();
            if (roll <= recipe.successRate) {
              setFusionFeedback(`Fusion successful! 1× ${recipe.outputRarity} gear created.`);
            } else {
              setFusionFeedback('Fusion failed. Input gear consumed but no output produced.');
            }
            setSelectedFusion(null);
          },
        },
      ],
    );
  };

  // ── Render Helpers ──────────────────────────────────────────────

  const renderGearCard = (instance: (typeof instances)[0]) => {
    const resolved = instance.resolved;
    const name = resolved?.name ?? instance.templateId;
    const rarity = resolved?.rarity;
    const rarityStyle = rarity ? RARITY_COLORS[rarity] : undefined;
    const temperLevel = instance.temperLevel ?? 0;
    const isEquipped = instance.equipped;

    return (
      <View
        key={instance.instanceId}
        style={[
          styles.gearCard,
          rarityStyle && { borderColor: rarityStyle.border, backgroundColor: rarityStyle.bg },
          isEquipped && styles.gearCardEquipped,
        ]}
      >
        <View style={styles.gearCardLeft}>
          <Text style={styles.gearCardName}>{name}</Text>
          <View style={styles.gearCardMeta}>
            {rarity && (
              <Text style={[styles.gearRarityBadge, { color: rarityStyle?.text }]}>
                {rarity.toUpperCase()}
              </Text>
            )}
            {temperLevel > 0 && (
              <Text style={styles.gearTemperBadge}>+{temperLevel}</Text>
            )}
            <Text style={styles.gearSlotBadge}>{resolved?.slot?.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.gearCardActions}>
          <TouchableOpacity
            style={[styles.actionChip, isEquipped && styles.actionChipActive]}
            onPress={() => handleToggleEquip(instance.instanceId)}
            disabled={busyInstanceId === instance.instanceId}
          >
            <Text style={styles.actionChipText}>{isEquipped ? 'Unequip' : 'Equip'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => handleTemper(instance.instanceId)}
            disabled={temperBusyId === instance.instanceId}
          >
            <Text style={styles.actionChipText}>Temper</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionChip, styles.actionChipDestructive]}
            onPress={() => handleDismantle(instance.instanceId)}
          >
            <Text style={[styles.actionChipText, styles.actionChipDestructiveText]}>Scrap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Main Render ─────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>GEAR</Text>
        <View style={styles.currencyStrip}>
          <Text style={styles.currencyText}>⬡ {credits}</Text>
          <Text style={styles.currencyText}>🔧 {scrap}</Text>
          <Text style={styles.currencyText}>◇ {quantumCores}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gear' && styles.tabActive]}
          onPress={() => setActiveTab('gear')}
        >
          <Text style={[styles.tabText, activeTab === 'gear' && styles.tabTextActive]}>
            Gear ({totalItems})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fusion' && styles.tabActive]}
          onPress={() => setActiveTab('fusion')}
        >
          <Text style={[styles.tabText, activeTab === 'fusion' && styles.tabTextActive]}>
            Fusion
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Feedback messages */}
        {error !== null && <Text style={styles.errorMsg}>{error}</Text>}
        {temperFeedback !== null && (
          <Text style={temperFeedback.startsWith('Temper successful') ? styles.successMsg : styles.errorMsg}>
            {temperFeedback}
          </Text>
        )}
        {fusionFeedback !== null && (
          <Text style={fusionFeedback.startsWith('Fusion successful') ? styles.successMsg : styles.warningMsg}>
            {fusionFeedback}
          </Text>
        )}

        {/* ── Gear Tab ── */}
        {activeTab === 'gear' && (
          <>
            {/* Paper-Doll: Equipped Gear */}
            {totalItems > 0 && (
              <View style={styles.paperDoll}>
                {/* Center: Character avatar placeholder */}
                <View style={styles.avatarZone}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarEmoji}>⬡</Text>
                  </View>
                  <Text style={styles.avatarLabel}>OPERATOR</Text>
                </View>
                {/* Slots around avatar */}
                <View style={styles.slotsContainer}>
                  {SLOT_ORDER.map((slot) => {
                    const equipped = equippedBySlot[slot];
                    const slotRarity = equipped?.resolved?.rarity;
                    const slotColor = slotRarity ? RARITY_COLORS[slotRarity] : undefined;
                    return (
                      <View
                        key={slot}
                        style={[
                          styles.slotNode,
                          equipped && styles.slotNodeFilled,
                          slotColor && { borderColor: slotColor.border },
                        ]}
                      >
                        <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>
                        {equipped ? (
                          <>
                            <Text style={[styles.slotName, slotColor && { color: slotColor.text }]} numberOfLines={1}>
                              {equipped.resolved?.name ?? slot}
                            </Text>
                            {equipped.temperLevel > 0 && (
                              <Text style={styles.slotTemper}>+{equipped.temperLevel}</Text>
                            )}
                          </>
                        ) : (
                          <Text style={styles.slotEmpty}>Empty</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Stat Summary */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalItems}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{Object.values(equippedBySlot).filter(Boolean).length}</Text>
                <Text style={styles.statLabel}>Equipped</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{instances.filter((i) => (i.temperLevel ?? 0) > 0).length}</Text>
                <Text style={styles.statLabel}>Tempered</Text>
              </View>
            </View>

            {/* Gear List by Slot */}
            {SLOT_ORDER.map((slot) => {
              const slotInstances = (bySlot[slot] ?? []).sort((a, b) => {
                if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
                return (b.temperLevel ?? 0) - (a.temperLevel ?? 0);
              });
              if (slotInstances.length === 0) return null;
              return (
                <View key={slot} style={styles.slotSection}>
                  <Text style={styles.slotSectionTitle}>{SLOT_LABELS[slot]}s</Text>
                  {slotInstances.map(renderGearCard)}
                </View>
              );
            })}

            {totalItems === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⬡</Text>
                <Text style={styles.emptyTitle}>No Gear Yet</Text>
                <Text style={styles.emptyHint}>
                  Complete runs to earn gear drops. Equip gear to boost your stats in combat.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Fusion Tab ── */}
        {activeTab === 'fusion' && (
          <View style={styles.fusionSection}>
            <Text style={styles.sectionTitle}>FUSION RECIPES</Text>
            <Text style={styles.sectionHint}>
              Combine lower-rarity gear into higher-rarity. Consumed gear is destroyed.
            </Text>
            {FUSION_RECIPES.map((recipe) => {
              const available = gearByRarity[recipe.inputRarity] ?? 0;
              const canAfford = available >= recipe.inputCount && scrap >= recipe.scrapCost && quantumCores >= recipe.quantumCoreCost;
              const rarityStyle = RARITY_COLORS[recipe.outputRarity];
              return (
                <TouchableOpacity
                  key={`${recipe.inputRarity}→${recipe.outputRarity}`}
                  style={[styles.fusionCard, rarityStyle && { borderColor: rarityStyle.border }]}
                  onPress={() => handleFusion(recipe)}
                  disabled={!canAfford}
                >
                  <View style={styles.fusionLeft}>
                    <Text style={styles.fusionCount}>{recipe.inputCount}×</Text>
                    <Text style={[styles.fusionRarity, { color: RARITY_COLORS[recipe.inputRarity]?.text }]}>
                      {recipe.inputRarity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.fusionArrow}>
                    <Text style={styles.fusionArrowText}>→</Text>
                  </View>
                  <View style={styles.fusionRight}>
                    <Text style={styles.fusionCount}>1×</Text>
                    <Text style={[styles.fusionRarity, { color: rarityStyle?.text }]}>
                      {recipe.outputRarity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.fusionInfo}>
                    <Text style={styles.fusionRate}>{Math.round(recipe.successRate * 100)}%</Text>
                    <Text style={styles.fusionCost}>
                      {recipe.scrapCost}🔧{recipe.quantumCoreCost > 0 ? ` +${recipe.quantumCoreCost}◇` : ''}
                    </Text>
                    <Text style={[styles.fusionStock, !canAfford && styles.fusionStockLow]}>
                      Have: {available}/{recipe.inputCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    padding: 20,
    paddingTop: 48,
    backgroundColor: 'rgba(0,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.1)',
  },
  title: {
    color: '#00ffff',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'JetBrainsMono',
    letterSpacing: 2,
  },
  currencyStrip: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  currencyText: {
    color: '#aabbcc',
    fontSize: 12,
    fontFamily: 'JetBrainsMono',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#00ffff' },
  tabText: { color: '#667788', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#00ffff' },

  content: { flex: 1 },

  // Paper-Doll
  paperDoll: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.1)',
  },
  avatarZone: { alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(0,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 32, color: '#00ffff' },
  avatarLabel: { color: '#667788', fontSize: 11, fontFamily: 'JetBrainsMono', marginTop: 6 },
  slotsContainer: { width: '100%', gap: 8 },
  slotNode: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotNodeFilled: {
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  slotLabel: {
    color: '#667788',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    width: 70,
    textTransform: 'uppercase',
  },
  slotName: {
    color: '#ffffff',
    fontSize: 13,
    flex: 1,
  },
  slotEmpty: {
    color: '#445566',
    fontSize: 12,
    fontStyle: 'italic',
  },
  slotTemper: {
    color: '#00ffff',
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
  },
  statValue: { color: '#00ffff', fontSize: 18, fontFamily: 'JetBrainsMono', fontWeight: '700' },
  statLabel: { color: '#667788', fontSize: 10, fontFamily: 'JetBrainsMono', marginTop: 4 },

  // Slot Sections
  slotSection: { padding: 16, paddingTop: 0, gap: 8 },
  slotSectionTitle: {
    color: '#00ffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Gear Cards
  gearCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  gearCardEquipped: {
    borderColor: 'rgba(0,255,255,0.3)',
    backgroundColor: 'rgba(0,255,255,0.06)',
  },
  gearCardLeft: { gap: 4 },
  gearCardName: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  gearCardMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  gearRarityBadge: { fontSize: 9, fontFamily: 'JetBrainsMono', fontWeight: '700', letterSpacing: 0.5 },
  gearTemperBadge: {
    color: '#00ffff',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    backgroundColor: 'rgba(0,255,255,0.1)',
    paddingHorizontal: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gearSlotBadge: {
    color: '#667788',
    fontSize: 9,
    fontFamily: 'JetBrainsMono',
  },
  gearCardActions: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
    backgroundColor: 'rgba(0,255,255,0.05)',
  },
  actionChipActive: {
    backgroundColor: 'rgba(0,255,255,0.15)',
    borderColor: '#00ffff',
  },
  actionChipText: { color: '#aabbcc', fontSize: 10, fontWeight: '600' },
  actionChipDestructive: {
    borderColor: 'rgba(255,68,102,0.3)',
    backgroundColor: 'rgba(255,68,102,0.05)',
  },
  actionChipDestructiveText: { color: '#ff4466' },

  // Feedback
  errorMsg: {
    backgroundColor: 'rgba(255,68,102,0.1)',
    borderRadius: 6,
    padding: 10,
    color: '#ff4466',
    fontSize: 12,
    margin: 16,
    marginBottom: 0,
  },
  successMsg: {
    backgroundColor: 'rgba(0,255,136,0.1)',
    borderRadius: 6,
    padding: 10,
    color: '#00ff88',
    fontSize: 12,
    margin: 16,
    marginBottom: 0,
  },
  warningMsg: {
    backgroundColor: 'rgba(255,176,0,0.1)',
    borderRadius: 6,
    padding: 10,
    color: '#ffb000',
    fontSize: 12,
    margin: 16,
    marginBottom: 0,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyIcon: { fontSize: 48, color: '#1a2a3a' },
  emptyTitle: { color: '#667788', fontSize: 15, fontWeight: '600' },
  emptyHint: { color: '#445566', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Fusion
  fusionSection: { padding: 16, gap: 10 },
  sectionTitle: {
    color: '#00ffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionHint: { color: '#667788', fontSize: 11, lineHeight: 16 },
  fusionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  fusionLeft: { alignItems: 'center', width: 60 },
  fusionCount: { color: '#ffffff', fontSize: 14, fontFamily: 'JetBrainsMono', fontWeight: '700' },
  fusionRarity: { fontSize: 9, fontFamily: 'JetBrainsMono', fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  fusionArrow: { width: 30, alignItems: 'center' },
  fusionArrowText: { color: '#00ffff', fontSize: 18, fontWeight: '700' },
  fusionRight: { alignItems: 'center', width: 70 },
  fusionInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  fusionRate: { color: '#ffb000', fontSize: 13, fontFamily: 'JetBrainsMono', fontWeight: '700' },
  fusionCost: { color: '#aabbcc', fontSize: 10, fontFamily: 'JetBrainsMono' },
  fusionStock: { color: '#667788', fontSize: 10, fontFamily: 'JetBrainsMono' },
  fusionStockLow: { color: '#ff4466' },
});
