/**
 * CompanionWidget — Markov chain-driven animation state machine.
 *
 * Renders a companion sprite inside a clipped container on HomeScreen.
 * Each mood has a configurable Markov chain (defined in companionMarkov.ts)
 * that drives probabilistic animation transitions.
 * Auto-drift occasionally shifts moods for variety.
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
import SpriteAnimator from './SpriteAnimator';
import CompanionSpeechBubble from './CompanionSpeechBubble';
import { SPRITE_REGISTRY } from './spriteRegistry';
import { useCharacterImages } from './useCharacterImages';
import { MOOD_CHAINS, pickNextState, pickWeightedMood, SLEEPY_UNLOCKED_DRIFT_TARGETS } from './companionMarkov';
import type { CompanionMood, SpriteAnimName } from './types';
import type { CharacterId } from './types';
import { Colors, BorderRadius } from '../../styles/theme';

interface CompanionWidgetProps {
  characterId: CharacterId;
  mood: CompanionMood;
  onPress?: () => void;
  onMoodChange?: (mood: CompanionMood) => void;
  /** Hide the small mood icon row (use when a larger picker is shown in the parent) */
  hideMoodPicker?: boolean;
  /** Called whenever activeMood changes, including drift transitions */
  onActiveMoodChange?: (mood: CompanionMood) => void;
  style?: object;
}

const MOOD_ICON_OPTIONS: { value: CompanionMood; emoji: string }[] = [
  { value: 'idle', emoji: '😊' },
  { value: 'excited', emoji: '⚡' },
  { value: 'sleepy', emoji: '😴' },
  { value: 'adventuring', emoji: '⚔️' },
];

const CONTAINER_HEIGHT = 120;

export default function CompanionWidget({
  characterId,
  mood,
  onPress,
  onMoodChange,
  hideMoodPicker,
  onActiveMoodChange,
  style,
}: CompanionWidgetProps) {
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

  // Clear hold timer helper
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

      // If drifting, count transitions and return when burst is done
      if (driftReturnMoodRef.current !== null) {
        driftCounterRef.current += 1;
        if (driftCounterRef.current >= driftBurstLengthRef.current) {
          const returnMood = driftReturnMoodRef.current;
          driftReturnMoodRef.current = null;
          driftCounterRef.current = 0;
          // Schedule mood return after this render
          setTimeout(() => {
            setActiveMood(returnMood);
            setStateName(MOOD_CHAINS[returnMood].entryState);
          }, 0);
          return nextState; // play one more before returning
        }
      }

      return nextState;
    });
  }, [activeMood]);

  // When external mood prop changes, reset to that mood's entry state
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

  // Time-based hold: start timer when entering a holdSeconds state
  useEffect(() => {
    clearHoldTimer();
    if (currentState.holdSeconds != null && currentState.loops == null) {
      holdTimerRef.current = setTimeout(() => {
        advanceState();
      }, currentState.holdSeconds * 1000);
    }
    return clearHoldTimer;
  }, [stateName, activeMood, currentState.holdSeconds, currentState.loops, advanceState, clearHoldTimer]);

  // Loop-based: SpriteAnimator fires onAnimationEnd after N cycles
  const handleAnimationEnd = useCallback(() => {
    advanceState();
  }, [advanceState]);

  // Track every mood entered this session (gates sleepy drift-in/out)
  // Also notify parent so external UI (e.g. segmented filter) can stay in sync
  useEffect(() => {
    moodsEnteredRef.current.add(activeMood);
    onActiveMoodChange?.(activeMood);
  }, [activeMood, onActiveMoodChange]);

  // ---- Auto-drift ----
  useEffect(() => {
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
  }, [activeMood]);

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

  // Determine if SpriteAnimator should use loops or hold forever
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
              playing
              loops={loopsProp}
              displayWidth={measuredWidth}
              displayHeight={CONTAINER_HEIGHT}
              onAnimationEnd={shouldFireEnd ? handleAnimationEnd : undefined}
            />
          )}
          {/* Zzz overlay for sleepy mood */}
          {showZzz && (
            <Animated.View style={[styles.zzzContainer, zzzStyle]}>
              <Text style={styles.zzzText}>💤</Text>
              <Text style={styles.zzzTextSmall}>Zzz...</Text>
            </Animated.View>
          )}
        </View>

        {/* Bottom row: speech bubble + mood icons */}
        <View style={styles.bottomRow}>
          <CompanionSpeechBubble mood={activeMood} />
          {!hideMoodPicker && (
            <View style={styles.moodIcons}>
              {MOOD_ICON_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.moodIcon, mood === opt.value && styles.moodIconActive]}
                  onPress={() => onMoodChange?.(opt.value)}
                >
                  <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: BorderRadius.lg || 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  spriteContainer: {
    height: CONTAINER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  zzzContainer: {
    position: 'absolute',
    top: 12,
    right: 20,
    alignItems: 'center',
  },
  zzzText: {
    fontSize: 24,
  },
  zzzTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  moodIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  moodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  moodIconActive: {
    backgroundColor: Colors.primaryBackground || '#E5F1FF',
    borderColor: Colors.primary || '#3B82F6',
  },
  moodEmoji: {
    fontSize: 14,
  },
});
