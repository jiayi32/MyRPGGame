import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, radius, typography, touchTarget } from '../../design';

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
  primary: colors.button.primary.bg,
  secondary: colors.button.secondary.bg,
  destructive: colors.button.destructive.bg,
};

const VARIANT_BORDER: Record<PrimaryButtonVariant, string> = {
  primary: colors.button.primary.border,
  secondary: colors.button.secondary.border,
  destructive: colors.button.destructive.border,
};

const VARIANT_TEXT: Record<PrimaryButtonVariant, string> = {
  primary: colors.button.primary.text,
  secondary: colors.button.secondary.text,
  destructive: colors.button.destructive.text,
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
  const bgColor = isInactive ? colors.button.primary.disabledBg : VARIANT_BG[variant];
  const borderColor = isInactive ? colors.button.primary.disabledBorder : VARIANT_BORDER[variant];
  const textColor = isInactive ? colors.button.primary.disabledText : VARIANT_TEXT[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isInactive}
      onPress={onPress}
      style={[
        styles.btn,
        fullWidth && styles.fullWidth,
        { backgroundColor: bgColor, borderColor },
        style,
      ]}
    >
      <View style={styles.row}>
        {busy && <ActivityIndicator size="small" color={textColor} style={styles.spinner} />}
        <Text style={[typography.style.buttonLabel, { color: textColor }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.button,
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spinner: { marginRight: spacing.sm },
});
