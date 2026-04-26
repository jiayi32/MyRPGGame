import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

export type PrimaryButtonVariant = 'primary' | 'secondary' | 'destructive';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Disabled-but-clickable would be a UX bug; this control always sets pointer-events to match the
   *  visual state. Greyed = not clickable; coloured = clickable. */
  variant?: PrimaryButtonVariant;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_BG: Record<PrimaryButtonVariant, string> = {
  primary: '#7a3b00',
  secondary: '#3a8a5a',
  destructive: '#a04040',
};

const VARIANT_BORDER: Record<PrimaryButtonVariant, string> = {
  primary: '#5a2a00',
  secondary: '#2a6a3a',
  destructive: '#7a3030',
};

/**
 * Solid-coloured action button with explicit enabled vs disabled visual states.
 *
 * React Native's stock `<Button>` renders muted on Android Material — making an enabled button
 * look "greyed out". This wraps TouchableOpacity with bold colour when enabled, faded when not.
 */
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  busy = false,
  variant = 'primary',
  fullWidth = true,
  style,
}: PrimaryButtonProps) {
  const isInactive = disabled || busy;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isInactive}
      onPress={onPress}
      style={[
        styles.btn,
        fullWidth && styles.fullWidth,
        isInactive
          ? styles.btnDisabled
          : { backgroundColor: VARIANT_BG[variant], borderColor: VARIANT_BORDER[variant] },
        style,
      ]}
    >
      <View style={styles.row}>
        {busy && <ActivityIndicator size="small" color="#fff" style={styles.spinner} />}
        <Text style={[styles.label, isInactive && styles.labelDisabled]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: { alignSelf: 'stretch' },
  btnDisabled: {
    backgroundColor: '#e6e0d4',
    borderColor: '#c8c0b0',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spinner: { marginRight: 4 },
  label: { fontSize: 15, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  labelDisabled: { color: '#8a8074' },
});
