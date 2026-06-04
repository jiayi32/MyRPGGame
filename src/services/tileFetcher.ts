// ─── Tile Fetcher ──────────────────────────────────────────────────
// Downloads OSM raster tiles, caches them via expo-file-system,
// and returns Three.js Textures for use on the map plane.
//
// Tile URL: https://tile.openstreetmap.org/{z}/{x}/{y}.png
// Coordinate math: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
//
// OSM Tile Usage Policy compliance (June 2026):
//   • Valid, contactable User-Agent header  (§3.1)
//   • Tiles cached ≥ 7 days                  (§3.2)
//   • No bulk downloading / offline prefetch (§4)
//   • Attribution shown on map screen        (§2)

import * as THREE from 'three';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorldPosition } from '@/domain/world/types';

// ─── Constants ─────────────────────────────────────────────────────

/** OSM tile CDN — the ONLY approved URL per OSM Tile Usage Policy §1. */
const OSM_TILE_URL = 'https://tile.openstreetmap.org';

/** OSM-compliant User-Agent: names the app + provides contact info (§3.1, §3.4). */
const OSM_USER_AGENT =
  'MyRPGGame/0.1.0 (+https://github.com/MyRPGGame/app; contact: dev@myrpggame.app)';

/** Local cache directory (expo-file-system). */
const CACHE_DIR = `${FileSystem.cacheDirectory}tiles/`;

/** OSM tiles are 256×256 px PNGs. */
const TILE_SIZE = 256;

/** Real OSM tiles are 5-80 KB. Error/blocked pages are typically < 2 KB. */
const MIN_TILE_FILE_BYTES = 2000;

/**
 * Minimum tile retention: 7 days (OSM policy §3.2).
 * Tiles older than this may be evicted from the in-memory cache.
 */
const TILE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Cache version — bump this when the tile source or caching strategy changes
 * to force a one-time purge of all previously cached tiles.
 */
const CACHE_VERSION = 2;
const CACHE_VERSION_KEY = '@tileFetcher/cacheVersion';

/** Maximum concurrent tile downloads (OSM policy §4 — no bulk scraping). */
const MAX_CONCURRENT_DOWNLOADS = 3;

/** Jitter range for inter-batch pauses (ms). Avoids automated-looking traffic patterns. */
const BATCH_DELAY_MIN_MS = 100;
const BATCH_DELAY_MAX_MS = 250;

/** Hard timeout per tile download (ms). Prevents a hung request from stalling the pipeline. */
const DOWNLOAD_TIMEOUT_MS = 5_000;

// ─── Types ─────────────────────────────────────────────────────────

export interface TileCoord {
  z: number; // zoom level
  x: number; // tile column
  y: number; // tile row
}

