/**
 * useMapGestures.ts — Pan, pinch-to-zoom, and tap gesture handling
 * for the isometric tile map.
 *
 * Transform model
 * ---------------
 * All gesture math assumes:  screenPt = scale * mapPt + translate
 * React Native applies transforms from the view center, so the animated style
 * compensates:  styleTx = tx + cx*(s-1)  where cx = containerWidth/2.
 *
 * Tap hit-testing is inlined in the worklet with hardcoded literal constants
 * to avoid cross-module worklet serialisation issues with derived constants.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Gesture, type SimultaneousGesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

// Hard limits — pinch will not go beyond these
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
// Soft limits — after pinch ends, snap back inside this range
const SNAP_MIN = 0.6;
const SNAP_MAX = 2.0;
const SNAP_DURATION = 250;

// Isometric constants — hardcoded literals for reliable worklet capture.
// Must stay in sync with tileProjection.ts: TILE_WIDTH(32) * RENDER_SCALE(2.5) / 2
const HW = 40;  // HALF_TILE_W
const HS = 20;  // HALF_SURFACE_H

interface UseMapGesturesConfig {
  mapWidth: number;
  mapHeight: number;
  containerWidth: number;
  containerHeight: number;
  initialScale: number;
  initialTranslateX: number;
  initialTranslateY: number;
  /** Map origin X from computeMapDimensions (for hit testing) */
  mapOriginX: number;
  /** Map origin Y from computeMapDimensions (for hit testing) */
  mapOriginY: number;
  /** Grid columns count (for hit testing bounds) */
  gridCols: number;
  /** Called with the tapped grid index (-1 if tap missed the grid) */
  onTileSelect: (gridIndex: number) => void;
}

interface UseMapGesturesReturn {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  gestureHandler: SimultaneousGesture;
  transformRef: {
    translateX: SharedValue<number>;
    translateY: SharedValue<number>;
    scale: SharedValue<number>;
  };
  resetToFit: () => void;
}

