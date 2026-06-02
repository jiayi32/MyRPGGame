// ─── Spawn Director ───────────────────────────────────────────────
// Deterministic spawn generation based on GPS grid cells.
// Same GPS location + same seed → same spawns. Server-validatable.

import type { WorldPosition, WorldSpawn, SpawnType } from './types';
import { SPAWN_GRID_CELL_SIZE_M } from './types';

// ─── Grid Hashing ─────────────────────────────────────────────────

/**
 * Snap a lat/lng to a grid cell coordinate.
 * Returns the bottom-left corner of the cell.
 */
export function snapToGrid(pos: WorldPosition, cellSizeM: number = SPAWN_GRID_CELL_SIZE_M): WorldPosition {
  // Approximate degrees per meter at the given latitude
  const latPerM = 1 / 111_320;
  const lngPerM = 1 / (111_320 * Math.cos((pos.lat * Math.PI) / 180));

  const latSnap = Math.floor(pos.lat / (cellSizeM * latPerM)) * (cellSizeM * latPerM);
  const lngSnap = Math.floor(pos.lng / (cellSizeM * lngPerM)) * (cellSizeM * lngPerM);

  return { lat: latSnap, lng: lngSnap };
}

/** Generate a deterministic grid key string (e.g., "12.345,-67.890"). */
export function gridKey(pos: WorldPosition, cellSizeM: number = SPAWN_GRID_CELL_SIZE_M): string {
  const snapped = snapToGrid(pos, cellSizeM);
  return `${snapped.lat.toFixed(5)},${snapped.lng.toFixed(5)}`;
}

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a grid key + world seed into a deterministic number. */
function hashGridSeed(gridKey: string, worldSeed: number): number {
  let hash = worldSeed;
  for (let i = 0; i < gridKey.length; i++) {
    hash = ((hash << 5) - hash + gridKey.charCodeAt(i!)) | 0;
  }
  return hash;
}

// ─── Spawn Table ───────────────────────────────────────────────────

interface SpawnTableEntry {
  readonly type: SpawnType;
  readonly weight: number;    // relative probability
  readonly minTier: number;
  readonly maxCount: number;  // max spawns of this type per cell
}

/** Spawn weights per tier band. Tiers 1-10. */
const SPAWN_TABLE: Record<number, SpawnTableEntry[]> = {
  // Tier 1 (levels 1-9)
  1: [
    { type: 'patrol', weight: 70, minTier: 1, maxCount: 8 },
    { type: 'resource_node', weight: 20, minTier: 1, maxCount: 3 },
    { type: 'vendor', weight: 5, minTier: 1, maxCount: 1 },
    { type: 'elite', weight: 5, minTier: 1, maxCount: 1 },
  ],
  // Tier 2 (levels 10-24)
  2: [
    { type: 'patrol', weight: 60, minTier: 2, maxCount: 7 },
    { type: 'resource_node', weight: 20, minTier: 2, maxCount: 3 },
    { type: 'vendor', weight: 5, minTier: 2, maxCount: 1 },
    { type: 'elite', weight: 10, minTier: 2, maxCount: 2 },
    { type: 'data_vault', weight: 5, minTier: 2, maxCount: 1 },
  ],
  // Tier 3 (levels 25-49)
  3: [
    { type: 'patrol', weight: 50, minTier: 3, maxCount: 6 },
    { type: 'resource_node', weight: 18, minTier: 3, maxCount: 3 },
    { type: 'vendor', weight: 5, minTier: 3, maxCount: 1 },
    { type: 'elite', weight: 12, minTier: 3, maxCount: 2 },
    { type: 'data_vault', weight: 8, minTier: 3, maxCount: 1 },
    { type: 'anomaly', weight: 4, minTier: 3, maxCount: 1 },
    { type: 'boss', weight: 3, minTier: 3, maxCount: 1 },
  ],
  // Tier 4 (levels 50-74)
  4: [
    { type: 'patrol', weight: 45, minTier: 4, maxCount: 6 },
    { type: 'resource_node', weight: 15, minTier: 4, maxCount: 3 },
    { type: 'vendor', weight: 5, minTier: 4, maxCount: 1 },
    { type: 'elite', weight: 14, minTier: 4, maxCount: 2 },
    { type: 'data_vault', weight: 10, minTier: 4, maxCount: 2 },
    { type: 'anomaly', weight: 6, minTier: 4, maxCount: 2 },
    { type: 'boss', weight: 5, minTier: 4, maxCount: 1 },
  ],
  // Tier 5 (levels 75-99)
  5: [
    { type: 'patrol', weight: 40, minTier: 5, maxCount: 5 },
    { type: 'resource_node', weight: 14, minTier: 5, maxCount: 3 },
    { type: 'vendor', weight: 5, minTier: 5, maxCount: 1 },
    { type: 'elite', weight: 15, minTier: 5, maxCount: 2 },
    { type: 'data_vault', weight: 12, minTier: 5, maxCount: 2 },
    { type: 'anomaly', weight: 8, minTier: 5, maxCount: 2 },
    { type: 'boss', weight: 6, minTier: 5, maxCount: 1 },
  ],
};