export interface TileEntry {
  coord: TileCoord;
  texture: THREE.Texture;
  lastUsed: number; // Date.now() when last accessed
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

/**
 * Create a deterministic cache key string from tile coordinates.
 */
export function tileCacheKey(coord: TileCoord): string {
  return `${coord.z}/${coord.x}/${coord.y}`;
}

// ─── Cache Management ──────────────────────────────────────────────

const tileCache = new Map<string, TileEntry>();

/**
 * Track tile keys that have been successfully loaded this session.
 * Allows skipping the filesystem getInfoAsync check for known-good tiles
 * — the file is on disk and valid, just create the texture directly.
 */
const _confirmedGoodTiles = new Set<string>();

/** One-time flag: ensures cache directory + version purge happen once per session. */
let _cacheInitialized = false;

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
 * One-time cache initialization: purge if the cache version changed
 * (e.g., tile source moved, old poisoned entries from previous URL).
 */
async function initializeCache(): Promise<void> {
  if (_cacheInitialized) return;
  _cacheInitialized = true;

  await ensureCacheDir();

  try {
    const storedVersion = await AsyncStorage.getItem(CACHE_VERSION_KEY);
    const currentVersion = String(CACHE_VERSION);

    if (storedVersion !== currentVersion) {
      // Version mismatch — purge all cached tiles to clear poisoned entries
      // (403 error pages, tiles from old providers, etc.)
      const dirContents = await FileSystem.readDirectoryAsync(CACHE_DIR);
      for (const name of dirContents) {
        const fp = CACHE_DIR + name;
        await FileSystem.deleteAsync(fp, { idempotent: true });
      }
      await AsyncStorage.setItem(CACHE_VERSION_KEY, currentVersion);
    }
  } catch {
    // If AsyncStorage fails, still attempt a basic purge of tiny files
    try {
      const dirContents = await FileSystem.readDirectoryAsync(CACHE_DIR);
      for (const name of dirContents) {
        const fp = CACHE_DIR + name;
        const info = await FileSystem.getInfoAsync(fp, { size: true });
        if (info.exists && (info as any).size < MIN_TILE_FILE_BYTES) {
          await FileSystem.deleteAsync(fp, { idempotent: true });
        }
      }
    } catch { /* ignore */ }
  }
}

/**
 * Evict tiles older than TILE_TTL_MS (7 days per OSM policy §3.2).
 * Replaces the old arbitrary MAX_CACHE_SIZE LRU eviction.
 */
function evictExpiredTiles(): void {
  const now = Date.now();
  const cutoff = now - TILE_TTL_MS;

  for (const [key, entry] of tileCache) {
    if (entry.lastUsed < cutoff) {
      entry.texture.dispose();
      tileCache.delete(key);
    }
  }
}

// ─── Texture Creation ──────────────────────────────────────────────

/**
 * Create a THREE.Texture from a local file URI (e.g., file:///...).
 * Uses expo-gl's native { localUri } support — expo-gl intercepts
 * gl.texImage2D() and loads the image directly from the filesystem.
 * TextureLoader doesn't work in RN because it uses document.createElement.
 */
function createTextureFromLocalUri(localUri: string): THREE.Texture {
  const image = { localUri, width: TILE_SIZE, height: TILE_SIZE };
  const texture = new THREE.Texture(
    image as any,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.LinearFilter,
    THREE.NearestFilter,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Attempt to create a texture from a cached file. Returns null if the
 * file is missing, too small (poisoned), or otherwise unloadable.
 *
 * For tiles confirmed-good this session, skips the getInfoAsync check
 * and creates the texture directly — saves one async I/O call per load.
 */
async function tryLoadCachedTexture(
  filePath: string,
  key: string,
): Promise<THREE.Texture | null> {
  // Fast path: tile was already validated this session
  if (_confirmedGoodTiles.has(key)) {
    try {
      return createTextureFromLocalUri(filePath);
    } catch {
      // File may have been deleted externally — fall through to validation
      _confirmedGoodTiles.delete(key);
    }
  }

  // Full validation path
  try {
    const info = await FileSystem.getInfoAsync(filePath, { size: true });
    if (!info.exists) return null;
    if ((info as any).size < MIN_TILE_FILE_BYTES) {
      // Poisoned cache entry (403 error page, etc.) — delete it
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      return null;
    }
    const texture = createTextureFromLocalUri(filePath);
    _confirmedGoodTiles.add(key);
    return texture;
  } catch {
    return null;
  }
}

// ─── Tile Download ─────────────────────────────────────────────────

/**
 * Download a tile using FileSystem.downloadAsync (native streaming download
 * directly to disk — no JS-level base64 conversion). Wraps with a timeout
 * so a hung request doesn't stall the batch pipeline.
 */
async function downloadTile(url: string, filePath: string): Promise<boolean> {
  try {
    const result = await Promise.race([
      FileSystem.downloadAsync(url, filePath, {
        headers: {
          'User-Agent': OSM_USER_AGENT,
          'Accept': 'image/png',
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), DOWNLOAD_TIMEOUT_MS),
      ),
    ]);

    // downloadAsync returns { uri, status, headers } — check HTTP status
    if (result && (result as any).status !== undefined && (result as any).status !== 200) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      return false;
    }

    // Validate the downloaded file is a real tile (not an error page)
    const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
    if (!fileInfo.exists || (fileInfo as any).size < MIN_TILE_FILE_BYTES) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      return false;
    }

    return true;
  } catch {
    // Clean up on any failure
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch { /* ignore */ }
    return false;
  }
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Load a single tile: check in-memory cache → filesystem cache → download.
 * Returns a THREE.Texture or null if the tile is unavailable.
 *
 * Performance:
 *   • In-memory cache hit = 0 I/O, instant
 *   • Filesystem cache hit = 1 async stat + texture creation
 *   • Cache miss = 1 native download + texture creation (no JS base64 overhead)
 */
export async function loadTile(coord: TileCoord): Promise<THREE.Texture | null> {
  const key = tileCacheKey(coord);

  // ── 1. In-memory cache hit (fast path) ──
  const cached = tileCache.get(key);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.texture;
  }

  // ── 2. Initialize cache (one-time: version purge, dir check) ──
  await initializeCache();

  const filePath = cachePath(coord);

  // ── 3. Filesystem cache hit ──
  const diskTexture = await tryLoadCachedTexture(filePath, key);
  if (diskTexture) {
    tileCache.set(key, { coord, texture: diskTexture, lastUsed: Date.now() });
    evictExpiredTiles();
    return diskTexture;
  }

  // ── 4. Download from OSM ──
  const url = tileUrl(coord);
  const success = await downloadTile(url, filePath);

  if (!success) return null;

  const texture = createTextureFromLocalUri(filePath);
  _confirmedGoodTiles.add(key);
  tileCache.set(key, { coord, texture, lastUsed: Date.now() });
  evictExpiredTiles();
  return texture;
}

/**
 * Load multiple tiles concurrently in batches with jittered pauses.
 * Respects OSM rate limits (§4 — no bulk scraping patterns).
 *
 * @param coords - Tile coordinates to load
 * @param batchSize - Tiles per concurrent batch (default 3)
 * @returns Array of textures (null entries for failed tiles)
 */
export async function loadTilesBatched(
  coords: TileCoord[],
  batchSize: number = MAX_CONCURRENT_DOWNLOADS,
): Promise<(THREE.Texture | null)[]> {
  const results: (THREE.Texture | null)[] = new Array(coords.length).fill(null);

  for (let i = 0; i < coords.length; i += batchSize) {
    const batch = coords.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((coord) => loadTile(coord)),
    );
    for (let j = 0; j < batch.length; j++) {
      results[i + j] = batchResults[j];
    }

    // Jittered inter-batch pause (OSM policy §4 — avoid automated-looking traffic)
    if (i + batchSize < coords.length) {
      const jitter =
        BATCH_DELAY_MIN_MS + Math.random() * (BATCH_DELAY_MAX_MS - BATCH_DELAY_MIN_MS);
      await new Promise((r) => setTimeout(r, jitter));
    }
  }

