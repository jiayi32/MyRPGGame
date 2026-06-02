// ─── World Domain Types ───────────────────────────────────────────
// GPS-based persistent world model for the sci-fi RPG.
// Replaces the roguelite run-domain types.

/** A WGS84 coordinate pair. */
export interface WorldPosition {
  readonly lat: number;
  readonly lng: number;
}

/** Meters of virtual movement allowed from the real GPS anchor. */
export const VIRTUAL_MOVEMENT_RADIUS_M = 500;

/** Grid cell size in meters (≈0.0018° at equator). */
export const SPAWN_GRID_CELL_SIZE_M = 200;

/** How often spawns refresh (milliseconds). */
export const SPAWN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 min

/** Visible radius around the player for spawns (meters). */
export const SPAWN_VISIBLE_RADIUS_M = 300;

// ─── Spawn Types ──────────────────────────────────────────────────

export type SpawnType =
  | 'patrol'        // standard enemy encounter
  | 'elite'         // harder enemy, better rewards
  | 'boss'          // world boss, long cooldown
  | 'data_vault'    // dungeon equivalent
  | 'resource_node' // harvestable materials
  | 'vendor'        // wandering merchant
  | 'anomaly'       // special event / corrupted zone
  | 'settlement';   // player-built or NPC outpost

export interface WorldSpawn {
  readonly id: string;
  readonly type: SpawnType;
  readonly position: WorldPosition;
  /** Deterministic seed derived from grid cell + spawn index. */
  readonly seed: number;
  /** Tier band (1-10). Determines enemy level range. */
  readonly tier: number;
  /** Unix timestamp when this spawn expires and is replaced. */
  readonly expiresAt: number;
  /** Display name shown on the map. */
  readonly label: string;
  /** Archetype/enemy IDs for encounter generation. */
  readonly encounterIds: readonly string[];
}

// ─── Player World State ───────────────────────────────────────────

export interface ExploredTile {
  readonly gridKey: string; // e.g. "12,-34"
  readonly firstVisitedAt: number; // unix ms
}

export interface PlayerWorldState {
  /** The real GPS position (from device). */
  readonly realPosition: WorldPosition | null;
  /** The virtual position offset by joystick movement. */
  readonly virtualPosition: WorldPosition | null;
  /** Last time the real position was updated. */
  readonly lastGpsUpdate: number | null;
  /** Whether GPS permission is granted. */
  readonly gpsPermissionGranted: boolean;
  /** Whether GPS is actively tracking. */
  readonly gpsTracking: boolean;
  /** All currently visible spawns within the visible radius. */
  readonly visibleSpawns: readonly WorldSpawn[];
  /** Fog-of-war: tiles the player has explored. */
  readonly exploredTiles: readonly ExploredTile[];
  /** The currently active encounter, if any. */
  readonly activeEncounterId: string | null;
  /** Player's current tier band (derived from level). */
  readonly playerTier: number;
}
