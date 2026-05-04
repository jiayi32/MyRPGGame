import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ClassData } from '@/content/types';

const TIER_LABELS: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5' };
const ROLE_COLORS: Record<string, string> = {
  DPS: '#8b2020',
  Tank: '#1a4a8b',
  Support: '#1a7a2a',
  Control: '#5a1a8b',
  Hybrid: '#7a5a10',
};

export function ClassCard({
  classData,
  owned,
  selected,
  unlocksFromName,
  onPress,
}: {
  classData: ClassData;
  owned: boolean;
  selected: boolean;
  unlocksFromName?: string | undefined;
  onPress: () => void;
}) {
  const roleColor = ROLE_COLORS[classData.role] ?? '#444';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!owned}
      style={[
        styles.card,
        selected && styles.cardSelected,
        !owned && styles.cardLocked,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.tierBadge, { backgroundColor: owned ? '#7a3b00' : '#aaa' }]}>
          <Text style={styles.tierText}>{TIER_LABELS[classData.tier] ?? `T${classData.tier}`}</Text>
        </View>
        <Text style={[styles.cardName, !owned && styles.lockedText]}>
          {classData.name}
          {!owned ? '  🔒' : ''}
        </Text>
        <View style={[styles.roleBadge, { borderColor: owned ? roleColor : '#bbb' }]}>
          <Text style={[styles.roleText, { color: owned ? roleColor : '#aaa' }]}>
            {classData.role}
          </Text>
        </View>
      </View>

      {owned ? (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {classData.description}
        </Text>
      ) : (
        <Text style={styles.lockHint}>
          {unlocksFromName !== undefined
            ? `Unlocks from: ${unlocksFromName}`
            : 'Unlock by completing a run with an evolution path to this class.'}
        </Text>
      )}

      {selected && owned && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 14,
    gap: 6,
  },
  cardSelected: {
    borderColor: '#7a3b00',
    backgroundColor: '#fff8f0',
  },
  cardLocked: {
    opacity: 0.55,
    backgroundColor: '#f0ece4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2b1f10' },
  lockedText: { color: '#888' },
  roleBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleText: { fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#5a4838', lineHeight: 18 },
  lockHint: { fontSize: 12, color: '#9e8870', fontStyle: 'italic' },
  selectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7a3b00',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectedText: { fontSize: 11, color: '#fff', fontWeight: '600' },
});
