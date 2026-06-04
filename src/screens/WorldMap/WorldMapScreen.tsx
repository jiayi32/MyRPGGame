// ─── World Map Screen ─────────────────────────────────────────────
// Primary game screen showing the GPS world map with spawn markers,
// joystick overlay for virtual movement, and action controls.
//
// Now renders via custom expo-gl + Three.js engine (GameMapGL)
// instead of MapLibre. All HUD overlays remain React Native Views.

import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as THREE from 'three';

import { GameMapGL } from '@/components/organisms/GameMapGL';
import type { GameMapRefs } from '@/hooks/useGameMap';
import { TilePlane } from '@/domain/renderer/TilePlane';
import { useWorldStore } from '@/stores/worldStore';
import { JoystickOverlay } from '@/components/molecules/JoystickOverlay';
import type { WorldSpawn, WorldPosition } from '@/domain/world/types';
import { gpsToTileCoord, tileCacheKey, preloadTiles } from '@/services/tileFetcher';

// ─── Spawn Marker Colors ───────────────────────────────────────────

const SPAWN_COLORS: Record<WorldSpawn['type'], string> = {
  patrol: '#ff4444',
  elite: '#ff8800',
  boss: '#ff0000',
  data_vault: '#44aaff',
  resource_node: '#44ff44',
  vendor: '#ffdd44',
  anomaly: '#cc44ff',
  settlement: '#44ddff',
};

// ─── Component ─────────────────────────────────────────────────────

interface WorldMapScreenProps {
  onSpawnPress?: (spawn: WorldSpawn) => void;
  onMenuPress?: () => void;
}

