// ─── TilePlane ─────────────────────────────────────────────────────
// Creates and manages a PlaneGeometry textured with OSM raster tiles.
// The plane is divided into segments, each textured with a different
// tile from the OSM tile server.
//
// World coordinate mapping:
//   GPS lat/lng offsets → meters → world units on the XZ plane
//   +X = East, +Z = South (Three.js default: Y is up)
//
// June 2026 optimizations:
//   • Sliding-window segment reuse — only create/dispose tiles that
//     actually enter/leave the 3×3 grid when the player moves
//   • Center-tile-first loading — prioritize the tile under the player

import * as THREE from 'three';
import type { WorldPosition } from '@/domain/world/types';
import {
  gpsToTileCoord,
  loadTile,
  tileCacheKey,
  preloadTilesBackground,
  type TileCoord,
} from '@/services/tileFetcher';

// ─── Constants ─────────────────────────────────────────────────────

/** World-units per meter (scale factor for the map plane). */
const WORLD_SCALE = 0.1;

/** Tile size in world units at zoom 18. */
const TILE_WORLD_SIZE = 256 * WORLD_SCALE; // 25.6 world units per tile

/** Number of tiles in each direction from center (odd number recommended). */
const TILE_GRID_RADIUS = 1; // 3×3 grid

// ─── Types ─────────────────────────────────────────────────────────

interface TileSegment {
  mesh: THREE.Mesh;
  coord: TileCoord;
  /** Grid offset from center (for repositioning). */
  gridX: number;
  gridY: number;
  loaded: boolean;
}

interface PendingTexture {
  material: THREE.MeshBasicMaterial;
  coord: TileCoord;
}

// ─── Main Class ────────────────────────────────────────────────────

