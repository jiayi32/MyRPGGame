// ─── Joystick Overlay Component ────────────────────────────────────
// A virtual joystick for player movement on the world map.
// Uses Pan gesture from react-native-gesture-handler for smooth input.
// Translates gesture displacement into world-space dx/dy in meters.

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useWorldStore } from '@/stores/worldStore';

const JOYSTICK_SIZE = 140;
const KNOB_SIZE = 56;
const MAX_DRAG = 50; // pixels — maps to max movement speed
const METERS_PER_PIXEL = 5; // scaling factor: px drag → meters moved

export const JoystickOverlay: React.FC = () => {
  const moveVirtual = useWorldStore((s) => s.moveVirtual);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastDx = useRef(0);
  const lastDy = useRef(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Clamp translation within joystick bounds
      const dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, e.translationX));
      const dy = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, e.translationY));
      translateX.value = dx;
      translateY.value = dy;

      // Convert to world meters and dispatch
      const dxMeters = (dx - lastDx.current) * METERS_PER_PIXEL;
      const dyMeters = (dy - lastDy.current) * METERS_PER_PIXEL;

      if (Math.abs(dxMeters) > 0.5 || Math.abs(dyMeters) > 0.5) {
        runOnJS(moveVirtual)(dxMeters, dyMeters);
      }

      lastDx.current = dx;
      lastDy.current = dy;
    })
    .onEnd(() => {
      // Spring back to center
      translateX.value = withSpring(0, { stiffness: 200, damping: 15 });
      translateY.value = withSpring(0, { stiffness: 200, damping: 15 });
      lastDx.current = 0;
      lastDy.current = 0;
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.joystickBase}>
          <Animated.View style={[styles.knob, knobStyle]}>
            <View style={styles.knobInner} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    zIndex: 100,
  },
  joystickBase: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.6)',
  },
});
