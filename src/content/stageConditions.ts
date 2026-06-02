import type { StageConditionDef, StageConditionId } from './types';

// ---------------------------------------------------------------------------
// Catalog — 8 room conditions for all room types
// See documentation/New/GAMEPLAY_LOOP.md P4.4 for the design document.
// ---------------------------------------------------------------------------

export const STAGE_CONDITIONS: readonly StageConditionDef[] = [
  {
    id: 'condition.fortified',
    name: 'Fortified',
    description: 'Enemies are tougher but drop more gold.',
    effectLabel: 'HP+15% 🪙+25%',
    allowedRoomTypes: ['normal', 'elite', 'mini_boss', 'gate', 'counter'],
    weight: 25,
  },
  {
    id: 'condition.exposed',
    name: 'Exposed',
    description: 'Everyone hits harder — including you.',
    effectLabel: 'Dmg ±20%',
    allowedRoomTypes: ['normal', 'elite', 'event', 'mini_boss', 'gate', 'counter'],
    weight: 25,
  },
  {
    id: 'condition.treasure_cache',
    name: 'Treasure Cache',
    description: 'A rare gear piece is guaranteed, but more enemies guard it.',
    effectLabel: 'Rare+1 👥+1',
    allowedRoomTypes: ['elite', 'treasure', 'mini_boss', 'gate'],
    weight: 20,
  },
  {
    id: 'condition.cursed',
    name: 'Cursed',
    description: 'Your stats are sapped, but the reward is greater.',
    effectLabel: 'Stat-10% ⬡+40%',
    allowedRoomTypes: ['normal', 'elite', 'event', 'anomaly', 'mini_boss', 'gate', 'counter'],
    weight: 20,
  },
  {
    id: 'condition.swift',
    name: 'Swift',
    description: 'Combat tempo is accelerated for everyone.',
    effectLabel: 'CT +15%',
    allowedRoomTypes: ['normal', 'elite', 'event'],
    weight: 22,
  },
  {
    id: 'condition.barrier_pulse',
    name: 'Barrier Pulse',
    description: 'Enemies start with a light protective shield.',
    effectLabel: '🛡+8 HP',
    allowedRoomTypes: ['elite', 'mini_boss', 'gate', 'counter'],
    weight: 22,
  },
  {
    id: 'condition.merchants_favor',
    name: "Merchant's Favor",
    description: 'Better deals and more stock.',
    effectLabel: 'Price-25% +1🛒',
    allowedRoomTypes: ['merchant'],
    weight: 40,
  },
  {
    id: 'condition.restful',
    name: 'Restful',
    description: 'Your rest stop is particularly rejuvenating.',
    effectLabel: 'Inn ×2',
    allowedRoomTypes: ['rest'],
    weight: 35,
  },
];

export const STAGE_CONDITION_BY_ID: ReadonlyMap<StageConditionId, StageConditionDef> = new Map(
  STAGE_CONDITIONS.map((c) => [c.id, c]),
);
