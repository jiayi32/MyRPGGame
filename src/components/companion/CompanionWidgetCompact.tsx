/**
 * CompanionWidgetCompact — Compact Markov chain widget for HomeScreen.
 *
 * Same Markov state machine and drift logic as CompanionWidget but:
 * - Reduced container height (100dp)
 * - No speech bubble or mood picker — replaced with read-only mood pill
 * - Pauses animation when Home tab loses focus (useIsFocused)
 * - Tap navigates to CompanionTab
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import SpriteAnimator from './SpriteAnimator';
import { SPRITE_REGISTRY } from './spriteRegistry';
import { useCharacterImages } from './useCharacterImages';
import { MOOD_CHAINS, pickNextState, pickWeightedMood, SLEEPY_UNLOCKED_DRIFT_TARGETS } from './companionMarkov';
import type { CompanionMood, SpriteAnimName, CharacterId } from './types';
import { Colors, BorderRadius } from '../../styles/theme';

interface CompanionWidgetCompactProps {
  characterId: CharacterId;
  mood: CompanionMood;
  onPress?: () => void;
  style?: object;
}

const CONTAINER_HEIGHT = 100;

export default function CompanionWidgetCompact({
  characterId,
  mood,
  onPress,
  style,
}: CompanionWidgetCompactProps) {
  const isFocused = useIsFocused();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasuredWidth(e.nativeEvent.layout.width);
  }, []);

  const manifest = SPRITE_REGISTRY[characterId];
  const imageMap = useCharacterImages(characterId);

  // ---- Markov state machine ----
  const [activeMood, setActiveMood] = useState<CompanionMood>(mood);
  const [stateName, setStateName] = useState<string>(() => MOOD_CHAINS[mood].entryState);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Drift tracking
  const driftReturnMoodRef = useRef<CompanionMood | null>(null);
  const driftCounterRef = useRef(0);
  const driftBurstLengthRef = useRef(0);

  // Mood cycle tracking (session-local: unlocks sleepy drift)
  const moodsEnteredRef = useRef<Set<CompanionMood>>(new Set());

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Advance to next Markov state
  const advanceState = useCallback(() => {
    setStateName((prevState) => {
      const chain = MOOD_CHAINS[activeMood];
      const state = chain.states[prevState];
      if (!state) return chain.entryState;

      const nextState = pickNextState(state.transitions);

      if (driftReturnMoodRef.current !== null) {
        driftCounterRef.current += 1;
        if (driftCounterRef.current >= driftBurstLengthRef.current) {
          const returnMood = driftReturnMoodRef.current;
          driftReturnMoodRef.current = null;
          driftCounterRef.current = 0;
          setTimeout(() => {
            setActiveMood(returnMood);
            setStateName(MOOD_CHAINS[returnMood].entryState);
          }, 0);
          return nextState;
        }
      }

      return nextState;
    });
  }, [activeMood]);

  // When external mood prop changes, reset
  useEffect(() => {
    clearHoldTimer();
    driftReturnMoodRef.current = null;
    driftCounterRef.current = 0;
    setActiveMood(mood);
    setStateName(MOOD_CHAINS[mood].entryState);
  }, [mood, clearHoldTimer]);

  // Resolve current state
  const chain = MOOD_CHAINS[activeMood];
  const currentState = chain.states[stateName] || chain.states[chain.entryState];
  const currentAnim: SpriteAnimName = currentState.anim;
  const resolvedAsset = manifest.animations[currentAnim] || manifest.animations.idle!;

  // Time-based hold
  useEffect(() => {
    if (!isFocused) return;
    clearHoldTimer();
    if (currentState.holdSeconds != null && currentState.loops == null) {
      holdTimerRef.current = setTimeout(() => {
        advanceState();
      }, currentState.holdSeconds * 1000);
    }
    return clearHoldTimer;
  }, [stateName, activeMood, currentState.holdSeconds, currentState.loops, advanceState, clearHoldTimer, isFocused]);

  // Loop-based: SpriteAnimator fires onAnimationEnd after N cycles
  const handleAnimationEnd = useCallback(() => {
    advanceState();
  }, [advanceState]);

  // Track every mood entered this session (gates sleepy drift-in/out)
  useEffect(() => {
    moodsEnteredRef.current.add(activeMood);
  }, [activeMood]);

  // ---- Auto-drift (paused when not focused) ----
  useEffect(() => {
    if (!isFocused) return;
    const drift = MOOD_CHAINS[activeMood].drift;
    if (!drift || driftReturnMoodRef.current !== null) return;

    // Sleepy drift-out only unlocked once sleepy has been entered at least once
    if (activeMood === 'sleepy' && !moodsEnteredRef.current.has('sleepy')) return;

    // Other moods can drift into sleepy only once all three main moods have been visited
    const sleepyUnlocked = (['idle', 'excited', 'adventuring'] as CompanionMood[])
      .every(m => moodsEnteredRef.current.has(m));

    const intervalMs = drift.intervalSeconds * 1000;
    const interval = setInterval(() => {
      if (Math.random() < drift.probability) {
        const effectiveTargets =
          activeMood !== 'sleepy' && sleepyUnlocked && SLEEPY_UNLOCKED_DRIFT_TARGETS[activeMood]
            ? SLEEPY_UNLOCKED_DRIFT_TARGETS[activeMood]!
            : drift.targets;
        const targetMood = pickWeightedMood(effectiveTargets);
        driftReturnMoodRef.current = activeMood;
        driftCounterRef.current = 0;
        driftBurstLengthRef.current = drift.burstLength;
        setActiveMood(targetMood);
        setStateName(MOOD_CHAINS[targetMood].entryState);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [activeMood, isFocused]);

  // ---- Zzz overlay for sleepy ----
  const showZzz = activeMood === 'sleepy' && (currentAnim === 'dead' || currentAnim === 'dying');
  const zzzOpacity = useSharedValue(0);

  useEffect(() => {
    if (showZzz) {
      zzzOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      zzzOpacity.value = 0;
    }
  }, [showZzz]);

  const zzzStyle = useAnimatedStyle(() => ({
    opacity: zzzOpacity.value,
  }));

  const loopsProp = currentState.loops;
  const shouldFireEnd = loopsProp != null;

  return (
    <View style={style} onLayout={handleLayout}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
        style={styles.container}
      >
        {/* Sprite animation */}
        <View style={styles.spriteContainer}>
          {measuredWidth > 0 && (
            <SpriteAnimator
              asset={resolvedAsset}
              skImage={imageMap[currentAnim] ?? imageMap.idle ?? null}
              playing={isFocused}
              loops={loopsProp}
              displayWidth={measuredWidth}
              displayHeight={CONTAINER_HEIGHT}
              onAnimationEnd={shouldFireEnd ? handleAnimationEnd : undefined}
            />
          )}
          {/* Zzz overlay */}
          {showZzz && (
            <Animated.View style={[styles.zzzContainer, zzzStyle]}>
              <Text style={styles.zzzText}>💤</Text>
              <Text style={styles.zzzTextSmall}>Zzz...</Text>
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.lg || 16,
    overflow: 'hidden',
  },
  spriteContainer: {
    height: CONTAINER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  zzzContainer: {
    position: 'absolute',
    top: 8,
    right: 16,
    alignItems: 'center',
  },
  zzzText: {
    fontSize: 20,
  },
  zzzTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
    marginTop: 2,
  },
});
