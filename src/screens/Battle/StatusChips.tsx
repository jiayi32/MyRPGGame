import { StyleSheet, Text, View } from 'react-native';
import type { Unit } from '@/domain/combat';

export function statusChipColor(kind: string): { backgroundColor: string; borderColor: string } {
  switch (kind) {
    case 'dot': return { backgroundColor: '#fde0e0', borderColor: '#a04040' };
    case 'hot': return { backgroundColor: '#e0fde0', borderColor: '#40a040' };
    case 'buff': return { backgroundColor: '#e0e8ff', borderColor: '#4060c0' };
    case 'debuff': return { backgroundColor: '#fde0fd', borderColor: '#a040a0' };
    case 'shield': return { backgroundColor: '#fff8e0', borderColor: '#a08040' };
    case 'stun': return { backgroundColor: '#e8e8e8', borderColor: '#808080' };
    case 'counter': return { backgroundColor: '#fde8c8', borderColor: '#c08040' };
    default: return { backgroundColor: '#f0f0f0', borderColor: '#808080' };
  }
}

export function abbrevStatus(kind: string): string {
  switch (kind) {
    case 'dot': return 'DoT';
    case 'hot': return 'HoT';
    case 'buff': return 'Buff';
    case 'debuff': return 'Debuff';
    case 'shield': return 'Shield';
    case 'stun': return 'Stun';
    case 'counter': return 'Counter';
    default: return kind;
  }
}

export function StatusChips({ unit }: { unit: Unit }) {
  if (unit.statuses.length === 0) return null;
  return (
    <View style={styles.statusChipsRow}>
      {unit.statuses.map((s) => (
        <View key={`${s.kind}_${s.skillId}_${s.id}`} style={[styles.statusChip, statusChipColor(s.kind)]}>
          <Text style={styles.statusChipText}>
            {abbrevStatus(s.kind)}
            {s.stacks > 1 ? ` ×${s.stacks}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statusChipsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusChip: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  statusChipText: { fontSize: 10, fontWeight: '600' },
});
