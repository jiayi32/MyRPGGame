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

export function StatusChips({
  unit,
  maxVisible,
}: {
  unit: Unit;
  maxVisible?: number;
}) {
  if (unit.statuses.length === 0) return null;
  const cap = maxVisible !== undefined ? Math.max(1, maxVisible) : unit.statuses.length;
  const visible = unit.statuses.slice(0, cap);
  const hiddenCount = Math.max(0, unit.statuses.length - visible.length);

  return (
    <View style={styles.statusChipsRow}>
      {visible.map((s) => {
        const colors = statusChipColor(s.kind);
        const totalDuration = s.tickIntervalSec > 0 ? s.remainingSec : 0;
        // Estimate total duration from remaining + tick progress
        const estTotal = totalDuration > 0 ? totalDuration : 1;
        const fraction = totalDuration > 0 ? Math.min(1, Math.max(0, s.remainingSec / estTotal)) : 1;
        return (
          <View key={`${s.kind}_${s.skillId}_${s.id}`} style={[styles.statusChip, { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor }]}>
            <Text style={styles.statusChipText}>
              {abbrevStatus(s.kind)}
              {s.stacks > 1 ? ` ×${s.stacks}` : ''}
            </Text>
            {totalDuration > 0 && (
              <View style={styles.durationBarTrack}>
                <View style={[styles.durationBarFill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: colors.borderColor }]} />
              </View>
            )}
          </View>
        );
      })}
      {hiddenCount > 0 && (
        <View style={[styles.statusChip, styles.overflowChip]}>
          <Text style={styles.statusChipText}>+{hiddenCount} more</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusChipsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusChip: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingTop: 1,
    paddingBottom: 0,
  },
  statusChipText: { fontSize: 10, fontWeight: '600' },
  overflowChip: {
    backgroundColor: '#eff2f8',
    borderColor: '#95a2c2',
  },
  durationBarTrack: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1,
    marginTop: 1,
    marginBottom: 1,
  },
  durationBarFill: {
    height: 2,
    borderRadius: 1,
  },
});
