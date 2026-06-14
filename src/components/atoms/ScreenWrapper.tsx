/**
 * Design System — ScreenWrapper
 *
 * Applies the correct theme mode (dark/cyberpunk) to each screen
 * and provides consistent screen-level layout (background, safe area).
 *
 * Usage in a screen component:
 *   <ScreenWrapper mode="dark">
 *     <YourScreenContent />
 *   </ScreenWrapper>
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, type ColorMode } from '../../design/ThemeContext';
import { useTheme } from '../../design/ThemeContext';
import { colors, spacing } from '../../design';

// ─── Props ───────────────────────────────────────────────────────────────────
interface ScreenWrapperProps {
  mode: ColorMode;
  children: React.ReactNode;
  /** Additional style for the outer container */
  style?: StyleProp<ViewStyle>;
  /** Whether to apply horizontal screen padding (default: true) */
  padded?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ScreenWrapper({ mode, children, style, padded = true }: ScreenWrapperProps) {
  return (
    <ThemeProvider mode={mode}>
      <ScreenInner padded={padded} style={style}>
        {children}
      </ScreenInner>
    </ThemeProvider>
  );
}

// ─── Inner (consumes theme from provider above) ──────────────────────────────
function ScreenInner({
  children,
  padded,
  style,
}: {
  children: React.ReactNode;
  padded: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background.primary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: padded ? insets.left + spacing['2xl'] : insets.left,
          paddingRight: padded ? insets.right + spacing['2xl'] : insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
