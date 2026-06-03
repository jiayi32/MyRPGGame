// ─── Character Screen ────────────────────────────────────────────
// Three-tab screen: Overview, Specializations, Corporations.
// Primary interface for managing active spec, unlocking new specs, and
// viewing corp progression ranks.

import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCharacterStore, tierForLevel } from '@/stores/characterStore';
import { SPECIALIZATIONS } from '@/content/specializations';
import { CORPORATIONS } from '@/content/corporations';
import type { ClassId } from '@/content/types';
import type { CorporationId } from '@/content/types/corporation';

// ─── Tabs ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'specs' | 'corps';

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'specs', label: 'Specs' },
  { key: 'corps', label: 'Corps' },
];

// ─── Helpers ───────────────────────────────────────────────────────

const SPEC_UNLOCK_COSTS: Record<number, number> = {
  1: 0,      // Starters are free (granted on creation)
  2: 50,     // techPoints
  3: 150,
  4: 400,
  5: 1000,
};

const TIER_MIN_LEVEL: Record<number, number> = {
  1: 1,
  2: 15,
  3: 30,
  4: 50,
  5: 75,
};

function canUnlockSpec(specId: ClassId, level: number, techPoints: number, unlockedIds: ClassId[]): { allowed: boolean; reason?: string } {
  const spec = SPECIALIZATIONS[specId];
  if (!spec) return { allowed: false, reason: 'Unknown specialization.' };
  if (unlockedIds.includes(specId)) return { allowed: false, reason: 'Already unlocked.' };

  const tier = spec.tier;
  if (level < (TIER_MIN_LEVEL[tier] ?? 1)) {
    return { allowed: false, reason: `Requires level ${TIER_MIN_LEVEL[tier]}.` };
  }

  // Tier 2+ requires previous tier unlocked
  if (tier > 1) {
    const prevTier = tier - 1;
    const hasPrevTier = unlockedIds.some((id) => {
      const s = SPECIALIZATIONS[id];
      return s?.lineageId === spec.lineageId && s.tier === prevTier;
    });
    if (!hasPrevTier) {
      return { allowed: false, reason: `Requires Tier ${prevTier} specialization unlocked first.` };
    }
  }

  const cost = SPEC_UNLOCK_COSTS[tier] ?? 100;
  if (techPoints < cost) {
    return { allowed: false, reason: `Need ${cost} tech points (have ${techPoints}).` };
  }

  return { allowed: true };
}

// ─── Component ─────────────────────────────────────────────────────

