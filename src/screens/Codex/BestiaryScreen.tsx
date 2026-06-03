// ─── Bestiary Screen ──────────────────────────────────────────────
// Codex-style list of all encountered enemies with completion tracking.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCharacterStore } from '@/stores/characterStore';
import { ENEMY_ARCHETYPE_BY_ID } from '@/content/enemies';
import type { EnemyArchetypeId } from '@/content/types';
import type { BestiaryEntry } from '@/domain/world/bestiary';

interface BestiaryScreenProps {
  onEnemyPress?: (archetypeId: string) => void;
}

export const BestiaryScreen: React.FC<BestiaryScreenProps> = ({ onEnemyPress }) => {
  const bestiary = useCharacterStore((s) => s.bestiary);
  const allIds = Array.from(ENEMY_ARCHETYPE_BY_ID.keys());
  const totalArchetypes = ENEMY_ARCHETYPE_BY_ID.size;

  const completionPct = totalArchetypes > 0
    ? Math.round((bestiary.uniqueArchetypesEncountered / totalArchetypes) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Codex</Text>
        <Text style={styles.subtitle}>
          {bestiary.uniqueArchetypesEncountered}/{totalArchetypes} discovered · {completionPct}%
        </Text>
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${completionPct}%` }]} />
        </View>
        <Text style={styles.statsText}>
          {bestiary.totalEnemiesDefeated} total defeated
        </Text>
      </View>

      {/* Enemy Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {allIds.map((id) => {
          const archetype = ENEMY_ARCHETYPE_BY_ID.get(id);
          if (!archetype) return null;
          const entry: BestiaryEntry | undefined = bestiary.entries[id];
          const discovered = entry !== undefined;

          return (
            <TouchableOpacity
              key={id}
              style={[styles.card, discovered ? styles.cardDiscovered : styles.cardLocked]}
              onPress={() => discovered && onEnemyPress?.(id)}
              disabled={!discovered}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardName, !discovered && styles.cardNameLocked]}>
                  {discovered ? archetype.name : '???'}
                </Text>
                <Text style={styles.cardRole}>{discovered ? archetype.role : 'Unknown'}</Text>
              </View>
              {discovered && entry ? (
                <View style={styles.cardStats}>
                  <Text style={styles.cardStat}>Defeated: {entry.timesDefeated}x</Text>
                  <Text style={styles.cardStat}>Best hit: {entry.highestDamageDealt}</Text>
                </View>
              ) : (
                <Text style={styles.cardHint}>Undiscovered</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

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
  title: { color: '#00ffff', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#668888', fontSize: 13, marginTop: 4, fontFamily: 'JetBrainsMono' },
  progressBarOuter: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarInner: { height: '100%', backgroundColor: '#00ffff', borderRadius: 2 },
  statsText: { color: '#446666', fontSize: 11, marginTop: 4, fontFamily: 'JetBrainsMono' },

  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  cardDiscovered: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(0,255,255,0.2)',
  },
  cardLocked: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: { color: '#ffffff', fontSize: 13, fontWeight: '600', flex: 1 },
  cardNameLocked: { color: '#445566' },
  cardRole: {
    color: '#668888',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    textTransform: 'uppercase',
  },
  cardStats: { marginTop: 8 },
  cardStat: { color: '#889999', fontSize: 10, fontFamily: 'JetBrainsMono', marginBottom: 2 },
  cardHint: { color: '#334455', fontSize: 10, fontFamily: 'JetBrainsMono', marginTop: 8, fontStyle: 'italic' },
});
