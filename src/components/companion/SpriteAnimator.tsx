/**
 * SpriteAnimator — Skia-based sprite sheet renderer with variable per-frame timing.
 *
 * Renders a horizontal PNG strip sprite sheet by clipping to a single frame
 * and advancing the clip offset based on per-frame delays from JSON metadata.
 *
 * Animation is driven entirely on the UI thread via Reanimated useFrameCallback.
 *
 * Accepts a pre-resolved SkImage to avoid load delays during animation transitions.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Canvas,
  Image,
  Group,
  useImage,
  rect,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  runOnJS,
} from 'react-native-reanimated';
import type { SpriteAssetEntry } from './types';

interface SpriteAnimatorProps {
  /** The sprite animation asset metadata */
  asset: SpriteAssetEntry;
  /** Pre-resolved Skia image (from useCharacterImages preloader). Falls back to internal useImage if omitted. */
  skImage?: SkImage | null;
  /** Whether the animation is playing (default: true) */
  playing?: boolean;
  /**
   * Number of full cycles to play.
   * - undefined or Infinity → loop forever
   * - 1 → play once then fire onAnimationEnd
   * - N → play N cycles then fire onAnimationEnd
   */
  loops?: number;
  /** Width of the display container in dp */
  displayWidth: number;
  /** Height of the display container in dp */
  displayHeight: number;
  /** Called when a non-looping animation completes its last frame */
  onAnimationEnd?: () => void;
}

const TICK_MS = 1000 / 60; // 1 tick = ~16.67ms

export default function SpriteAnimator({
  asset,
  skImage,
  playing = true,
  loops,
  displayWidth,
  displayHeight,
  onAnimationEnd,
}: SpriteAnimatorProps) {
  const { frameDelays, frameWidth, frameHeight, frameCount, imageWidth } = asset.meta;

  // Fallback: load image internally if not preloaded
  const fallbackImage = useImage(skImage ? null : asset.image);
  const resolvedImage = skImage ?? fallbackImage;

  // Shared animation state (UI thread)
  const currentFrame = useSharedValue(0);
  const elapsedTicks = useSharedValue(0);
  const completedCycles = useSharedValue(0);
  const finished = useSharedValue(false);

  const loopForever = loops === undefined || loops === Infinity;
  const maxCycles = loopForever ? 0 : loops;

  // Reset animation state when asset changes
  useEffect(() => {
    currentFrame.value = 0;
    elapsedTicks.value = 0;
    completedCycles.value = 0;
    finished.value = false;
  }, [asset]);

  // Store callback ref for runOnJS
  const onEndRef = useRef(onAnimationEnd);
  onEndRef.current = onAnimationEnd;

  const fireOnEnd = useCallback(() => {
    onEndRef.current?.();
  }, []);

  // Frame callback — runs on UI thread at ~60fps
  useFrameCallback((frameInfo) => {
    'worklet';
    if (!playing || finished.value) return;

    const deltaMs = frameInfo.timeSincePreviousFrame ?? TICK_MS;
    const deltaTicks = deltaMs / TICK_MS;
    elapsedTicks.value += deltaTicks;

    // Advance frames based on accumulated ticks
    let frame = currentFrame.value;
    let ticks = elapsedTicks.value;
    const delays = frameDelays;

    while (ticks >= delays[frame]) {
      ticks -= delays[frame];
      frame += 1;

      if (frame >= frameCount) {
        completedCycles.value += 1;
        if (loopForever || completedCycles.value < maxCycles) {
          frame = 0;
        } else {
          frame = frameCount - 1;
          finished.value = true;
          runOnJS(fireOnEnd)();
          break;
        }
      }
    }

    currentFrame.value = frame;
    elapsedTicks.value = ticks;
  });

  // Compute image X offset to show current frame
  const imageXOffset = useDerivedValue(() => {
    return -currentFrame.value * frameWidth;
  });

  if (!resolvedImage) return null;

  // No scaling — render at native resolution
  // Anchor the frame's anchor point (fromRight, fromBottom) to the container's fixed anchor (80% width, bottom)
  const { fromRight = 0, fromBottom = 0 } = asset.meta.anchor ?? {};
  const anchorX = displayWidth * 0.8;
  const offsetX = anchorX - frameWidth + fromRight;
  const offsetY = displayHeight - frameHeight + fromBottom;

  const clipRect = rect(0, 0, frameWidth, frameHeight);

  return (
    <Canvas style={{ width: displayWidth, height: displayHeight }}>
      <Group
        clip={clipRect}
        transform={[
          { translateX: offsetX },
          { translateY: offsetY },
        ]}
      >
        <Image
          image={resolvedImage}
          x={imageXOffset}
          y={0}
          width={imageWidth}
          height={frameHeight}
          fit="fill"
        />
      </Group>
    </Canvas>
  );
}
