// ─── ExpoWebGLBridge ───────────────────────────────────────────────
// Custom ~50-line bridge between expo-gl's WebGL context and Three.js.
// Replaces the unmaintained `expo-three` package.
//
// Key insight: THREE.WebGLRenderer accepts `context` in constructor
// options, letting us pass expo-gl's native GL context directly.

import * as THREE from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';

/**
 * Creates a Three.js WebGLRenderer backed by an expo-gl context.
 *
 * Usage (inside GLView.onContextCreate):
 *   const { renderer, gl } = createExpoWebGLRenderer(glContext, width, height);
 *   // ... set up scene ...
 *   function animate() {
 *     renderer.render(scene, camera);
 *     gl.endFrameEXP();
 *     requestAnimationFrame(animate);
 *   }
 */
export function createExpoWebGLRenderer(
  gl: ExpoWebGLRenderingContext,
  width: number,
  height: number,
): { renderer: THREE.WebGLRenderer; gl: ExpoWebGLRenderingContext } {
  // Suppress Metro warnings about missing DOM APIs — Three.js in
  // React Native will trigger these, but they're harmless.
  // @ts-expect-error – suppressMetroWarnings is added by three in RN environments
  if (typeof THREE.suppressMetroWarnings === 'function') {
    // @ts-expect-error
    THREE.suppressMetroWarnings();
  }

  const renderer = new THREE.WebGLRenderer({
    context: gl as unknown as WebGLRenderingContext,
    canvas: {
      width,
      height,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement,
    antialias: false, // Pixelation shader makes antialiasing redundant
    alpha: false,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(1); // Fixed at 1 — pixelation handles the look
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x0a0a1a, 1); // Match app dark theme

  return { renderer, gl };
}

/**
 * Dispose the renderer and free GPU resources.
 * Call this when the component unmounts.
 */
export function disposeExpoWebGLRenderer(
  renderer: THREE.WebGLRenderer,
): void {
  renderer.dispose();
}
