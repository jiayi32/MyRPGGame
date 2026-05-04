import { StyleSheet, Text, View } from 'react-native';

export function RewardRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <View style={styles.rewardRow}>
      <Text style={styles.rewardLabel}>{label}</Text>
      <Text style={styles.rewardValue}>+{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rewardLabel: { fontSize: 13, color: '#2f3f39' },
  rewardValue: { fontSize: 13, fontWeight: '600', color: '#1a5a2a' },
});
