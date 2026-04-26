import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedHpBarProps {
  hp: number;
  hpMax: number;
  /** Color of the fill bar (CSS-style hex). */
  color?: string;
  /** Track color. */
  trackColor?: string;
  /** Optional bar label. Defaults to "HP {hp} / {hpMax}". */
  label?: string;
  /** Animation duration in ms. */
  durationMs?: number;
}

/**
 * HP bar that animates the fill width when `hp` changes.
 *
 * Drop-in replacement for the static <View> HP bar previously inlined in
 * BattleScreen. Uses Reanimated's `useSharedValue` + `withTiming` so width
 * transitions run on the UI thread.
 */
export function AnimatedHpBar({
  hp,
  hpMax,
  color = '#3a8a5a',
  trackColor = '#e0e6f0',
  label,
  durationMs = 280,
}: AnimatedHpBarProps) {
  const pct = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
  const animatedPct = useSharedValue(pct);

  useEffect(() => {
    animatedPct.value = withTiming(pct, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedPct, pct, durationMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedPct.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, animatedStyle]} />
      </View>
      <Text style={styles.label}>
        {label ?? `HP ${Math.round(hp)} / ${Math.round(hpMax)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%' },
  label: { fontSize: 10, color: '#5a5a78' },
});
