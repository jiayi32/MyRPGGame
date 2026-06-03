// ─── GameMapGL ─────────────────────────────────────────────────────
// The main map component: wraps expo-gl's GLView with a Three.js scene.
// Gestures use module-level variables + module-scope 'worklet' functions
// to avoid Reanimated serialization warnings on React ref `.current`.

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as THREE from 'three';
import { useGameMap, type GameMapRefs } from '@/hooks/useGameMap';

// ─── Module-level holders (captured by worklets without serialization) ──
let _orbit: ((dh: number, dt: number, zf: number) => void) | null = null;
let _onTap: ((intersects: THREE.Intersection[]) => void) | null = null;
let _doTap: ((x: number, y: number) => void) | null = null;

function panW(e: { changeX: number; changeY: number }) {
  'worklet';
  if (_orbit) runOnJS(_orbit)(e.changeX, e.changeY, 1);
}
function pinchW(e: { scale: number }) {
  'worklet';
  if (_orbit) runOnJS(_orbit)(0, 0, 1 / e.scale);
}
function tapW(e: { x: number; y: number }) {
  'worklet';
  if (_doTap) runOnJS(_doTap)(e.x, e.y);
}

// ─── Props ─────────────────────────────────────────────────────────

export interface GameMapGLProps {
  onReady?: (refs: GameMapRefs) => void;
  sceneRef?: React.MutableRefObject<GameMapRefs | null>;
  initialTilt?: number;
  initialHeading?: number;
  pixelSize?: number;
  onEntityTap?: (intersects: THREE.Intersection[]) => void;
  children?: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────

export const GameMapGL: React.FC<GameMapGLProps> = ({
  onReady, sceneRef, initialTilt = 45, initialHeading = 0,
  pixelSize = 4, onEntityTap, children,
}) => {
  const { onContextCreate, isReady, refs, orbitCamera, screenToRay } =
    useGameMap({ initialTilt, initialHeading, pixelSize });

  useEffect(() => {
    if (sceneRef && refs.current) sceneRef.current = refs.current;
  }, [isReady, refs, sceneRef]);

  const fired = useRef(false);
  useEffect(() => {
    if (isReady && !fired.current && refs.current) {
      fired.current = true;
      onReady?.(refs.current);
    }
  }, [isReady, refs, onReady]);

  // ── Update module-level callbacks each render ──────────────────
  _orbit = orbitCamera;
  _onTap = onEntityTap;

  // ── Tap → Raycaster (runs on JS thread via runOnJS) ────────────
  _doTap = useCallback(
    (x: number, y: number) => {
      const rc = screenToRay(x, y);
      if (!rc || !refs.current) return;
      const hits = rc.intersectObjects(refs.current.scene.children, true);
      if (hits.length > 0 && _onTap) _onTap(hits);
    },
    [screenToRay, refs],
  );

  // ── Gestures use module-scope worklet callbacks ────────────────
  const pan = useMemo(
    () => Gesture.Pan().onUpdate(panW).minPointers(1).maxPointers(2), [],
  );
  const pinch = useMemo(() => Gesture.Pinch().onUpdate(pinchW), []);
  const tap = useMemo(() => Gesture.Tap().onEnd(tapW), []);

  const composed = useMemo(
    () => Gesture.Simultaneous(pan, pinch, tap), [pan, pinch, tap],
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <GLView style={styles.glView} onContextCreate={onContextCreate} />
      </GestureDetector>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  glView: { flex: 1 },
});

export default GameMapGL;
