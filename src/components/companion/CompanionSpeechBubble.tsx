/**
 * CompanionSpeechBubble — periodic contextual messages + mood emojis.
 *
 * Shows a small speech bubble that fades in/out with mood-specific messages.
 * Appears on mood change immediately, then periodically on idle (~15-30s).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { CompanionMood } from './types';
import { Colors } from '../../styles/theme';

const MESSAGE_POOLS: Record<CompanionMood, string[]> = {
  idle: [
    'Hey! 👋',
    'Log an expense? 📝',
    'Nice day! ☀️',
    'What\'s up? 😊',
    'Ready to go! 💪',
    'Check your balance? 💰',
    'Any expenses today? 🧾',
  ],
  excited: [
    'Woohoo! 🎉',
    'Nice one! ⚡',
    'Amazing! 🌟',
    'Level up vibes! 🔥',
    'You\'re on fire! 💫',
    'Keep it going! 🚀',
  ],
  sleepy: [
    '💤',
    'Zzz...',
    '5 more minutes... 😴',
    'So sleepy... 💤',
    'Wake me up later... 🌙',
  ],
  adventuring: [
    'Take that! ⚔️',
    'On my way! 🏃',
    'Adventure time! 🗡️',
    'Let\'s go! 🛡️',
    'Charging in! ⚡',
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface CompanionSpeechBubbleProps {
  mood: CompanionMood;
}

export default function CompanionSpeechBubble({ mood }: CompanionSpeechBubbleProps) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMoodRef = useRef(mood);

  const showBubble = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });

    // Auto-hide after 3-4 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(setVisible)(false);
      });
    }, 3500);
  }, []);

  // Show immediately on mood change
  useEffect(() => {
    if (mood !== prevMoodRef.current) {
      prevMoodRef.current = mood;
      const pool = MESSAGE_POOLS[mood];
      showBubble(pickRandom(pool));
    }
  }, [mood, showBubble]);

  // Periodic bubbles on idle
  useEffect(() => {
    if (mood !== 'idle') return;

    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 15000; // 15-30s
      return setTimeout(() => {
        showBubble(pickRandom(MESSAGE_POOLS.idle));
        timerRef.current = scheduleNext();
      }, delay);
    };

    // Initial bubble after a short delay
    const initialTimer = setTimeout(() => {
      showBubble(pickRandom(MESSAGE_POOLS.idle));
      timerRef.current = scheduleNext();
    }, 3000);

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mood, showBubble]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible && !message) return null;

  return (
    <Animated.View style={[styles.bubble, animStyle]}>
      <Text style={styles.bubbleText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    maxWidth: 160,
  },
  bubbleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary || '#1F2937',
  },
});
