import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export interface ToolButtonProps {
  label: string;
  description?: string;
  onPress: () => void;
  busy?: boolean;
  destructive?: boolean;
}

export function ToolButton({ label, description, onPress, busy, destructive }: ToolButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.toolBtn,
        destructive && styles.toolBtnDestructive,
        busy && styles.toolBtnBusy,
      ]}
      onPress={onPress}
      disabled={busy}
    >
      <Text style={[styles.toolBtnLabel, destructive && styles.toolBtnLabelDestructive]}>
        {busy ? '…' : label}
      </Text>
      {description !== undefined && (
        <Text style={styles.toolBtnDescription}>{description}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toolBtn: {
    backgroundColor: '#3a8a5a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toolBtnDestructive: { backgroundColor: '#a04040' },
  toolBtnBusy: { opacity: 0.6 },
  toolBtnLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
  toolBtnLabelDestructive: { color: '#fff' },
  toolBtnDescription: { fontSize: 11, color: '#d0e0d0', marginTop: 2 },
});
