/**
 * AdventureMapScreen — Passive auto-battle screen where the companion fights
 * enemies and earns 1 gold per minute while the screen is open.
 *
 * - Companion uses the "adventuring" Markov chain (no drift)
 * - Gold counter ticks up every 60s (only while screen is focused + app foreground)
 * - Session cap: 60 gold (60 minutes)
 * - On exit, fires one summary GoldToast with total earned
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
} from 'react-native';
import type { LayoutChangeEvent, AppStateStatus } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SpriteAnimator from '../../components/companion/SpriteAnimator';
import { SPRITE_REGISTRY } from '../../components/companion/spriteRegistry';
import { useCharacterImages } from '../../components/companion/useCharacterImages';
import { MOOD_CHAINS, pickNextState } from '../../components/companion/companionMarkov';
import type { SpriteAnimName } from '../../components/companion/types';
import { useCompanionState } from '../../components/companion/useCompanionState';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import GoldDisplay from '../../components/GoldDisplay';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';
import { haptics } from '../../utils/haptics';
import { DEFAULT_TAB_BAR_STYLE } from '../../constants/navigation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOLD_PER_TICK = 1;
const TICK_INTERVAL_MS = 60_000; // 1 minute
const SESSION_CAP = 60; // max gold per session
const BATTLE_AREA_HEIGHT = 280;

const ENEMY_ICONS = ['ghost', 'skull-outline', 'spider', 'sword-cross', 'shield-bug-outline'];

function randomEnemy(): string {
  return ENEMY_ICONS[Math.floor(Math.random() * ENEMY_ICONS.length)];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdventureMapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { gold, addGold } = useGamification() as any;
  const { characterId } = useCompanionState();
  const uid = user?.uid;

  // ---- Hide bottom tab bar while this screen is open ----
  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: isFocused ? { display: 'none' } : DEFAULT_TAB_BAR_STYLE });
  }, [isFocused, navigation]);

  // ---- Layout ----
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasuredWidth(e.nativeEvent.layout.width);
  }, []);

  // ---- Session gold tracking ----
  const [sessionGold, setSessionGold] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const sessionGoldRef = useRef(0);
  const goldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const capped = totalMinutes >= SESSION_CAP;

  // ---- Sprite registry ----
  const manifest = SPRITE_REGISTRY[characterId];
  const imageMap = useCharacterImages(characterId);

  // ---- Markov state machine (adventuring, no drift) ----
  const chain = MOOD_CHAINS['adventuring'];
  const [stateName, setStateName] = useState<string>(chain.entryState);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateRef = useRef<string>(chain.entryState);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const advanceState = useCallback(() => {
    setStateName((prev) => {
      prevStateRef.current = prev;
      const state = chain.states[prev];
      if (!state) return chain.entryState;
      return pickNextState(state.transitions);
    });
  }, [chain]);

  // Resolve current state
  const currentState = chain.states[stateName] || chain.states[chain.entryState];
  const currentAnim: SpriteAnimName = currentState.anim;
  const resolvedAsset = manifest.animations[currentAnim] || manifest.animations.idle!;
  const loopsProp = currentState.loops;
  const shouldFireEnd = loopsProp != null;

  // Time-based hold
  useEffect(() => {
    if (!isFocused) return;
    clearHoldTimer();
    if (currentState.holdSeconds != null && currentState.loops == null) {
      holdTimerRef.current = setTimeout(() => advanceState(), currentState.holdSeconds * 1000);
    }
    return clearHoldTimer;
  }, [stateName, currentState.holdSeconds, currentState.loops, advanceState, clearHoldTimer, isFocused]);

  const handleAnimationEnd = useCallback(() => {
    advanceState();
  }, [advanceState]);

  // ---- Enemy animation ----
  const [enemyIcon, setEnemyIcon] = useState(randomEnemy);
  const enemyOpacity = useSharedValue(1);
  const enemyRespawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect attack completion → trigger enemy defeat
  useEffect(() => {
    const prev = prevStateRef.current;
    if ((prev === 'atk' || prev === 'limit_atk') && stateName !== prev) {
      // Enemy defeated
      enemyOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      if (enemyRespawnTimer.current) clearTimeout(enemyRespawnTimer.current);
      enemyRespawnTimer.current = setTimeout(() => {
        setEnemyIcon(randomEnemy());
        enemyOpacity.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) });
      }, 800);
    }
  }, [stateName]);

  const enemyAnimStyle = useAnimatedStyle(() => ({
    opacity: enemyOpacity.value,
  }));

  // ---- Gold earning interval ----
  const startGoldInterval = useCallback(() => {
    if (goldIntervalRef.current) return;
    if (!uid || sessionGoldRef.current >= SESSION_CAP) return;

    goldIntervalRef.current = setInterval(() => {
      if (sessionGoldRef.current >= SESSION_CAP) {
        if (goldIntervalRef.current) {
          clearInterval(goldIntervalRef.current);
          goldIntervalRef.current = null;
        }
        return;
      }

      sessionGoldRef.current += GOLD_PER_TICK;
      setSessionGold(sessionGoldRef.current);
      setTotalMinutes(sessionGoldRef.current);
    }, TICK_INTERVAL_MS);
  }, [uid]);

  const stopGoldInterval = useCallback(() => {
    if (goldIntervalRef.current) {
      clearInterval(goldIntervalRef.current);
      goldIntervalRef.current = null;
    }
  }, []);

  // Start/stop based on focus + app state
  useEffect(() => {
    if (isFocused && appStateRef.current === 'active' && !capped) {
      startGoldInterval();
    } else {
      stopGoldInterval();
    }
    return stopGoldInterval;
  }, [isFocused, capped, startGoldInterval, stopGoldInterval]);

  // AppState listener
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appStateRef.current = nextState;
      if (nextState === 'active' && isFocused && !capped) {
        startGoldInterval();
      } else {
        stopGoldInterval();
      }
    });
    return () => sub.remove();
  }, [isFocused, capped, startGoldInterval, stopGoldInterval]);

  // ---- Exit handler — flush all earned gold at once ----
  const handleLeave = useCallback(() => {
    stopGoldInterval();
    clearHoldTimer();
    if (enemyRespawnTimer.current) clearTimeout(enemyRespawnTimer.current);

    if (sessionGoldRef.current > 0 && uid && !flushedRef.current) {
      flushedRef.current = true;
      addGold(
        sessionGoldRef.current,
        'adventure_map',
        `adventure_map_${uid}_${Date.now()}`,
        'adventure_map',
        false, // show toast on exit
      );
    }
    navigation.goBack();
  }, [stopGoldInterval, clearHoldTimer, uid, addGold, navigation]);

  // Cleanup on unmount (if user navigates away without pressing Leave)
  useEffect(() => {
    return () => {
      stopGoldInterval();
      clearHoldTimer();
      if (enemyRespawnTimer.current) clearTimeout(enemyRespawnTimer.current);
      // Flush accumulated gold if not already flushed by handleLeave
      if (!flushedRef.current && sessionGoldRef.current > 0 && uid) {
        flushedRef.current = true;
        addGold(
          sessionGoldRef.current,
          'adventure_map',
          `adventure_map_${uid}_${Date.now()}`,
          'adventure_map',
          true, // silent on unmount — no toast
        );
      }
    };
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.textPrimary || '#1F2937'} />
        </TouchableOpacity>
        <Text style={styles.header}>Adventure Map</Text>
        <GoldDisplay gold={gold || 0} />
      </View>

      {/* Session info bar */}
      <View style={styles.sessionBar}>
        <View style={styles.sessionRow}>
          <MaterialCommunityIcons name="circle-multiple" size={16} color="#F59E0B" />
          <Text style={styles.sessionGoldText}>+{sessionGold} Gold this session</Text>
        </View>
        <Text style={styles.sessionTimeText}>
          {capped ? 'Max reached (60 min)' : `${totalMinutes} min`}
        </Text>
      </View>

      {/* Battle area */}
      <View style={styles.battleArea} onLayout={handleLayout}>

        {/* Enemy placeholder */}
        <Animated.View style={[styles.enemyArea, enemyAnimStyle]}>
          <View style={styles.enemyCircle}>
            <MaterialCommunityIcons
              name={enemyIcon as any}
              size={48}
              color="#DC2626"
            />
          </View>
        </Animated.View>


        {/* Companion sprite */}
        {measuredWidth > 0 && (
          <View style={styles.companionArea}>
            <SpriteAnimator
              asset={resolvedAsset}
              skImage={imageMap[currentAnim] ?? imageMap.idle ?? null}
              playing={isFocused}
              loops={loopsProp}
              displayWidth={measuredWidth * 0.6}
              displayHeight={BATTLE_AREA_HEIGHT}
              onAnimationEnd={shouldFireEnd ? handleAnimationEnd : undefined}
            />
          </View>
        )}
      </View>

      {/* Gold per minute indicator */}
      <View style={styles.rateBar}>
        <MaterialCommunityIcons name="timer-sand" size={14} color={Colors.textSecondary || '#6B7280'} />
        <Text style={styles.rateText}>
          {capped ? 'Session cap reached — leave to bank your gold!' : `Earning ${GOLD_PER_TICK} gold / minute`}
        </Text>
      </View>

      {/* Leave button */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={handleLeave}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="exit-run" size={20} color="#fff" />
          <Text style={styles.leaveButtonText}>Leave Adventure</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md || 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  header: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  sessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md || 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.md || 12,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionGoldText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  sessionTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  battleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md || 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.lg || 16,
    overflow: 'hidden',
  },
  companionArea: {
    flex: 3,
    height: BATTLE_AREA_HEIGHT,
    overflow: 'hidden',
    // backgroundColor: 'rgb(0, 225, 255)',
  },
  enemyArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  bottomSection: {
    paddingHorizontal: Spacing.md || 16,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4200FF',
    borderRadius: BorderRadius.md || 12,
    paddingVertical: 14,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
