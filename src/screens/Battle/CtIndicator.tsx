import { StyleSheet, Text } from 'react-native';
import type { Unit } from '@/domain/combat';

export function CtIndicator({ unit, isReady }: { unit: Unit; isReady: boolean }) {
  if (isReady) {
    return <Text style={[styles.ctChip, styles.ctChipReady]}>READY</Text>;
  }
  return (
    <Text style={styles.ctChip}>
      CT {unit.ct.toFixed(1)}s
    </Text>
  );
}

const styles = StyleSheet.create({
  ctChip: {
    fontSize: 11,
    color: '#5a5a78',
    backgroundColor: '#eef0f8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  ctChipReady: {
    color: '#fff',
    backgroundColor: '#3a8a5a',
  },
});