/** Generate the default spawn table entries for tiers 6-10. */
function buildHighTierTable(tier: number): SpawnTableEntry[] {
  const patrolWeight = Math.max(25, 40 - (tier - 5) * 3);
  return [
    { type: 'patrol', weight: patrolWeight, minTier: tier, maxCount: 5 },
    { type: 'resource_node', weight: 12, minTier: tier, maxCount: 3 },
    { type: 'vendor', weight: 5, minTier: tier, maxCount: 1 },
    { type: 'elite', weight: 16, minTier: tier, maxCount: 3 },
    { type: 'data_vault', weight: 14, minTier: tier, maxCount: 2 },
    { type: 'anomaly', weight: 10, minTier: tier, maxCount: 2 },
    { type: 'boss', weight: 8, minTier: tier, maxCount: 2 },
  ];
}

for (let t = 6; t <= 10; t++) {
  SPAWN_TABLE[t] = buildHighTierTable(t);
}

// ─── Public API ────────────────────────────────────────────────────

export interface SpawnDirectorInput {
  readonly playerPosition: WorldPosition;
  readonly playerTier: number;
  readonly worldSeed: number;
  readonly visibleRadiusM: number;
  readonly now: number; // unix ms
}

/**
 * Generate all visible spawns for the player's current position.
 * Deterministic: same inputs → same outputs.
 */
export function generateVisibleSpawns(input: SpawnDirectorInput): WorldSpawn[] {
  const { playerPosition, playerTier, worldSeed, visibleRadiusM, now } = input;

  // Determine which grid cells are in range
  const centerGrid = snapToGrid(playerPosition);
  const cellsInRange = getGridCellsInRadius(centerGrid, visibleRadiusM);

  const spawns: WorldSpawn[] = [];
  const tierTable = SPAWN_TABLE[Math.min(playerTier, 10)] ?? SPAWN_TABLE[5]!;

  for (const cell of cellsInRange) {
    const key = gridKey(cell);
    const cellSeed = hashGridSeed(key, worldSeed);
    const rng = mulberry32(cellSeed);

    // Roll spawns for this cell
    const totalWeight = tierTable.reduce((sum, e) => sum + e.weight, 0);

    for (const entry of tierTable) {
      if (playerTier < entry.minTier) continue;

      // How many of this type in this cell?
      const count = Math.floor(rng() * (entry.maxCount + 1));

      for (let i = 0; i < count; i++) {
        // Offset within cell for visual variety
        const offsetLat = (rng() - 0.5) * SPAWN_GRID_CELL_SIZE_M * (1 / 111_320);
        const offsetLng =
          (rng() - 0.5) *
          SPAWN_GRID_CELL_SIZE_M *
          (1 / (111_320 * Math.cos((cell.lat * Math.PI) / 180)));

        const spawnPos: WorldPosition = {
          lat: cell.lat + offsetLat,
          lng: cell.lng + offsetLng,
        };

        // Only include if within visible radius
        if (distanceM(playerPosition, spawnPos) > visibleRadiusM) continue;

        const spawnSeed = Math.floor(rng() * 2147483647);

        spawns.push({
          id: `${key}:${entry.type}:${i}`,
          type: entry.type,
          position: spawnPos,
          seed: spawnSeed,
          tier: Math.max(entry.minTier, playerTier),
          expiresAt: now + 5 * 60 * 1000, // 5 min
          label: generateSpawnLabel(entry.type, playerTier, i),
          encounterIds: [], // Populated by encounter resolver later
        });
      }
    }
  }

  return spawns;
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Haversine distance in meters between two positions. */
export function distanceM(a: WorldPosition, b: WorldPosition): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aa =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/** Get all grid cells within a radius of a center cell. */
function getGridCellsInRadius(center: WorldPosition, radiusM: number): WorldPosition[] {
  const cells: WorldPosition[] = [];
  const latPerM = 1 / 111_320;
  const lngPerM = 1 / (111_320 * Math.cos((center.lat * Math.PI) / 180));

  const cellsOut = Math.ceil(radiusM / SPAWN_GRID_CELL_SIZE_M) + 1;

  for (let dy = -cellsOut; dy <= cellsOut; dy++) {
    for (let dx = -cellsOut; dx <= cellsOut; dx++) {
      const cell: WorldPosition = {
        lat: center.lat + dy * SPAWN_GRID_CELL_SIZE_M * latPerM,
        lng: center.lng + dx * SPAWN_GRID_CELL_SIZE_M * lngPerM,
      };
      if (distanceM(center, cell) <= radiusM + SPAWN_GRID_CELL_SIZE_M) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

/** Generate a human-readable label for a spawn. */
function generateSpawnLabel(type: SpawnType, tier: number, index: number): string {
  const labels: Record<SpawnType, string[]> = {
    patrol: ['Hostile Patrol', 'Rogue Drone Swarm', 'Scavenger Gang', 'Corrupted Sentry', 'Data Wraith'],
    elite: ['Enforcer Construct', 'Elite Kill-Team', 'Arbiter Mech', 'Phase Lancer'],
    boss: ['Grid Wyrm', 'Overlord Protocol', 'Nemesis-Class AI', 'Fallen Colossus'],
    data_vault: ['Abandoned Server Node', 'Encrypted Vault', 'Derelict Data Center', 'Lost Archive'],
    resource_node: ['Scrap Cache', 'Nano-Filament Vein', 'Quantum Shard Deposit', 'Salvage Wreck'],
    vendor: ['Rogue Trader', 'Black Market Dealer', 'Circuit Shaman', 'Junk Merchant'],
    anomaly: ['Reality Rift', 'Corrupted Zone', 'Signal Anomaly', 'Ghost in the Machine'],
    settlement: ['Outpost', 'Safe Haven', 'Relay Station'],
  };

  const options = labels[type] ?? ['Unknown'];
  return options[index % options.length]!;
}
