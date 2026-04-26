import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { BattleEvent, InstanceId } from '@/domain/combat';
import { useCombatEventStream } from '@/hooks/useCombatEventStream';

interface CastPulseProps {
  unitId: InstanceId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a unit card with a brief scale pulse + glow border that fires on
 * skill_cast events for the matching unit.
 */
export function CastPulse({ unitId, children, style }: CastPulseProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useCombatEventStream((event: BattleEvent) => {
    if (event.type !== 'skill_cast') return;
    if (event.unitId !== unitId) return;
    scale.value = withSequence(
      withTiming(1.04, { duration: 110, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.in(Easing.cubic) }),
    );
    glow.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 380, easing: Easing.in(Easing.cubic) }),
    );
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd86b',
  },
});

// Re-export View for parity if needed elsewhere.
export const _StaticView = View;
