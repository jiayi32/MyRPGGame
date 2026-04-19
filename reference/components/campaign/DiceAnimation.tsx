/**
 * DiceAnimation — D20 dice roll overlay for battle turns.
 *
 * Shows a brief spinning number animation landing on the actual roll value.
 * Crits (18-20) render in gold, low rolls in grey.
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { DiceRoll } from '../../services/gamification/CampaignTypes';

interface DiceAnimationProps {
  visible: boolean;
  diceRolls: DiceRoll[];
  onComplete: () => void;
  /** Total animation duration in ms. Default 1000. */
  duration?: number;
}

const ANIM_DURATION = 1000; // ms total (default)

export default function DiceAnimation({ visible, diceRolls, onComplete, duration }: DiceAnimationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  const done = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!visible || diceRolls.length === 0) return;

    const dur = duration ?? ANIM_DURATION;
    const s = dur / ANIM_DURATION; // scale factor

    // Animate in — timings scaled proportionally
    scale.value = withSequence(
      withTiming(1.3, { duration: Math.round(150 * s), easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: Math.round(100 * s) }),
      withDelay(Math.round(550 * s), withTiming(0, { duration: Math.round(200 * s) })),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: Math.round(100 * s) }),
      withDelay(Math.round(600 * s), withTiming(0, { duration: Math.round(300 * s) })),
    );
    rotation.value = withSequence(
      withTiming(360, { duration: Math.round(400 * s), easing: Easing.out(Easing.quad) }),
      withTiming(360, { duration: Math.round(600 * s) }),
    );

    const timer = setTimeout(() => {
      rotation.value = 0;
      runOnJS(done)();
    }, dur);

    return () => clearTimeout(timer);
  }, [visible, diceRolls]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  if (!visible || diceRolls.length === 0) return null;

  const roll = diceRolls[diceRolls.length - 1];
  const tier: 'fail' | 'normal' | 'strong' | 'critical' =
    roll.isCrit ? 'critical'
    : roll.rollValue === 1 ? 'fail'
    : roll.rollValue >= 15 ? 'strong'
    : 'normal';

  const TIER_LABELS: Record<string, string> = {
    fail: 'FAIL',
    normal: '',
    strong: 'STRONG',
    critical: 'CRIT!',
  };

  const TIER_COLORS: Record<string, string> = {
    fail: '#888',
    normal: '#fff',
    strong: '#4FC3F7',
    critical: '#FFD700',
  };

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.diceBubble, animStyle]}>
        <Text style={styles.d20Label}>D20</Text>
        <Text style={[styles.rollValue, { color: TIER_COLORS[tier] }]}>
          {roll.rollValue}
        </Text>
        {TIER_LABELS[tier] !== '' && (
          <Text style={[styles.tierLabel, { color: TIER_COLORS[tier] }]}>
            {TIER_LABELS[tier]}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  diceBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  d20Label: {
    color: '#aaa',
    fontSize: 9,
    fontWeight: '600',
  },
  rollValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
});