export const WorldMapScreen: React.FC<WorldMapScreenProps> = ({
  onSpawnPress,
  onMenuPress,
}) => {
  const {
    virtualPosition,
    realPosition,
    gpsPermissionGranted,
    gpsTracking,
    visibleSpawns,
    playerLevel,
    playerTier,
    bootstrap,
    requestPermission,
    startTracking,
    beginEncounter,
  } = useWorldStore();

  // ── Three.js scene refs (populated by GameMapGL.onReady) ──
  const mapRefs = useRef<GameMapRefs | null>(null);
  const tilePlaneRef = useRef<TilePlane | null>(null);
  /** Map spawn.id → THREE.Sprite for lifecycle management. */
  const spawnSpriteMap = useRef<Map<string, THREE.Sprite>>(new Map());
  /** Player marker sprite (ring + dot). */
  const playerMarkerRef = useRef<THREE.Group | null>(null);

  // ── Tile update debounce state ────────────────────────────────
  /** Last tile key that triggered a full grid refresh. */
  const lastTileKeyRef = useRef<string | null>(null);
  /** Timestamp of the last grid refresh (for 300ms throttle). */
  const lastTileRefreshRef = useRef<number>(0);
  /** Minimum interval between tile grid refreshes (ms). */
  const TILE_REFRESH_THROTTLE_MS = 300;

  // Bootstrap GPS on mount; teardown on unmount/bundle-reload to
  // prevent native expo-location crash when the JS runtime restarts.
  useEffect(() => {
    bootstrap();
    return () => {
      useWorldStore.getState().teardown();
    };
  }, [bootstrap]);

  // ── Handle spawn tap ──────────────────────────────────────────
  const handleSpawnPress = useCallback(
    (spawn: WorldSpawn) => {
      if (spawn.type === 'resource_node' || spawn.type === 'vendor') {
        Alert.alert(
          spawn.label,
          `Tier ${spawn.tier} ${spawn.type.replace('_', ' ')}. Interaction coming soon.`,
        );
        return;
      }
      beginEncounter(spawn.id);
      onSpawnPress?.(spawn);
    },
    [beginEncounter, onSpawnPress],
  );

  const position = virtualPosition ?? realPosition;
  const showPermissionPrompt = !gpsPermissionGranted;
  const showLoading = gpsPermissionGranted && !position;
  const showMap = gpsPermissionGranted && !!position;

  // Track latest position in a ref so handleMapReady can seed tiles
  // even if the position effect already fired before the map was ready.
  const positionRef = useRef(position);
  positionRef.current = position;

  // ── GameMapGL onReady: set up scene entities ───────────────────
  const handleMapReady = useCallback(
    (refs: GameMapRefs) => {
      mapRefs.current = refs;
      const { scene } = refs;

      // Create tile plane and add to scene
      const tilePlane = new TilePlane();
      tilePlaneRef.current = tilePlane;
      scene.add(tilePlane.group);

      // Immediately seed tiles if GPS position is already available
      const initialPos = positionRef.current;
      if (initialPos) {
        tilePlane.updateForPosition(initialPos).then(() => {
          // After visible tiles load, pre-warm 7×7 surround (49 tiles) in background
          preloadTiles(initialPos, true).catch(() => {});
        });
      }

      // Create player marker (cyan ring + dot)
      const playerGroup = new THREE.Group();
      playerGroup.name = 'PlayerMarker';

      // Outer ring
      const ringGeo = new THREE.RingGeometry(2, 2.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2; // Lay flat on XZ plane
      playerGroup.add(ring);

      // Inner dot
      const dotGeo = new THREE.CircleGeometry(0.8, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.y = 0.01; // Slightly above ring to avoid z-fighting
      playerGroup.add(dot);

      playerMarkerRef.current = playerGroup;
      scene.add(playerGroup);

      // Create radius ring around real GPS anchor
      if (realPosition) {
        const radiusRingGeo = new THREE.RingGeometry(50, 50.5, 64);
        const radiusRingMat = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.08,
        });
        const radiusRing = new THREE.Mesh(radiusRingGeo, radiusRingMat);
        radiusRing.rotation.x = -Math.PI / 2;
        radiusRing.name = 'VirtualRadiusRing';
        scene.add(radiusRing);
      }
    },
    [realPosition],
  );

  // ── Sync position → TilePlane (debounced to tile boundary + 300ms throttle) ──
  useEffect(() => {
    if (!position || !tilePlaneRef.current) return;

    const centerTile = gpsToTileCoord(position, 18);
    const newKey = tileCacheKey(centerTile);
    const now = Date.now();

    // Skip if still on the same tile
    if (lastTileKeyRef.current === newKey) return;

    // Skip if throttle window hasn't elapsed
    if (now - lastTileRefreshRef.current < TILE_REFRESH_THROTTLE_MS) return;

    lastTileKeyRef.current = newKey;
    lastTileRefreshRef.current = now;

    tilePlaneRef.current.updateForPosition(position);
  }, [position]);

  // ── Sync visibleSpawns → Three.js Sprites ─────────────────────
  useEffect(() => {
    const refs = mapRefs.current;
    if (!refs) return;

    const { scene } = refs;
    const currentMap = spawnSpriteMap.current;
    const currentIds = new Set(visibleSpawns.map((s) => s.id));

    // Remove sprites for spawns that disappeared
    for (const [id, sprite] of currentMap) {
      if (!currentIds.has(id)) {
        scene.remove(sprite);
        if (sprite.material instanceof THREE.Material) {
          sprite.material.dispose();
        }
        currentMap.delete(id);
      }
    }

    // Add sprites for new spawns
    for (const spawn of visibleSpawns) {
      if (currentMap.has(spawn.id)) continue;

      // Create a simple colored circle sprite
      const canvas = { width: 64, height: 64 } as HTMLCanvasElement;
      // For React Native, create a DataTexture with the spawn color
      const colorHex = SPAWN_COLORS[spawn.type] ?? '#888888';
      const color = new THREE.Color(colorHex);
      const size = 64;
      const data = new Uint8Array(size * size * 4);
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 4;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= radius && dist >= radius - 4) {
            // Ring
            data[idx] = Math.round(color.r * 255);
            data[idx + 1] = Math.round(color.g * 255);
            data[idx + 2] = Math.round(color.b * 255);
            data[idx + 3] = 255;
          } else if (dist < radius - 4) {
            // Filled center (semi-transparent)
            data[idx] = Math.round(color.r * 255);
            data[idx + 1] = Math.round(color.g * 255);
            data[idx + 2] = Math.round(color.b * 255);
            data[idx + 3] = 80;
          } else {
            // Outside — transparent
            data[idx + 3] = 0;
          }
        }
      }

      const texture = new THREE.DataTexture(
        data,
        size,
        size,
        THREE.RGBAFormat,
      );
      texture.needsUpdate = true;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;

      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3, 3, 1);
      sprite.name = spawn.id;
      sprite.userData = { spawn };

      // Position the sprite in world space
      // World coords: +X = East, +Z = South (Three.js default)
      const origin: WorldPosition = position ?? { lat: 0, lng: 0 };
      const { x, z } = TilePlane.gpsToWorld(spawn.position, origin);
      sprite.position.set(x, 0.05, z); // Slightly above plane

      scene.add(sprite);
      currentMap.set(spawn.id, sprite);
    }

    // Cleanup on unmount
    return () => {
      for (const [, sprite] of currentMap) {
        scene.remove(sprite);
        if (sprite.material instanceof THREE.Material) {
          sprite.material.dispose();
        }
      }
      currentMap.clear();
    };
  }, [visibleSpawns, position]);

  // ── Spawn tap via Raycaster (passed to GameMapGL) ──────────────
  const handleEntityTap = useCallback(
    (intersects: THREE.Intersection[]) => {
      for (const intersect of intersects) {
        // Walk up the parent chain to find a sprite with userData.spawn
        let obj: THREE.Object3D | null = intersect.object;
        while (obj) {
          const spawn = (obj.userData as Record<string, unknown>)?.spawn as
            | WorldSpawn
            | undefined;
          if (spawn) {
            handleSpawnPress(spawn);
            return;
          }
          obj = obj.parent;
        }
      }
    },
    [handleSpawnPress],
  );

  // ── Cleanup scene entities on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      if (tilePlaneRef.current) {
        tilePlaneRef.current.dispose();
        tilePlaneRef.current = null;
      }
      spawnSpriteMap.current.clear();
      playerMarkerRef.current = null;
    };
  }, []);

  // ── Single stable render tree ──────────────────────────────────
  //    GameMapGL renders the 3D map via expo-gl + Three.js.
  //    React Native HUD views sit on top via absolute positioning.
  return (
    <View style={styles.container}>
      {/* ── 3D Map (always mounted; internally handles GL context) ── */}
      {showMap && (
        <GameMapGL
          sceneRef={mapRefs}
          initialTilt={45}
          initialHeading={0}
          pixelSize={0}
          onEntityTap={handleEntityTap}
          onReady={handleMapReady}
        />
      )}

      {/* ── Permission prompt overlay ── */}
      {showPermissionPrompt && (
        <View style={styles.overlay}>
          <View style={styles.centeredContent}>
            <Text style={styles.title}>Grid Link Required</Text>
            <Text style={styles.subtitle}>
              This game uses your location to generate the world around you.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={async () => {
                await requestPermission();
                await startTracking();
              }}
            >
              <Text style={styles.permissionButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Loading overlay ── */}
      {showLoading && (
        <View style={styles.overlay}>
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#00ffff" />
            <Text style={styles.loadingText}>Calibrating Grid Position...</Text>
          </View>
        </View>
      )}

      {/* ── HUD + Joystick + BottomBar (only when map is visible) ── */}
      {showMap && (
        <>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
            <View style={styles.playerInfo}>
              <Text style={styles.playerLevel}>Lv.{playerLevel}</Text>
              <Text style={styles.playerTier}>T{playerTier}</Text>
            </View>
            <View style={styles.statusIndicators}>
              <View
                style={[
                  styles.gpsDot,
                  { backgroundColor: gpsTracking ? '#44ff44' : '#ff4444' },
                ]}
              />
              <Text style={styles.gpsText}>{gpsTracking ? 'LIVE' : '---'}</Text>
            </View>
          </View>

          <JoystickOverlay />

          {/* OSM Attribution — required by OSM Tile Usage Policy §2 */}
          <View style={styles.attributionContainer} pointerEvents="none">
            <Text style={styles.attributionText}>
              © OpenStreetMap contributors
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🎒</Text>
              <Text style={styles.actionLabel}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionLabel}>Character</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🗺️</Text>
              <Text style={styles.actionLabel}>Quests</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a1a',
    zIndex: 10,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#00ffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'JetBrainsMono',
  },
  subtitle: {
    color: '#8899aa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#667788',
    fontSize: 14,
    marginTop: 12,
    fontFamily: 'JetBrainsMono',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  menuIcon: { color: '#00ffff', fontSize: 20 },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
  },
  playerLevel: { color: '#00ffff', fontSize: 14, fontWeight: '700' },
  playerTier: {
    color: '#00ffff',
    fontSize: 12,
    opacity: 0.7,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,255,255,0.3)',
    paddingLeft: 8,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: { color: '#667788', fontSize: 11, fontFamily: 'JetBrainsMono' },

  // OSM attribution (required by OSM Tile Usage Policy §2)
  attributionContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  attributionText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    fontFamily: 'JetBrainsMono',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    gap: 8,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 22 },
  actionLabel: {
    color: '#667788',
    fontSize: 9,
    marginTop: 1,
    fontFamily: 'JetBrainsMono',
  },
});