export class TilePlane {
  readonly group: THREE.Group;
  /** All active segments, keyed by tileCacheKey for O(1) reuse lookup. */
  private segmentMap = new Map<string, TileSegment>();
  private centerCoord: TileCoord | null = null;
  /** Last center tile key for which we triggered a background preload. */
  private lastPreloadKey: string | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'TilePlane';
  }

  /**
   * GPS → world position on the plane.
   * The plane's origin (0,0,0) is the player's anchor position.
   */
  static gpsToWorld(
    pos: WorldPosition,
    origin: WorldPosition,
  ): { x: number; z: number } {
    const latPerMeter = 1 / 111_320;
    const lngPerMeter =
      1 / (111_320 * Math.cos((origin.lat * Math.PI) / 180));

    const x = (pos.lng - origin.lng) / lngPerMeter * WORLD_SCALE;
    const z = -(pos.lat - origin.lat) / latPerMeter * WORLD_SCALE; // Negative: +Z = South
    return { x, z };
  }

  /**
   * Update the tile grid centered on a new GPS position.
   * Uses a sliding-window approach: reuses existing segments that
   * remain in the new 3×3 grid, only creates/destroys tiles at the edges.
   */
  async updateForPosition(center: WorldPosition): Promise<void> {
    const centerTile = gpsToTileCoord(center, 18);

    // No change — skip entirely
    if (
      this.centerCoord &&
      this.centerCoord.x === centerTile.x &&
      this.centerCoord.y === centerTile.y
    ) {
      return;
    }

    this.centerCoord = centerTile;

    // ── Build the set of tile coords for the new 3×3 grid ──
    const newCoords: { coord: TileCoord; gridX: number; gridY: number }[] = [];
    for (let dx = -TILE_GRID_RADIUS; dx <= TILE_GRID_RADIUS; dx++) {
      for (let dy = -TILE_GRID_RADIUS; dy <= TILE_GRID_RADIUS; dy++) {
        newCoords.push({
          coord: { z: 18, x: centerTile.x + dx, y: centerTile.y + dy },
          gridX: dx,
          gridY: dy,
        });
      }
    }

    // ── Identify tiles to keep, add, and remove ──
    const newKeySet = new Set(newCoords.map((c) => tileCacheKey(c.coord)));
    const oldKeys = new Set(this.segmentMap.keys());

    // Tiles leaving the grid → dispose
    for (const key of oldKeys) {
      if (!newKeySet.has(key)) {
        const seg = this.segmentMap.get(key)!;
        seg.mesh.geometry.dispose();
        if (seg.mesh.material instanceof THREE.Material) {
          seg.mesh.material.dispose();
        }
        this.group.remove(seg.mesh);
        this.segmentMap.delete(key);
      }
    }

    // ── Collect pending texture loads (center tile first) ──
    const pending: PendingTexture[] = [];

    for (const { coord, gridX, gridY } of newCoords) {
      const key = tileCacheKey(coord);

      if (this.segmentMap.has(key)) {
        // Tile stays in grid — just reposition it
        const seg = this.segmentMap.get(key)!;
        seg.gridX = gridX;
        seg.gridY = gridY;
        seg.mesh.position.set(
          gridX * TILE_WORLD_SIZE,
          0.01,
          gridY * TILE_WORLD_SIZE,
        );
      } else {
        // New tile entering the grid — create segment
        const segment = this.createTileSegment(coord, gridX, gridY);
        this.segmentMap.set(key, segment);
        this.group.add(segment.mesh);
        pending.push({
          material: segment.mesh.material as THREE.MeshBasicMaterial,
          coord,
        });
      }
    }

    if (pending.length === 0) return;

    // ── Sort: center tile (0,0) loads first, then surrounds ──
    const centerFirst = pending.sort((a, b) => {
      const aIsCenter =
        a.coord.x === centerTile.x && a.coord.y === centerTile.y;
      const bIsCenter =
        b.coord.x === centerTile.x && b.coord.y === centerTile.y;
      if (aIsCenter && !bIsCenter) return -1;
      if (!aIsCenter && bIsCenter) return 1;
      return 0;
    });

    // ── Load center tile immediately, then batch-load surrounds ──
    if (centerFirst.length > 0) {
      const centerEntry = centerFirst[0];
      const isCenter =
        centerEntry.coord.x === centerTile.x &&
        centerEntry.coord.y === centerTile.y;

      if (isCenter) {
        // Load center tile alone first for instant perceived response
        const centerTex = await loadTile(centerEntry.coord);
        if (centerTex) {
          centerEntry.material.map = centerTex;
          centerEntry.material.color = new THREE.Color(0xffffff);
          centerEntry.material.needsUpdate = true;
        }
      }
    }

    // ── Batch-load remaining tiles (skip center if already loaded) ──
    const surrounds = centerFirst.slice(1);
    for (let i = 0; i < surrounds.length; i += 3) {
      const batch = surrounds.slice(i, i + 3);
      const textures = await Promise.all(
        batch.map((p) => loadTile(p.coord)),
      );
      for (let j = 0; j < batch.length; j++) {
        if (textures[j]) {
          batch[j].material.map = textures[j];
          batch[j].material.color = new THREE.Color(0xffffff);
          batch[j].material.needsUpdate = true;
        }
      }
      if (i + 3 < surrounds.length) {
        const jitter = 100 + Math.random() * 150;
        await new Promise((r) => setTimeout(r, jitter));
      }
    }

    // ── Fire-and-forget: pre-cache 7×7 extended area for future movement ──
    const centerKey = tileCacheKey(centerTile);
    if (this.lastPreloadKey !== centerKey) {
      this.lastPreloadKey = centerKey;
      // Preload 7×7 grid (radius 3, 49 tiles) in background — non-blocking
      preloadTilesBackground(center, 3);
    }
  }

  /**
   * Create a single tile segment (PlaneGeometry + MeshBasicMaterial).
   */
  private createTileSegment(
    coord: TileCoord,
    gridX: number,
    gridY: number,
  ): TileSegment {
    const geometry = new THREE.PlaneGeometry(TILE_WORLD_SIZE, TILE_WORLD_SIZE);

    // Debug color based on grid position — visible while texture loads
    const hue = ((gridX * 3 + gridY * 7 + 10) % 12) / 12;
    const debugColor = new THREE.Color().setHSL(hue, 0.6, 0.35);

    const material = new THREE.MeshBasicMaterial({
      color: debugColor,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      gridX * TILE_WORLD_SIZE,
      0.01,
      gridY * TILE_WORLD_SIZE,
    );
    mesh.rotation.x = -Math.PI / 2;

    return { mesh, coord, gridX, gridY, loaded: false };
  }

  /**
   * Get the world position for a GPS coordinate relative to the current origin.
   */
  getWorldPosition(pos: WorldPosition, origin: WorldPosition): THREE.Vector3 {
    const { x, z } = TilePlane.gpsToWorld(pos, origin);
    return new THREE.Vector3(x, 0, z);
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    for (const [, seg] of this.segmentMap) {
      seg.mesh.geometry.dispose();
      if (seg.mesh.material instanceof THREE.Material) {
        seg.mesh.material.dispose();
      }
    }
    this.segmentMap.clear();
  }
}
