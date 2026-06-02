// ─── World Store ──────────────────────────────────────────────────
// Zustand store for the persistent GPS world state.
// Tracks real/virtual position, visible spawns, exploration, and encounters.

import { create } from 'zustand';
import type { WorldPosition, WorldSpawn, ExploredTile } from '@/domain/world/types';
import { VIRTUAL_MOVEMENT_RADIUS_M, SPAWN_VISIBLE_RADIUS_M } from '@/domain/world/types';
import { generateVisibleSpawns, gridKey } from '@/domain/world/spawnDirector';
import {
  startLocationTracking,
  stopLocationTracking,
  requestLocationPermission,
  checkLocationPermission,
  clampVirtualPosition,
  type LocationUpdate,
} from '@/services/locationService';

// ─── State Shape ───────────────────────────────────────────────────

export interface WorldStoreState {
  // ── Position ──
  realPosition: WorldPosition | null;
  virtualPosition: WorldPosition | null;
  lastGpsUpdate: number | null;
  gpsPermissionGranted: boolean;
  gpsTracking: boolean;

  // ── Spawns ──
  visibleSpawns: WorldSpawn[];
  spawnGeneratedAt: number; // unix ms, when spawns were last computed

  // ── Exploration ──
  exploredTiles: ExploredTile[];

  // ── Encounter ──
  activeEncounterId: string | null;

  // ── Player ──
  playerTier: number;
  playerLevel: number;

  // ── World Config ──
  worldSeed: number;

  // ── Actions ──
  /** Initialize GPS tracking and load initial position. */
  bootstrap: () => Promise<void>;
  /** Handle a GPS location update. */
  onLocationUpdate: (update: LocationUpdate) => void;
  /** Move the virtual position via joystick input (dx, dy in meters). */
  moveVirtual: (dxMeters: number, dyMeters: number) => void;
  /** Request and set GPS permission. */
  requestPermission: () => Promise<void>;
  /** Start active GPS tracking. */
  startTracking: () => Promise<void>;
  /** Stop GPS tracking (battery save). */
  stopTracking: () => Promise<void>;
  /** Recompute visible spawns for current position. */
  refreshSpawns: () => void;
  /** Mark a spawn as interacted with (beginning encounter). */
  beginEncounter: (spawnId: string) => void;
  /** Clear the active encounter. */
  clearEncounter: () => void;
  /** Set the player's tier and level. */
  setPlayerLevel: (level: number, tier: number) => void;
  /** Cleanup: stop tracking and reset state. */
  teardown: () => Promise<void>;
}

// ─── Defaults ──────────────────────────────────────────────────────

const DEFAULT_WORLD_SEED = 42; // TODO: server-issued per player

// ─── Store ─────────────────────────────────────────────────────────

export const useWorldStore = create<WorldStoreState>()((set, get) => ({
  realPosition: null,
  virtualPosition: null,
  lastGpsUpdate: null,
  gpsPermissionGranted: false,
  gpsTracking: false,
  visibleSpawns: [],
  spawnGeneratedAt: 0,
  exploredTiles: [],
  activeEncounterId: null,
  playerTier: 1,
  playerLevel: 1,
  worldSeed: DEFAULT_WORLD_SEED,

  // ── Bootstrap ──
  bootstrap: async () => {
    const permStatus = await checkLocationPermission();
    set({ gpsPermissionGranted: permStatus === 'granted' });

    if (permStatus === 'granted') {
      await get().startTracking();
    }
  },

  // ── Location Update ──
  onLocationUpdate: (update: LocationUpdate) => {
    const { virtualPosition, exploredTiles } = get();
    const newReal = update.position;

    // Track explored tile
    const key = gridKey(newReal);
    const alreadyExplored = exploredTiles.some((t) => t.gridKey === key);
    const newExplored = alreadyExplored
      ? exploredTiles
      : [...exploredTiles, { gridKey: key, firstVisitedAt: Date.now() }];

    set({
      realPosition: newReal,
      lastGpsUpdate: update.timestamp,
      exploredTiles: newExplored,
    });

    // If no virtual position yet, initialize it at real position
    if (!virtualPosition) {
      set({ virtualPosition: newReal });
    }

    // Refresh spawns when position updates
    get().refreshSpawns();
  },

  // ── Virtual Movement ──
  moveVirtual: (dxMeters: number, dyMeters: number) => {
    const { realPosition, virtualPosition } = get();
    if (!realPosition || !virtualPosition) return;

    // Approximate meter-to-degree conversion at current latitude
    const latPerM = 1 / 111_320;
    const lngPerM = 1 / (111_320 * Math.cos((virtualPosition.lat * Math.PI) / 180));

    const newVirtual: WorldPosition = {
      lat: virtualPosition.lat + dyMeters * latPerM,
      lng: virtualPosition.lng + dxMeters * lngPerM,
    };

    // Clamp to virtual movement radius
    const clamped = clampVirtualPosition(realPosition, newVirtual, VIRTUAL_MOVEMENT_RADIUS_M);

    set({ virtualPosition: clamped });

    // Refresh spawns when virtual position changes significantly
    get().refreshSpawns();
  },

  // ── Permissions ──
  requestPermission: async () => {
    const status = await requestLocationPermission();
    set({ gpsPermissionGranted: status === 'granted' });
  },

  startTracking: async () => {
    await startLocationTracking((update) => {
      get().onLocationUpdate(update);
    });
    set({ gpsTracking: true });
  },

  stopTracking: async () => {
    await stopLocationTracking();
    set({ gpsTracking: false });
  },

  // ── Spawns ──
  refreshSpawns: () => {
    const { virtualPosition, realPosition, playerTier, worldSeed, spawnGeneratedAt } = get();
    const pos = virtualPosition ?? realPosition;
    if (!pos) return;

    const now = Date.now();
    // Throttle: don't regenerate more than once per 3 seconds
    if (now - spawnGeneratedAt < 3000) return;

    const spawns = generateVisibleSpawns({
      playerPosition: pos,
      playerTier,
      worldSeed,
      visibleRadiusM: SPAWN_VISIBLE_RADIUS_M,
      now,
    });

    set({ visibleSpawns: spawns, spawnGeneratedAt: now });
  },

  // ── Encounter ──
  beginEncounter: (spawnId: string) => {
    set({ activeEncounterId: spawnId });
  },

  clearEncounter: () => {
    set({ activeEncounterId: null });
    // Refresh spawns after encounter (consumed spawns should be gone)
    get().refreshSpawns();
  },

  // ── Player Level ──
  setPlayerLevel: (level: number, tier: number) => {
    set({ playerLevel: level, playerTier: tier });
    get().refreshSpawns();
  },

  // ── Teardown ──
  teardown: async () => {
    await get().stopTracking();
    set({
      realPosition: null,
      virtualPosition: null,
      visibleSpawns: [],
      gpsTracking: false,
    });
  },
}));
