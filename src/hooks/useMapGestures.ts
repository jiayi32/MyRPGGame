// ─── useMapGestures ────────────────────────────────────────────────
// Connects react-native-gesture-handler pan/pinch gestures to the
// Three.js PerspectiveCamera orbit system (Google Maps vector style).
//
// Pan horizontal → heading/bearing (spherical.theta)
// Pan vertical   → tilt (spherical.phi), constrained 20°–70°
// Pinch          → zoom/radius (spherical.radius)
//
// Does NOT use Three.js OrbitControls (requires DOM). Uses manual
// spherical math instead, which is more predictable and React Native
// compatible.

import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import * as THREE from 'three';
import type { GameMapRefs } from '@/hooks/useGameMap';

// ─── Constants ─────────────────────────────────────────────────────

/** Radians per pixel of pan gesture. */
const HEADING_SENSITIVITY = 0.005;
/** Radians per pixel of vertical pan. */
const TILT_SENSITIVITY = 0.003;
/** Min tilt from vertical (nearly overhead). */
const MIN_TILT_RAD = THREE.MathUtils.degToRad(20);
/** Max tilt from vertical (near horizon). */
const MAX_TILT_RAD = THREE.MathUtils.degToRad(70);
/** Min camera distance (most zoomed in). */
const MIN_RADIUS = 5;
/** Max camera distance (most zoomed out). */
const MAX_RADIUS = 100;

// ─── Types ─────────────────────────────────────────────────────────

export interface MapGestureState {
  /** Spherical coordinates of the camera relative to the player target. */
  spherical: THREE.Spherical;
  /** Whether a gesture is currently active. */
  isGesturing: SharedValue<boolean>;
}

export interface UseMapGesturesOptions {
  /** Refs to the Three.js scene objects (from useGameMap). */
  mapRefs: React.MutableRefObject<GameMapRefs | null>;
  /** The current player world position (from worldStore). */
  playerWorldPos: SharedValue<{ x: number; z: number } | null>;
  /** Whether gestures are enabled (disable during transitions). */
  enabled?: SharedValue<boolean>;
}

export interface UseMapGesturesReturn {
  /** Combined pan + pinch gesture to attach to the GLView area. */
  mapGesture: ReturnType<typeof Gesture.Simultaneous>;
  /** Animated style for any gesture indicator overlay. */
  gestureIndicatorStyle: ReturnType<typeof useAnimatedStyle>;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useMapGestures(
  options: UseMapGesturesOptions,
): UseMapGesturesReturn {
  const { mapRefs, playerWorldPos } = options;

  // Shared values for gesture state
  const isGesturing = useSharedValue(false);

  // Pan gesture → orbit camera
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          isGesturing.value = true;
        })
        .onUpdate((e) => {
          const refs = mapRefs.current;
          if (!refs) return;

          const cam = refs.camera;
          const playerPos = playerWorldPos.value;
          if (!playerPos) return;

          // Compute current spherical coords
          const playerVec = new THREE.Vector3(playerPos.x, 0, playerPos.z);
          const spherical = new THREE.Spherical().setFromVector3(
            cam.position.clone().sub(playerVec),
          );

          // Horizontal pan → heading/bearing
          spherical.theta -= e.changeX * HEADING_SENSITIVITY;

          // Vertical pan → tilt
          spherical.phi -= e.changeY * TILT_SENSITIVITY;
          spherical.phi = THREE.MathUtils.clamp(
            spherical.phi,
            MIN_TILT_RAD,
            MAX_TILT_RAD,
          );

          // Update camera position
          cam.position.copy(playerVec).add(
            new THREE.Vector3().setFromSpherical(spherical),
          );
          cam.lookAt(playerVec);
        })
        .onEnd(() => {
          isGesturing.value = false;
        })
        .minPointers(1)
        .maxPointers(2),
    [mapRefs, playerWorldPos, isGesturing],
  );

  // Pinch gesture → zoom (radius)
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          isGesturing.value = true;
        })
        .onUpdate((e) => {
          const refs = mapRefs.current;
          if (!refs) return;

          const cam = refs.camera;
          const playerPos = playerWorldPos.value;
          if (!playerPos) return;

          const playerVec = new THREE.Vector3(playerPos.x, 0, playerPos.z);
          const spherical = new THREE.Spherical().setFromVector3(
            cam.position.clone().sub(playerVec),
          );

          // Scale radius by inverse of pinch scale
          spherical.radius = THREE.MathUtils.clamp(
            spherical.radius / e.scale,
            MIN_RADIUS,
            MAX_RADIUS,
          );

          cam.position.copy(playerVec).add(
            new THREE.Vector3().setFromSpherical(spherical),
          );
          cam.lookAt(playerVec);
        })
        .onEnd(() => {
          isGesturing.value = false;
        }),
    [mapRefs, playerWorldPos, isGesturing],
  );

  // Combine pan + pinch so they work simultaneously
  const mapGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture],
  );

  // Dummy animated style (placeholder for future gesture indicator)
  const gestureIndicatorStyle = useAnimatedStyle(() => ({
    opacity: isGesturing.value ? 0.5 : 0,
  }));

  return { mapGesture, gestureIndicatorStyle };
}
