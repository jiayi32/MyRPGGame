/**
 * Design System — Bar Components (HP, MP, CT, Shield)
 *
 * Animated stat bars with smooth transitions.
 * HP bar: green→red gradient based on fill percentage
 * MP bar: blue/sapphire
 * CT bar: gold with pulse effect at low CT
 * Shield bar: blue overlay above HP bar
 *
 * All bars use react-native-reanimated for 60fps animations.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '../../design';

// ─── Types ───────────────────────────────────────────────────────────────────
export type BarVariant = 'hp' | 'mp' | 'ct' | 'shield';

interface BarProps {
  /** Current value */
  current: number;
  /** Maximum value */
  max: number;
  variant?: BarVariant;
  /** Bar height in px (default varies by variant) */
  height?: number;
  /** Show numeric label (current/max) */
  showLabel?: boolean;
  /** Pixel font label (for HP/CT), otherwise sans-serif */
  pixelLabel?: boolean;
  /** Width of the bar track */
  width?: number | '100%';
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Bar({
  current,
  max,
  variant = 'hp',
  height,
  showLabel = true,
  pixelLabel = false,
  width = '100%',
}: BarProps) {
  const fraction = max > 0 ? Math.min(Math.max(current / max, 0), 1) : 0;
  const animatedFraction = useSharedValue(fraction);

  // Default heights per variant
  const barHeight = height ?? (variant === 'shield' ? 4 : variant === 'ct' ? 6 : variant === 'mp' ? 8 : 12);

  useEffect(() => {
    animatedFraction.value = withTiming(fraction, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [fraction, animatedFraction]);

  // ── Animated fill width ────────────────────────────────────────────────
  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedFraction.value * 100}%`,
  }));

  // ── Color interpolation (HP only: green→red) ───────────────────────────
  const fillColorStyle = useAnimatedStyle(() => {
    if (variant === 'hp') {
      const color = interpolateColor(
        animatedFraction.value,
        [0, 0.3, 0.7, 1],
        [colors.accent.crimson, colors.accent.amber, colors.accent.emerald, colors.accent.emerald],
      );
      return { backgroundColor: color };
    }
    return {};
  });

  // ── CT pulse animation ─────────────────────────────────────────────────
  const pulseStyle = useAnimatedStyle(() => {
    if (variant === 'ct' && fraction <= 0.3) {
      return {
        opacity: withRepeat(
          withSequence(
            withTiming(0.6, { duration: 400 }),
            withTiming(1, { duration: 400 }),
          ),
          -1,
          true,
        ),
      };
    }
    return { opacity: 1 };
  });

  // ── Static fill color for non-HP bars ──────────────────────────────────
  const staticFillColor = (() => {
    switch (variant) {
      case 'mp': return colors.accent.sapphire;
      case 'ct': return colors.accent.gold;
      case 'shield': return colors.accent.sapphire;
      default: return undefined;
    }
  })();

  const labelFont = pixelLabel ? typography.style.pixelSm : typography.style.labelSm;
  const labelColor = '#ffffff';

  return (
    <View style={[styles.container, { height: barHeight, width: width as any }]}>
      {/* Track */}
      <View
        style={[
          styles.track,
          {
            height: barHeight,
            borderRadius: barHeight / 2,
            backgroundColor: variant === 'shield' ? 'transparent' : '#3d2a20',
          },
        ]}
      >
        {/* Fill */}
        <Animated.View
          style={[
            styles.fill,
            fillStyle,
            { height: barHeight, borderRadius: barHeight / 2 },
            variant !== 'hp' && { backgroundColor: staticFillColor },
            fillColorStyle,
            variant === 'ct' && pulseStyle,
          ]}
        />
      </View>

      {/* Label */}
      {showLabel && (
        <View style={styles.labelOverlay}>
          <Text
            style={[
              labelFont,
              {
                color: labelColor,
                textShadowColor: 'rgba(0,0,0,0.7)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              },
            ]}
          >
            {Math.ceil(current)}/{max}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── HP/MP Stack — common pattern for unit display ──────────────────────────
interface UnitBarsProps {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  shield?: number;
  maxShield?: number;
  /** Width of all bars */
  width?: number | '100%';
}

export function UnitBars({
  hp,
  maxHp,
  mp,
  maxMp,
  shield,
  maxShield,
  width = '100%',
}: UnitBarsProps) {
  return (
    <View style={styles.unitBars}>
      {shield !== undefined && maxShield !== undefined && shield > 0 && (
        <Bar current={shield} max={maxShield} variant="shield" height={4} showLabel={false} width={width} />
      )}
      <Bar current={hp} max={maxHp} variant="hp" height={12} pixelLabel width={width} />
      <Bar current={mp} max={maxMp} variant="mp" height={8} showLabel={false} width={width} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  labelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitBars: {
    gap: spacing.xs,
  },
});
