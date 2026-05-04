import { StyleSheet, Text, View } from 'react-native';
import type { Unit } from '@/domain/combat';

export function MpBar({ unit }: { unit: Unit }) {
  const pct = unit.mpMax > 0 ? Math.max(0, Math.min(1, unit.mp / unit.mpMax)) : 0;
  return (
    <View style={styles.barContainer}>
      <View style={[styles.barTrack, { backgroundColor: '#dde4f0' }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: '#4a6ae0' }]} />
      </View>
      <Text style={styles.barLabel}>MP {Math.round(unit.mp)} / {Math.round(unit.mpMax)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: { gap: 2 },
  barTrack: { height: 8, backgroundColor: '#e0e6f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%' },
  barLabel: { fontSize: 10, color: '#5a5a78' },
});