export const CharacterScreen: React.FC = () => {
  const {
    characterName,
    level,
    xp,
    tier,
    activeSpecId,
    unlockedSpecIds,
    corpRanks,
    currencies,
    setActiveSpec,
    unlockSpecialization,
  } = useCharacterStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const activeSpec = activeSpecId ? SPECIALIZATIONS[activeSpecId] : undefined;

  // XP progress to next level
  const xpForLevel = (lvl: number) => Math.floor(100 * Math.pow(lvl, 1.8) - 100);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpProgress = Math.min(1, Math.max(0, (xp - currentLevelXp) / (nextLevelXp - currentLevelXp)));

  // Specializations grouped by corp and tier
  const specsByCorp = useMemo(() => {
    const grouped: Record<string, { corpName: string; specs: typeof SPECIALIZATIONS[string][] }> = {};
    for (const spec of Object.values(SPECIALIZATIONS)) {
      const corp = CORPORATIONS[spec.lineageId];
      const corpName = corp?.name ?? spec.lineageId;
      if (!grouped[spec.lineageId]) {
        grouped[spec.lineageId] = { corpName, specs: [] };
      }
      grouped[spec.lineageId]!.specs.push(spec);
    }
    for (const group of Object.values(grouped)) {
      group.specs.sort((a, b) => a.tier - b.tier);
    }
    return grouped;
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.characterName}>{characterName}</Text>
        <Text style={styles.levelText}>Level {level} · Tier {tier}</Text>
        {/* XP Bar */}
        <View style={styles.xpBarOuter}>
          <View style={[styles.xpBarInner, { width: `${xpProgress * 100}%` }]} />
        </View>
        <Text style={styles.xpText}>{xp} / {nextLevelXp} XP</Text>
      </View>

      {/* ── Currency Strip ── */}
      <View style={styles.currencyStrip}>
        <Text style={styles.currency}>💰 {currencies.credits}</Text>
        <Text style={styles.currency}>⚡ {currencies.techPoints}</Text>
        <Text style={styles.currency}>🔧 {currencies.scrap}</Text>
        <Text style={styles.currency}>💎 {currencies.quantumCores}</Text>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {activeSpec ? (
              <View style={styles.activeSpecCard}>
                <Text style={styles.sectionTitle}>Active Specialization</Text>
                <Text style={styles.specName}>{activeSpec.name}</Text>
                <View style={styles.specMeta}>
                  <Text style={styles.specBadge}>{activeSpec.role}</Text>
                  <Text style={styles.specBadge}>CT: {activeSpec.ctProfile}</Text>
                  <Text style={styles.specBadge}>T{activeSpec.tier}</Text>
                </View>
                <Text style={styles.specDesc}>{activeSpec.description}</Text>
                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={() => setActiveTab('specs')}
                >
                  <Text style={styles.switchBtnText}>Switch Specialization →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No specialization selected.</Text>
                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={() => setActiveTab('specs')}
                >
                  <Text style={styles.switchBtnText}>Choose a Specialization →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Character Stats</Text>
              <Text style={styles.statRow}>Level: {level}</Text>
              <Text style={styles.statRow}>Tier Band: {tier}</Text>
              <Text style={styles.statRow}>Specs Unlocked: {unlockedSpecIds.length}</Text>
              <Text style={styles.statRow}>Corps Mastered: {Object.values(corpRanks).filter((r) => r >= 5).length}</Text>
            </View>
          </View>
        )}

        {/* ── Specializations Tab ── */}
        {activeTab === 'specs' && (
          <View style={styles.tabContent}>
            {Object.entries(specsByCorp).map(([corpId, group]) => (
              <View key={corpId} style={styles.corpSection}>
                <Text style={styles.corpSectionTitle}>{group.corpName}</Text>
                {group.specs.map((spec) => {
                  const isOwned = unlockedSpecIds.includes(spec.id);
                  const isActive = activeSpecId === spec.id;
                  const unlockCheck = canUnlockSpec(spec.id, level, currencies.techPoints, unlockedSpecIds);
                  return (
                    <View
                      key={spec.id}
                      style={[
                        styles.specCard,
                        isActive && styles.specCardActive,
                        isOwned && !isActive && styles.specCardOwned,
                      ]}
                    >
                      <View style={styles.specCardHeader}>
                        <Text style={styles.specCardName}>{spec.name}</Text>
                        <View style={styles.specCardBadges}>
                          <Text style={styles.specCardTier}>T{spec.tier}</Text>
                          <Text style={styles.specCardRole}>{spec.role}</Text>
                        </View>
                      </View>
                      <Text style={styles.specCardDesc} numberOfLines={2}>
                        {spec.description}
                      </Text>
                      <View style={styles.specCardActions}>
                        {isActive ? (
                          <Text style={styles.activeLabel}>✓ Active</Text>
                        ) : isOwned ? (
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => setActiveSpec(spec.id)}
                          >
                            <Text style={styles.actionBtnText}>Switch</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.unlockRow}>
                            <Text style={styles.unlockCost}>
                              {SPEC_UNLOCK_COSTS[spec.tier] ?? 100} ⚡
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                !unlockCheck.allowed && styles.actionBtnDisabled,
                              ]}
                              disabled={!unlockCheck.allowed}
                              onPress={() => {
                                const cost = SPEC_UNLOCK_COSTS[spec.tier] ?? 100;
                                unlockSpecialization(spec.id, cost);
                              }}
                            >
                              <Text style={styles.actionBtnText}>
                                {unlockCheck.allowed ? 'Unlock' : unlockCheck.reason}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ── Corporations Tab ── */}
        {activeTab === 'corps' && (
          <View style={styles.tabContent}>
            {Object.values(CORPORATIONS).map((corp) => {
              const rank = corpRanks[corp.id] ?? 0;
              return (
                <View key={corp.id} style={styles.corpCard}>
                  <View style={styles.corpCardHeader}>
                    <Text style={styles.corpCardName}>{corp.name}</Text>
                    <Text style={styles.corpRank}>Rank {rank}/10</Text>
                  </View>
                  <View style={styles.rankBarOuter}>
                    <View style={[styles.rankBarInner, { width: `${(rank / 10) * 100}%` }]} />
                  </View>
                  <Text style={styles.corpMechanic} numberOfLines={2}>
                    {corp.uniqueMechanic.shortDescription}
                  </Text>
                  {rank > 0 && corp.upgradeBonuses[rank - 1] && (
                    <Text style={styles.corpBonus}>
                      Current: {corp.upgradeBonuses[rank - 1]!.effect}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: { padding: 20, paddingTop: 48, backgroundColor: 'rgba(0,255,255,0.05)' },
  characterName: { color: '#00ffff', fontSize: 22, fontWeight: '700' },
  levelText: { color: '#668888', fontSize: 14, marginTop: 2, fontFamily: 'JetBrainsMono' },
  xpBarOuter: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  xpBarInner: { height: '100%', backgroundColor: '#00ffff', borderRadius: 3 },
  xpText: { color: '#446666', fontSize: 10, marginTop: 4, fontFamily: 'JetBrainsMono' },

  currencyStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: 'rgba(0,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.1)',
  },
  currency: { color: '#aabbcc', fontSize: 12, fontFamily: 'JetBrainsMono' },

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
  activeTab: { borderBottomColor: '#00ffff' },
  tabText: { color: '#668888', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#00ffff' },

  content: { flex: 1 },
  tabContent: { padding: 16, gap: 16 },

  // Overview
  activeSpecCard: {
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
    borderRadius: 10,
    padding: 16,
  },
  sectionTitle: { color: '#00ffff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  specName: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  specMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  specBadge: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#00ffff',
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
    overflow: 'hidden',
  },
  specDesc: { color: '#889999', fontSize: 13, marginTop: 8, lineHeight: 18 },
  switchBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  switchBtnText: { color: '#00ffff', fontSize: 13, fontWeight: '600' },

  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#667788', fontSize: 14 },

  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 16,
  },
  statRow: { color: '#aabbcc', fontSize: 13, marginBottom: 4 },

  // Specializations
  corpSection: { marginBottom: 20 },
  corpSectionTitle: { color: '#00ffff', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  specCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  specCardActive: { borderColor: '#00ffff', backgroundColor: 'rgba(0,255,255,0.08)' },
  specCardOwned: { borderColor: 'rgba(0,255,50,0.2)' },
  specCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specCardName: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  specCardBadges: { flexDirection: 'row', gap: 6 },
  specCardTier: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    color: '#00ffff',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    overflow: 'hidden',
  },
  specCardRole: {
    color: '#889999',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
  },
  specCardDesc: { color: '#778888', fontSize: 11, marginTop: 6 },
  specCardActions: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  activeLabel: { color: '#00ff88', fontSize: 12, fontWeight: '600' },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
    backgroundColor: 'rgba(0,255,255,0.08)',
  },
  actionBtnDisabled: { opacity: 0.4, borderColor: 'rgba(255,100,100,0.3)' },
  actionBtnText: { color: '#00ffff', fontSize: 11, fontWeight: '600' },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unlockCost: { color: '#ffcc00', fontSize: 12, fontFamily: 'JetBrainsMono' },

  // Corporations
  corpCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  corpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  corpCardName: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  corpRank: { color: '#00ffff', fontSize: 12, fontFamily: 'JetBrainsMono' },
  rankBarOuter: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  rankBarInner: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  corpMechanic: { color: '#889999', fontSize: 11, marginTop: 6, lineHeight: 16 },
  corpBonus: { color: '#44aa88', fontSize: 11, marginTop: 4 },
});
