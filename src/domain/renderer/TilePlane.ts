// ─── TilePlane ─────────────────────────────────────────────────────
// Creates and manages a PlaneGeometry textured with OSM raster tiles.
// The plane is divided into segments, each textured with a different
// tile from the OSM tile server.
//
// World coordinate mapping:
//   GPS lat/lng offsets → meters → world units on the XZ plane
//   +X = East, +Z = South (Three.js default: Y is up)

import * as THREE from 'three';
import type { WorldPosition } from '@/domain/world/types';
import { gpsToTileCoord, loadTile, type TileCoord } from '@/services/tileFetcher';

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
  loaded: boolean;
}

// ─── Main Class ────────────────────────────────────────────────────

export class TilePlane {
  readonly group: THREE.Group;
  private segments: TileSegment[] = [];
  private centerCoord: TileCoord | null = null;

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
   * Creates/disposes tile meshes as the player moves across tile boundaries.
   */
  async updateForPosition(center: WorldPosition): Promise<void> {
    const centerTile = gpsToTileCoord(center, 18);

    // Skip if we haven't crossed a tile boundary
    if (
      this.centerCoord &&
      this.centerCoord.x === centerTile.x &&
      this.centerCoord.y === centerTile.y
    ) {
      return;
    }

    this.centerCoord = centerTile;

    // Dispose old segments
    for (const seg of this.segments) {
      if (seg.mesh.material instanceof THREE.Material) {
        seg.mesh.material.dispose();
      }
      this.group.remove(seg.mesh);
    }
    this.segments = [];

    // Create new 3×3 tile grid
    for (let dx = -TILE_GRID_RADIUS; dx <= TILE_GRID_RADIUS; dx++) {
      for (let dy = -TILE_GRID_RADIUS; dy <= TILE_GRID_RADIUS; dy++) {
        const zoom = dx === 0 && dy === 0 ? 18 : 17;
        const coord: TileCoord = {
          z: zoom,
          x: Math.floor(centerTile.x / Math.pow(2, 18 - zoom)) + dx,
          y: Math.floor(centerTile.y / Math.pow(2, 18 - zoom)) + dy,
        };

        const segment = await this.createTileSegment(coord, dx, dy);
        this.segments.push(segment);
        this.group.add(segment.mesh);
      }
    }
  }

  /**
   * Create a single tile segment (PlaneGeometry + MeshBasicMaterial).
   */
  private async createTileSegment(
    coord: TileCoord,
    gridX: number,
    gridY: number,
  ): Promise<TileSegment> {
    const geometry = new THREE.PlaneGeometry(TILE_WORLD_SIZE, TILE_WORLD_SIZE);

    // Load tile texture (may be placeholder while loading)
    const texture = await loadTile(coord);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position the tile in world space
    // The center tile (0,0) is at the player position
    mesh.position.set(
      gridX * TILE_WORLD_SIZE,
      0,
      gridY * TILE_WORLD_SIZE,
    );

    // Rotate to lay flat on XZ plane (Three.js plane faces XY by default)
    mesh.rotation.x = -Math.PI / 2;

    return { mesh, coord, loaded: true };
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
    for (const seg of this.segments) {
      seg.mesh.geometry.dispose();
      if (seg.mesh.material instanceof THREE.Material) {
        seg.mesh.material.dispose();
      }
    }
    this.segments = [];
  }
}
