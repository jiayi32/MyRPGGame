// ─── useGameMap ────────────────────────────────────────────────────
// Core hook that manages the Three.js scene lifecycle within an expo-gl
// GLView. Creates the renderer, scene, camera, and animation loop.
// Exposes refs + orbitCamera so external gesture handlers can control
// the camera (Google Maps vector style: heading, tilt, zoom).

import { useRef, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import {
  createExpoWebGLRenderer,
  disposeExpoWebGLRenderer,
} from '@/domain/renderer/ExpoWebGLBridge';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface GameMapRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** The expo-gl context — call gl.endFrameEXP() after each render. */
  gl: ExpoWebGLRenderingContext;
}

export interface UseGameMapOptions {
  /** Initial camera tilt from vertical in degrees (0 = overhead, 90 = horizon). */
  initialTilt?: number;
  /** Initial camera heading in degrees (0 = north). */
  initialHeading?: number;
  /** Initial camera distance from player (zoom level). */
  initialRadius?: number;
  /** Pixelation block size (0 = off, 2-8 recommended). */
  pixelSize?: number;
}

export interface UseGameMapReturn {
  /** Call from GLView.onContextCreate. */
  onContextCreate: (gl: ExpoWebGLRenderingContext) => void;
  /** True once the scene is initialized and rendering. */
  isReady: boolean;
  /** Direct refs to the Three.js objects. Only valid when isReady. */
  refs: React.MutableRefObject<GameMapRefs | null>;
  /** Cleanup — call in useEffect return. */
  dispose: () => void;
  /**
   * Orbit the camera around the player target.
   * @param deltaHeading - Radians to rotate heading (horizontal pan).
   * @param deltaTilt - Radians to change tilt (vertical pan).
   * @param zoomFactor - Multiply radius by this factor (pinch zoom).
   */
  orbitCamera: (
    deltaHeading: number,
    deltaTilt: number,
    zoomFactor: number,
  ) => void;
  /**
   * Convert screen coordinates to a 3D ray for entity hit-testing.
   * Returns null if the scene is not ready.
   */
  screenToRay: (screenX: number, screenY: number) => THREE.Raycaster | null;
}

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_TILT_DEG = 45;
const DEFAULT_HEADING_DEG = 0;
const DEFAULT_RADIUS = 30;
const MIN_TILT_RAD = THREE.MathUtils.degToRad(20);
const MAX_TILT_RAD = THREE.MathUtils.degToRad(70);
const MIN_RADIUS = 5;
const MAX_RADIUS = 100;
const HEADING_SENSITIVITY = 0.005;
const TILT_SENSITIVITY = 0.003;

// ─── Hook ──────────────────────────────────────────────────────────

export function useGameMap(options: UseGameMapOptions = {}): UseGameMapReturn {
  const {
    initialTilt = DEFAULT_TILT_DEG,
    initialHeading = DEFAULT_HEADING_DEG,
    initialRadius = DEFAULT_RADIUS,
    pixelSize = 4,
  } = options;

  const refs = useRef<GameMapRefs | null>(null);
  const animationId = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const sphericalRef = useRef(new THREE.Spherical(
    initialRadius,
    THREE.MathUtils.degToRad(90 - initialTilt),
    THREE.MathUtils.degToRad(initialHeading),
  ));
  const composerRef = useRef<EffectComposer | null>(null);

  const dispose = useCallback(() => {
    if (animationId.current !== null) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }
    if (composerRef.current) {
      composerRef.current.dispose();
      composerRef.current = null;
    }
    if (refs.current) {
      disposeExpoWebGLRenderer(refs.current.renderer);
      refs.current = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    return () => { dispose(); };
  }, [dispose]);

  // ── Orbit camera ──────────────────────────────────────────────
  const orbitCamera = useCallback(
    (deltaHeading: number, deltaTilt: number, zoomFactor: number) => {
      const r = refs.current;
      if (!r) return;

      const spherical = sphericalRef.current;

      // Pan horizontal → heading/bearing
      spherical.theta -= deltaHeading * HEADING_SENSITIVITY;

      // Pan vertical → tilt
      spherical.phi -= deltaTilt * TILT_SENSITIVITY;
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi, MIN_TILT_RAD, MAX_TILT_RAD,
      );

      // Pinch → zoom
      spherical.radius = THREE.MathUtils.clamp(
        spherical.radius * zoomFactor, MIN_RADIUS, MAX_RADIUS,
      );

      // Apply to camera (player is always at origin)
      r.camera.position.setFromSpherical(spherical);
      r.camera.lookAt(0, 0, 0);
    },
    [],
  );

  // ── Screen to ray ─────────────────────────────────────────────
  const screenToRay = useCallback(
    (screenX: number, screenY: number): THREE.Raycaster | null => {
      const r = refs.current;
      if (!r) return null;

      // Normalize device coordinates (-1 to 1)
      const ndc = new THREE.Vector2(
        (screenX / r.gl.drawingBufferWidth) * 2 - 1,
        -(screenY / r.gl.drawingBufferHeight) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, r.camera);
      return raycaster;
    },
    [],
  );

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      // 1. Create custom renderer bridge
      const { renderer } = createExpoWebGLRenderer(gl, width, height);

      // 2. Create scene
      const scene = new THREE.Scene();

      // 3. Create PerspectiveCamera
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.setFromSpherical(sphericalRef.current);
      camera.lookAt(0, 0, 0);

      // 4. Set up post-processing (bypassed when pixelSize=0 for compatibility)
      if (pixelSize > 0) {
        try {
          const composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
          composer.addPass(new RenderPixelatedPass(pixelSize, scene, camera));
          composerRef.current = composer;
        } catch {
          // EffectComposer may fail on expo-gl — fall back to direct rendering
          composerRef.current = null;
        }
      }

      // 5. Store refs
      refs.current = { scene, camera, renderer, gl };

      // 6. Animation loop
      const animate = () => {
        animationId.current = requestAnimationFrame(animate);
        if (!refs.current) return;

        const { renderer: r, scene: s, camera: cam, gl: g } = refs.current;

        if (composerRef.current) {
          composerRef.current.render();
        } else {
          r.render(s, cam);
        }
        g.endFrameEXP();
      };

      animate();
      setIsReady(true);
    },
    [initialTilt, initialHeading, initialRadius, pixelSize],
  );

  return { onContextCreate, isReady, refs, dispose, orbitCamera, screenToRay };
}
