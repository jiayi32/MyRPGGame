// ─── Tile Fetcher ──────────────────────────────────────────────────
// Downloads OSM raster tiles, caches them via expo-file-system,
// and returns Three.js Textures for use on the map plane.
//
// Tile URL: https://tile.openstreetmap.org/{z}/{x}/{y}.png
// Coordinate math: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames

import * as THREE from 'three';
import * as FileSystem from 'expo-file-system/legacy';
import type { WorldPosition } from '@/domain/world/types';

// ─── Constants ─────────────────────────────────────────────────────

const OSM_TILE_URL = 'https://tile.openstreetmap.org';
const CACHE_DIR = `${FileSystem.cacheDirectory}tiles/`;
const MAX_CACHE_SIZE = 200; // Max tiles before LRU eviction
const TILE_SIZE = 256; // px (standard OSM tile)

// ─── Types ─────────────────────────────────────────────────────────

export interface TileCoord {
  z: number; // zoom level
  x: number; // tile column
  y: number; // tile row
}

export interface TileEntry {
  coord: TileCoord;
  texture: THREE.Texture;
  lastUsed: number; // timestamp for LRU
}

// ─── GPS → Tile Coordinate Math ────────────────────────────────────

/**
 * Convert a GPS position to tile coordinates at a given zoom level.
 * Uses the standard Web Mercator / Slippy Map formula.
 */
export function gpsToTileCoord(pos: WorldPosition, zoom: number): TileCoord {
  const latRad = (pos.lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((pos.lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { z: zoom, x, y };
}

/**
 * Build the URL for an OSM raster tile.
 */
export function tileUrl(coord: TileCoord): string {
  return `${OSM_TILE_URL}/${coord.z}/${coord.x}/${coord.y}.png`;
}

/**
 * Get the local filesystem path for a cached tile.
 */
function cachePath(coord: TileCoord): string {
  return `${CACHE_DIR}${coord.z}_${coord.x}_${coord.y}.png`;
}

// ─── Cache Management ──────────────────────────────────────────────

const tileCache = new Map<string, TileEntry>();

/**
 * Ensure the cache directory exists.
 */
async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Evict least-recently-used tiles when cache exceeds MAX_CACHE_SIZE.
 */
function evictLRU(): void {
  if (tileCache.size <= MAX_CACHE_SIZE) return;

  const entries = Array.from(tileCache.entries());
  entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  const toEvict = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  for (const [key, entry] of toEvict) {
    entry.texture.dispose();
    tileCache.delete(key);
  }
}

/**
 * Create a THREE.Texture from a local file URI (e.g., file:///...).
 * Uses expo-gl's native { localUri } support — expo-gl intercepts
 * gl.texImage2D() and loads the image directly from the filesystem.
 * TextureLoader doesn't work in RN because it uses document.createElement.
 */
function createTextureFromLocalUri(localUri: string): THREE.Texture {
  const texture = new THREE.Texture();
  // expo-gl's texImage2D recognizes { localUri } on the image/source object
  const asset = { localUri };
  (texture as any).image = asset;
  (texture.source as any).data = asset;
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Load a single tile: check cache, fetch if missing, return a THREE.Texture.
 */
export async function loadTile(coord: TileCoord): Promise<THREE.Texture> {
  const key = `${coord.z}/${coord.x}/${coord.y}`;

  // Check in-memory cache
  const cached = tileCache.get(key);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.texture;
  }

  await ensureCacheDir();

  const filePath = cachePath(coord);
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  let localUri: string;

  if (fileInfo.exists) {
    // On-disk cache hit
    localUri = filePath;
  } else {
    // Download from OSM
    const url = tileUrl(coord);
    try {
      const download = await FileSystem.downloadAsync(url, filePath);
      if (download.status !== 200) {
        return createPlaceholderTexture();
      }
      localUri = filePath;
    } catch {
      return createPlaceholderTexture();
    }
  }

  // Load into Three.js Texture via expo-gl's localUri support.
  // TextureLoader uses document.createElement('img') which doesn't exist
  // in React Native. expo-gl's texImage2D natively accepts { localUri }.
  const texture = createTextureFromLocalUri(localUri);

  // Store in cache
  tileCache.set(key, { coord, texture, lastUsed: Date.now() });
  evictLRU();

  return texture;
}

/**
 * Create a gray placeholder texture for loading / error states.
 */
function createPlaceholderTexture(): THREE.Texture {
  const canvas = { width: TILE_SIZE, height: TILE_SIZE } as HTMLCanvasElement;
  // For React Native, create a DataTexture instead
  const size = TILE_SIZE;
  const data = new Uint8Array(size * size * 4);
  // Fill with dark gray
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    data[offset] = 30;     // R
    data[offset + 1] = 30; // G
    data[offset + 2] = 40; // B
    data[offset + 3] = 255; // A
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

/**
 * Get the set of tile coordinates visible within a radius of a position.
 * Returns a 3×3 grid of tiles at varying LOD levels.
 *
 * @param center - Player GPS position
 * @returns Array of tile coordinates to load
 */
export function getVisibleTiles(center: WorldPosition): TileCoord[] {
  const tiles: TileCoord[] = [];

  // Center tile at zoom 18 (highest detail)
  const centerTile = gpsToTileCoord(center, 18);
  tiles.push(centerTile);

  // Adjacent 8 tiles at zoom 17 (medium detail)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue; // Skip center
      tiles.push({
        z: 17,
        x: Math.floor(centerTile.x / 2) + dx,
        y: Math.floor(centerTile.y / 2) + dy,
      });
    }
  }

  return tiles;
}

/**
 * Preload tiles for a given position (call on app launch / GPS update).
 */
export async function preloadTiles(
  center: WorldPosition,
): Promise<THREE.Texture[]> {
  const coords = getVisibleTiles(center);
  const textures = await Promise.all(coords.map(loadTile));
  return textures;
}

/**
 * Clear all cached tiles and reset the cache.
 */
export async function clearTileCache(): Promise<void> {
  for (const [, entry] of tileCache) {
    entry.texture.dispose();
  }
  tileCache.clear();

  // Also clear disk cache
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    // Ignore cleanup errors
  }
}