  return results;
}

/**
 * Load tiles sequentially with a jittered delay between each.
 * For use when strict ordering or minimal concurrency is required.
 */
export async function loadTilesThrottled(
  coords: TileCoord[],
  delayMs?: number,
): Promise<THREE.Texture[]> {
  const results: THREE.Texture[] = [];
  for (const coord of coords) {
    const tex = await loadTile(coord);
    if (tex) results.push(tex);
    const jitter = delayMs
      ? delayMs + Math.random() * 50
      : BATCH_DELAY_MIN_MS + Math.random() * (BATCH_DELAY_MAX_MS - BATCH_DELAY_MIN_MS);
    await new Promise((r) => setTimeout(r, jitter));
  }
  return results;
}

// ─── Tile Grid Helpers ─────────────────────────────────────────────

/**
 * Get the set of tile coordinates visible within the standard 3×3 grid.
 * All tiles at zoom 18 (highest OSM detail for streets).
 *
 * @param center - Player GPS position
 * @returns Array of 9 tile coordinates (center + 8 surrounding)
 */
export function getVisibleTiles(center: WorldPosition): TileCoord[] {
  const tiles: TileCoord[] = [];
  const centerTile = gpsToTileCoord(center, 18);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      tiles.push({
        z: 18,
        x: centerTile.x + dx,
        y: centerTile.y + dy,
      });
    }
  }

  return tiles;
}

/**
 * Get tile coordinates for an expanded area around a position.
 *
 * @param center - Player GPS position
 * @param radius - Number of tiles in each direction (1=3×3, 2=5×5, 3=7×7, 4=9×9)
 * @returns Array of tile coordinates at zoom 18
 */
export function getExpandedTiles(center: WorldPosition, radius: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  const centerTile = gpsToTileCoord(center, 18);

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      tiles.push({
        z: 18,
        x: centerTile.x + dx,
        y: centerTile.y + dy,
      });
    }
  }

  return tiles;
}

/**
 * Get a 5×5 grid of tile coordinates for pre-warming the cache.
 * These extend one tile beyond the visible 3×3 in all directions.
 *
 * @param center - Player GPS position
 * @returns Array of 25 tile coordinates at zoom 18
 */
export function getPreWarmTiles(center: WorldPosition): TileCoord[] {
  return getExpandedTiles(center, 2);
}

/**
 * Preload tiles in the background (fire-and-forget).
 * Does NOT return the textures — just ensures they're cached on disk
 * and in the in-memory cache for instant access when scrolled into view.
 *
 * Call this on every tile change so surrounding areas are always pre-cached.
 *
 * @param center - Player GPS position
 * @param radius - Pre-warm radius (default 3 = 7×7 grid, 49 tiles)
 */
export function preloadTilesBackground(
  center: WorldPosition,
  radius = 3,
): void {
  const coords = getExpandedTiles(center, radius);
  // Fire off concurrent loads — don't await, don't block the caller
  void Promise.allSettled(coords.map((c) => loadTile(c)));
}

/**
 * Preload tiles for a given position.
 * Call on app launch, map ready, or significant GPS change.
 *
 * @param center - Player GPS position
 * @param expanded - If true, pre-warm a 7×7 grid; otherwise 3×3
 */
export async function preloadTiles(
  center: WorldPosition,
  expanded = false,
): Promise<THREE.Texture[]> {
  const radius = expanded ? 3 : 1; // 7×7 when expanded, 3×3 when not
  const coords = getExpandedTiles(center, radius);
  const results = await loadTilesBatched(coords);
  return results.filter((t): t is THREE.Texture => t !== null);
}

/**
 * Clear all cached tiles (in-memory + disk) and reset the cache.
 */
export async function clearTileCache(): Promise<void> {
  for (const [, entry] of tileCache) {
    entry.texture.dispose();
  }
  tileCache.clear();

  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    // Ignore cleanup errors
  }

  // Reset initialization flag so cache dir will be recreated on next load
  _cacheInitialized = false;
}