export function useMapGestures(config: UseMapGesturesConfig): UseMapGesturesReturn {
  const {
    containerWidth,
    containerHeight,
    initialScale,
    initialTranslateX,
    initialTranslateY,
    mapOriginX,
    mapOriginY,
    gridCols: gridColsVal,
    onTileSelect,
  } = config;

  const scale = useSharedValue(initialScale);
  const savedScale = useSharedValue(initialScale);
  const translateX = useSharedValue(initialTranslateX);
  const translateY = useSharedValue(initialTranslateY);
  const savedTranslateX = useSharedValue(initialTranslateX);
  const savedTranslateY = useSharedValue(initialTranslateY);

  // Reset when initial values change (e.g., tier upgrade changes map size)
  useEffect(() => {
    scale.value = initialScale;
    savedScale.value = initialScale;
    translateX.value = initialTranslateX;
    translateY.value = initialTranslateY;
    savedTranslateX.value = initialTranslateX;
    savedTranslateY.value = initialTranslateY;
  }, [initialScale, initialTranslateX, initialTranslateY]);

  // Stable callback ref for tile selection
  const onTileSelectRef = useRef(onTileSelect);
  onTileSelectRef.current = onTileSelect;
  const handleTileSelect = useCallback((idx: number) => {
    onTileSelectRef.current(idx);
  }, []);

  // ── Pinch gesture (zoom toward focal point) ──
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.min(
        Math.max(savedScale.value * e.scale, MIN_SCALE),
        MAX_SCALE,
      );
      const scaleRatio = newScale / savedScale.value;
      scale.value = newScale;
      translateX.value =
        e.focalX - scaleRatio * (e.focalX - savedTranslateX.value);
      translateY.value =
        e.focalY - scaleRatio * (e.focalY - savedTranslateY.value);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;

      // Snap back if outside comfortable range
      let targetScale = scale.value;
      if (scale.value < SNAP_MIN) targetScale = SNAP_MIN;
      else if (scale.value > SNAP_MAX) targetScale = SNAP_MAX;

      if (targetScale !== scale.value) {
        // Keep screen center fixed during snap
        const cx = containerWidth / 2;
        const cy = containerHeight / 2;
        const scaleRatio = targetScale / scale.value;
        const newTx = cx - scaleRatio * (cx - translateX.value);
        const newTy = cy - scaleRatio * (cy - translateY.value);

        scale.value = withTiming(targetScale, { duration: SNAP_DURATION });
        translateX.value = withTiming(newTx, { duration: SNAP_DURATION });
        translateY.value = withTiming(newTy, { duration: SNAP_DURATION });
        savedScale.value = targetScale;
        savedTranslateX.value = newTx;
        savedTranslateY.value = newTy;
      }
    });

  // ── Pan gesture ──
  // minDistance prevents short taps from being swallowed by the pan recognizer
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .minDistance(15)
    .onUpdate((e) => {
      'worklet';
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // ── Tap gesture (tile selection) ──
  // Hit test is fully inlined to avoid cross-module worklet constant capture issues.
  // Uses diamond-accurate picking: inverse transform → float grid coords → check 4 candidates.
  const tapGesture = Gesture.Tap()
    .maxDuration(500)
    .onEnd((e) => {
      'worklet';
      const s = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;

      // 1. Invert gesture transform: screenPt → mapPt
      const mapX = (e.absoluteX - tx) / s;
      const mapY = (e.absoluteY - ty) / s;

      // 2. Inverse projection: map pixel → float grid coords
      const dx = mapX - mapOriginX - HW;
      const dy = mapY - mapOriginY - HS;
      const colF = (dx / HW + dy / HS) / 2;
      const rowF = (dy / HS - dx / HW) / 2;

      // 3. Check 4 candidate cells with diamond containment
      const r0 = Math.floor(rowF);
      const c0 = Math.floor(colF);
      const g = gridColsVal;

      let r: number, c: number, cx: number, cy: number;

      r = r0; c = c0;
      if (r >= 0 && r < g && c >= 0 && c < g) {
        cx = mapOriginX + (c - r) * HW + HW;
        cy = mapOriginY + (c + r) * HS + HS;
        if (Math.abs(mapX - cx) / HW + Math.abs(mapY - cy) / HS <= 1.0) {
          runOnJS(handleTileSelect)(r * g + c);
          return;
        }
      }

      r = r0 + 1; c = c0;
      if (r >= 0 && r < g && c >= 0 && c < g) {
        cx = mapOriginX + (c - r) * HW + HW;
        cy = mapOriginY + (c + r) * HS + HS;
        if (Math.abs(mapX - cx) / HW + Math.abs(mapY - cy) / HS <= 1.0) {
          runOnJS(handleTileSelect)(r * g + c);
          return;
        }
      }

      r = r0; c = c0 + 1;
      if (r >= 0 && r < g && c >= 0 && c < g) {
        cx = mapOriginX + (c - r) * HW + HW;
        cy = mapOriginY + (c + r) * HS + HS;
        if (Math.abs(mapX - cx) / HW + Math.abs(mapY - cy) / HS <= 1.0) {
          runOnJS(handleTileSelect)(r * g + c);
          return;
        }
      }

      r = r0 + 1; c = c0 + 1;
      if (r >= 0 && r < g && c >= 0 && c < g) {
        cx = mapOriginX + (c - r) * HW + HW;
        cy = mapOriginY + (c + r) * HS + HS;
        if (Math.abs(mapX - cx) / HW + Math.abs(mapY - cy) / HS <= 1.0) {
          runOnJS(handleTileSelect)(r * g + c);
          return;
        }
      }
    });

  // Compose: pinch + (pan simultaneous with tap)
  // Double-tap removed — recenter button in HUD serves that purpose with no delay.
  const composed = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Simultaneous(panGesture, tapGesture),
  );

  // ── Animated style ──
  // React Native transforms use center origin by default.
  // Our gesture math uses origin-at-0: screenPt = scale * mapPt + translate.
  // Compensate: styleTx = tx + cx*(s - 1) so the visual result matches.
  const animatedStyle = useAnimatedStyle(() => {
    const s = scale.value;
    const cx = containerWidth / 2;
    const cy = containerHeight / 2;
    return {
      transform: [
        { translateX: translateX.value + cx * (s - 1) },
        { translateY: translateY.value + cy * (s - 1) },
        { scale: s },
      ],
    };
  });

  // JS-callable reset (for the HUD recenter button)
  const resetToFit = useCallback(() => {
    scale.value = withTiming(initialScale, { duration: 300 });
    translateX.value = withTiming(initialTranslateX, { duration: 300 });
    translateY.value = withTiming(initialTranslateY, { duration: 300 });
    savedScale.value = initialScale;
    savedTranslateX.value = initialTranslateX;
    savedTranslateY.value = initialTranslateY;
  }, [initialScale, initialTranslateX, initialTranslateY]);

  return {
    animatedStyle,
    gestureHandler: composed,
    transformRef: { translateX, translateY, scale },
    resetToFit,
  };
}
