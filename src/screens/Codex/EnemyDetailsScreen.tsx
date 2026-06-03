// ─── Enemy Details Screen ─────────────────────────────────────────
// Displays full archetype information plus player personal encounter stats.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCharacterStore } from '@/stores/characterStore';
import { ENEMY_ARCHETYPE_BY_ID } from '@/content/enemies';
import type { EnemyArchetypeId } from '@/content/types';

interface EnemyDetailsScreenProps {
  archetypeId: string;
}

export const EnemyDetailsScreen: React.FC<EnemyDetailsScreenProps> = ({ archetypeId }) => {
  const archetype = ENEMY_ARCHETYPE_BY_ID.get(archetypeId as EnemyArchetypeId);
  const entry = useCharacterStore((s) => s.bestiary.entries[archetypeId]);

  if (!archetype) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Enemy archetype not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Name + Role */}
        <View style={styles.header}>
          <Text style={styles.name}>{archetype.name}</Text>
          <View style={styles.badges}>
            <Text style={styles.badge}>{archetype.role}</Text>
          </View>
        </View>

        {/* Signature */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature Mechanic</Text>
          <Text style={styles.sectionText}>{archetype.signature}</Text>
        </View>

        {/* Stress Axis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stress Axis</Text>
          <Text style={styles.sectionText}>{archetype.stressAxis}</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>{archetype.description}</Text>
        </View>

        {/* Boss Hint */}
        {archetype.foreshadowsBossRole && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boss Connection</Text>
            <Text style={styles.sectionText}>Foreshadows: {archetype.foreshadowsBossRole}</Text>
          </View>
        )}

        {/* Scaling Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scaling by Tier</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Tier</Text>
            <Text style={styles.tableHeaderCell}>HP</Text>
            <Text style={styles.tableHeaderCell}>ATK</Text>
            <Text style={styles.tableHeaderCell}>DEF</Text>
            <Text style={styles.tableHeaderCell}>CT/tick</Text>
          </View>
          {archetype.scaling.map((row) => (
            <View key={row.tier} style={styles.tableRow}>
              <Text style={styles.tableCell}>{row.tier}</Text>
              <Text style={styles.tableCell}>{String(row.hp)}</Text>
              <Text style={styles.tableCell}>{String(row.atk)}</Text>
              <Text style={styles.tableCell}>{String(row.def)}</Text>
              <Text style={styles.tableCell}>{String(row.ctPerTick)}</Text>
            </View>
          ))}
        </View>

        {/* Player Stats */}
        {entry ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Encounters</Text>
            <Text style={styles.statRow}>Times Defeated: {entry.timesDefeated}</Text>
            <Text style={styles.statRow}>
              First Encounter: {new Date(entry.firstDefeatedAt).toLocaleDateString()}
            </Text>
            <Text style={styles.statRow}>
              Last Encounter: {new Date(entry.lastDefeatedAt).toLocaleDateString()}
            </Text>
            <Text style={styles.statRow}>Highest Damage: {entry.highestDamageDealt}</Text>
            <Text style={styles.statRow}>Total Damage Dealt: {entry.totalDamageDealt}</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.emptyText}>
              You haven't encountered this enemy yet. Explore the Grid to discover it.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  content: { padding: 20, paddingTop: 32, gap: 20, paddingBottom: 40 },
  header: { marginBottom: 4 },
  name: { color: '#00ffff', fontSize: 22, fontWeight: '700' },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: {
    backgroundColor: 'rgba(0,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    color: '#00ffff',
    fontSize: 12,
    fontFamily: 'JetBrainsMono',
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  errorText: { color: '#ff4444', fontSize: 16, textAlign: 'center', marginTop: 60 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: { color: '#00ffff', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  sectionText: { color: '#aabbcc', fontSize: 12, lineHeight: 18 },

  // Table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.2)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#00ffff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'JetBrainsMono',
  },
  tableRow: { flexDirection: 'row', paddingVertical: 2 },
  tableCell: { flex: 1, color: '#889999', fontSize: 10, fontFamily: 'JetBrainsMono' },

  // Player stats
  statRow: { color: '#aabbcc', fontSize: 12, marginBottom: 3, fontFamily: 'JetBrainsMono' },
  emptyText: { color: '#556677', fontSize: 12, fontStyle: 'italic' },
});
