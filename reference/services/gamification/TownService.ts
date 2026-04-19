/**
 * TownService.ts — Town building system: definitions, purchase, grid helpers.
 *
 * Design principles (same as ExpeditionService):
 * - Fire-and-forget: async + try/catch. Callers `.catch(console.warn)`.
 * - Idempotent: goldLedger guards duplicate awards via referenceId.
 * - Anonymous-safe: early return if userId is falsy.
 */

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../config/firebaseConfig';
import { AppEvents, APP_EVENTS } from '../../utils/appEvents';
import type {
  TownBuildingDefinition,
  TownBuildingCategory,
  TownTier,
  TownState,
  PlacedBuilding,
  TownPurchaseResult,
  VaultConfig,
  VaultStatus,
} from './ExpeditionTypes';

// ---------------------------------------------------------------------------
// Town Tier Definitions
// ---------------------------------------------------------------------------

export const TOWN_TIERS: TownTier[] = [
  { tier: 1, name: 'Hamlet',   goldThreshold: 0,    gridSize: 8  },
  { tier: 2, name: 'Village',  goldThreshold: 0,    gridSize: 12 },
  { tier: 3, name: 'Township', goldThreshold: 0,    gridSize: 16 },
  { tier: 4, name: 'Town',     goldThreshold: 0,    gridSize: 20 },
  { tier: 5, name: 'City',     goldThreshold: 0,    gridSize: 24 },
];

/** Purchasable tier upgrade definitions for the town shop. */
export const TOWN_TIER_UPGRADES = [
  { fromTier: 1, toTier: 2, name: 'Village Expansion', description: 'Expand your hamlet to a village (12×12 grid).', price: 500, icon: 'home-city-outline', iconColor: '#F59E0B' },
  { fromTier: 2, toTier: 3, name: 'Township Charter',  description: 'Upgrade to a township (16×16 grid).',           price: 1500, icon: 'city-variant-outline', iconColor: '#F59E0B' },
  { fromTier: 3, toTier: 4, name: 'Town Declaration',   description: 'Declare your town (20×20 grid).',               price: 3500, icon: 'office-building', iconColor: '#F59E0B' },
  { fromTier: 4, toTier: 5, name: 'City Ascension',     description: 'Ascend to city status (24×24 grid).',            price: 7000, icon: 'castle', iconColor: '#F59E0B' },
];

// ---------------------------------------------------------------------------
// Building Definitions (~25 items across 5 categories)
// ---------------------------------------------------------------------------

export const TOWN_BUILDING_DEFINITIONS: TownBuildingDefinition[] = [
  // ── Tier 1: Hamlet (0g threshold) ─────────────────────────────────
  { id: 'bld_starter_house', name: 'Starter House', description: 'A cozy little dwelling.', category: 'buildings', icon: 'home-outline', iconColor: '#D97706', price: 50, tierRequired: 1 },
  { id: 'inf_dirt_road',     name: 'Dirt Road',     description: 'A simple beaten path.',    category: 'infrastructure', icon: 'road', iconColor: '#92400E', price: 10, tierRequired: 1 },
  { id: 'fen_wooden_fence',  name: 'Wooden Fence',  description: 'Rustic wooden border.',    category: 'fences', icon: 'fence', iconColor: '#B45309', price: 15, tierRequired: 1 },
  { id: 'dec_flower_patch',  name: 'Flower Patch',  description: 'Bright wildflowers.',      category: 'decorations', icon: 'flower', iconColor: '#EC4899', price: 5,  tierRequired: 1 },
  { id: 'dec_campfire',      name: 'Campfire',      description: 'A warm, crackling fire.',   category: 'decorations', icon: 'campfire', iconColor: '#F97316', price: 10, tierRequired: 1 },
  { id: 'dec_barrel_stack',  name: 'Barrel Stack',  description: 'Supplies for travelers.',   category: 'decorations', icon: 'barrel', iconColor: '#A16207', price: 8,  tierRequired: 1 },
  { id: 'dec_signpost',      name: 'Signpost',      description: 'Points the way forward.',   category: 'decorations', icon: 'sign-direction', iconColor: '#78716C', price: 12, tierRequired: 1 },
  // Tier 1 — tiles
  { id: 'til_water',         name: 'Water Tile',     description: 'A tranquil water surface.',  category: 'tiles', icon: 'waves', iconColor: '#0EA5E9', price: 15, tierRequired: 1 },
  { id: 'til_sand',          name: 'Sand Tile',      description: 'Warm golden sand.',          category: 'tiles', icon: 'beach', iconColor: '#F59E0B', price: 10, tierRequired: 1 },
  { id: 'til_rock',          name: 'Rock Tile',      description: 'A solid stone surface.',     category: 'tiles', icon: 'diamond-stone', iconColor: '#78716C', price: 12, tierRequired: 1 },
  // Tier 1 — nature
  { id: 'nat_oak_tree',      name: 'Oak Tree',       description: 'A tall leafy oak.',          category: 'nature', icon: 'tree', iconColor: '#16A34A', price: 20, tierRequired: 1 },
  { id: 'nat_bush',          name: 'Bush',           description: 'A dense green bush.',        category: 'nature', icon: 'grass', iconColor: '#22C55E', price: 8,  tierRequired: 1 },
  { id: 'nat_tree_stump',    name: 'Tree Stump',     description: 'Remnants of a felled tree.', category: 'nature', icon: 'tree-outline', iconColor: '#92400E', price: 10, tierRequired: 1 },
  { id: 'nat_rock',          name: 'Rock',           description: 'A mossy stone.',             category: 'nature', icon: 'circle-outline', iconColor: '#78716C', price: 12, tierRequired: 1 },
  // Tier 1 — decorations (new)
  { id: 'dec_supply_box',    name: 'Supply Box',     description: 'A basic wooden box.',        category: 'decorations', icon: 'package-variant', iconColor: '#A16207', price: 6, tierRequired: 1 },
  { id: 'dec_small_barrel',  name: 'Small Barrel',   description: 'A compact storage barrel.',  category: 'decorations', icon: 'barrel', iconColor: '#92400E', price: 5, tierRequired: 1 },

  // ── Tier 2: Village (500g threshold) ──────────────────────────────
  { id: 'bld_bakery',        name: 'Bakery',        description: 'Fresh bread every morning.', category: 'buildings', icon: 'storefront-outline', iconColor: '#EA580C', price: 150, tierRequired: 2 },
  { id: 'inf_stone_path',    name: 'Stone Path',    description: 'Cobbled and sturdy.',        category: 'infrastructure', icon: 'road-variant', iconColor: '#78716C', price: 25, tierRequired: 2 },
  { id: 'dec_well',          name: 'Well',          description: 'Town water source.',         category: 'decorations', icon: 'water-pump', iconColor: '#0EA5E9', price: 40, tierRequired: 2 },
  { id: 'dec_lamp_post',     name: 'Lamp Post',     description: 'Illuminates the streets.',   category: 'decorations', icon: 'lamp', iconColor: '#FBBF24', price: 20, tierRequired: 2 },
  { id: 'dec_garden_bed',    name: 'Garden Bed',    description: 'A plot of herbs and greens.', category: 'decorations', icon: 'sprout', iconColor: '#22C55E', price: 30, tierRequired: 2 },
  { id: 'fen_hedge_row',     name: 'Hedge Row',     description: 'Neatly trimmed greenery.',   category: 'fences', icon: 'grass', iconColor: '#16A34A', price: 20, tierRequired: 2 },
  { id: 'bld_cottage',       name: 'Cottage',       description: 'A tall thatched cottage.',   category: 'buildings', icon: 'home-variant-outline', iconColor: '#B45309', price: 120, tierRequired: 2 },
  // Tier 2 — tiles
  { id: 'til_flowered_grass', name: 'Flowered Grass', description: 'Grass dotted with flowers.', category: 'tiles', icon: 'flower-outline', iconColor: '#EC4899', price: 18, tierRequired: 2 },
  { id: 'til_red_sand',       name: 'Red Sand',       description: 'Warm reddish desert sand.',  category: 'tiles', icon: 'weather-sunny', iconColor: '#DC2626', price: 20, tierRequired: 2 },
  { id: 'til_wheat',          name: 'Wheat Field',    description: 'Golden stalks of wheat.',     category: 'tiles', icon: 'barley', iconColor: '#D97706', price: 25, tierRequired: 2 },
  // Tier 2 — nature
  { id: 'nat_pine_tree',     name: 'Pine Tree',      description: 'A tall evergreen pine.',      category: 'nature', icon: 'pine-tree', iconColor: '#15803D', price: 25, tierRequired: 2 },
  { id: 'nat_fir_tree',      name: 'Fir Tree',       description: 'A lush fir tree.',            category: 'nature', icon: 'pine-tree', iconColor: '#166534', price: 25, tierRequired: 2 },
  { id: 'nat_mushroom',      name: 'Mushroom Patch', description: 'Colorful wild mushrooms.',    category: 'nature', icon: 'mushroom', iconColor: '#DC2626', price: 15, tierRequired: 2 },
  { id: 'nat_cactus',        name: 'Cactus',         description: 'A hardy desert cactus.',      category: 'nature', icon: 'cactus', iconColor: '#16A34A', price: 18, tierRequired: 2 },
  // Tier 2 — decorations (new)
  { id: 'dec_crate_stack',   name: 'Crate Stack',    description: 'Stacked trade crates.',       category: 'decorations', icon: 'package-variant-closed', iconColor: '#A16207', price: 12, tierRequired: 2 },
  { id: 'dec_road_sign',     name: 'Road Sign',      description: 'Directional road marker.',    category: 'decorations', icon: 'sign-direction-plus', iconColor: '#78716C', price: 10, tierRequired: 2 },

  // ── Tier 3: Township (1500g threshold) ────────────────────────────
  { id: 'bld_market',        name: 'Market',        description: 'A bustling trade center.',  category: 'buildings', icon: 'store', iconColor: '#DC2626', price: 250, tierRequired: 3 },
  { id: 'bld_blacksmith',    name: 'Blacksmith',    description: 'Forge of fine weapons.',    category: 'buildings', icon: 'anvil', iconColor: '#57534E', price: 200, tierRequired: 3 },
  { id: 'inf_cobble_bridge', name: 'Cobblestone Bridge', description: 'Link between districts.', category: 'infrastructure', icon: 'bridge', iconColor: '#A8A29E', price: 80, tierRequired: 3 },
  { id: 'bld_windmill',      name: 'Windmill',      description: 'Grain mills on the hill.',  category: 'buildings', icon: 'pinwheel-outline', iconColor: '#D97706', price: 300, tierRequired: 3 },
  { id: 'fen_stone_wall',    name: 'Stone Wall',    description: 'Solid stone barrier.',      category: 'fences', icon: 'wall', iconColor: '#78716C', price: 40, tierRequired: 3 },
  { id: 'bld_townhouse',     name: 'Townhouse',     description: 'A tidy townhouse.',         category: 'buildings', icon: 'home-city-outline', iconColor: '#78716C', price: 220, tierRequired: 3 },
  { id: 'bld_village_cottage', name: 'Village Cottage', description: 'A charming country cottage.', category: 'buildings', icon: 'home-outline', iconColor: '#EA580C', price: 180, tierRequired: 3 },
  // Tier 3 — tiles
  { id: 'til_rocky_dirt',    name: 'Rocky Dirt',     description: 'Rough dirt with stones.',    category: 'tiles', icon: 'terrain', iconColor: '#92400E', price: 15, tierRequired: 3 },
  { id: 'til_sandy_rock',    name: 'Sandy Rock',     description: 'Rocky sand surface.',        category: 'tiles', icon: 'layers', iconColor: '#A8A29E', price: 18, tierRequired: 3 },
  { id: 'til_grassy_sand',   name: 'Grassy Sand',    description: 'Sand with tufts of grass.',  category: 'tiles', icon: 'grass', iconColor: '#D97706', price: 20, tierRequired: 3 },
  { id: 'til_dirt_path',     name: 'Worn Dirt Path', description: 'A well-trodden path.',       category: 'tiles', icon: 'road', iconColor: '#92400E', price: 12, tierRequired: 3 },
  { id: 'til_flowered_grass2', name: 'Flowered Meadow', description: 'A meadow full of wildflowers.', category: 'tiles', icon: 'flower-tulip', iconColor: '#EC4899', price: 22, tierRequired: 3 },
  // Tier 3 — nature
  { id: 'nat_sakura_tree',   name: 'Sakura Tree',    description: 'Blossoming cherry tree.',    category: 'nature', icon: 'flower', iconColor: '#F472B6', price: 40, tierRequired: 3 },
  { id: 'nat_dead_tree',     name: 'Dead Tree',      description: 'A withered old tree.',       category: 'nature', icon: 'tree-outline', iconColor: '#78716C', price: 15, tierRequired: 3 },
  { id: 'nat_autumn_tree',   name: 'Autumn Tree',    description: 'Leaves of gold and red.',    category: 'nature', icon: 'tree', iconColor: '#EA580C', price: 35, tierRequired: 3 },
  { id: 'nat_large_rock',    name: 'Large Rock',     description: 'A hefty boulder.',           category: 'nature', icon: 'circle-outline', iconColor: '#57534E', price: 20, tierRequired: 3 },
  { id: 'nat_sandstone',     name: 'Sandstone',      description: 'Smooth desert sandstone.',   category: 'nature', icon: 'square-rounded', iconColor: '#D97706', price: 22, tierRequired: 3 },
  // Tier 3 — decorations (new)
  { id: 'dec_storage_boxes', name: 'Storage Boxes',  description: 'Organized storage crates.',  category: 'decorations', icon: 'package-variant', iconColor: '#78716C', price: 15, tierRequired: 3 },
  { id: 'dec_cargo_crate',   name: 'Cargo Crate',    description: 'Heavy-duty cargo container.', category: 'decorations', icon: 'package-variant-closed', iconColor: '#92400E', price: 18, tierRequired: 3 },

  // ── Tier 4: Town (3500g threshold) ────────────────────────────────
  { id: 'bld_inn',           name: 'Inn',           description: 'Rest for weary travelers.',  category: 'buildings', icon: 'bed', iconColor: '#7C3AED', price: 350, tierRequired: 4 },
  { id: 'bld_chapel',        name: 'Chapel',        description: 'A quiet place of prayer.',   category: 'buildings', icon: 'church', iconColor: '#E2E8F0', price: 400, tierRequired: 4 },
  { id: 'fen_iron_gate',     name: 'Iron Gate',     description: 'Grand entrance to the town.', category: 'fences', icon: 'gate', iconColor: '#44403C', price: 60, tierRequired: 4 },
  { id: 'dec_fountain',      name: 'Fountain',      description: 'Crystal-clear waters.',      category: 'decorations', icon: 'fountain', iconColor: '#38BDF8', price: 300, tierRequired: 4 },
  { id: 'bld_estate_house',  name: 'Estate House',  description: 'A grand two-story estate.',  category: 'buildings', icon: 'home-account', iconColor: '#7C3AED', price: 280, tierRequired: 4 },
  { id: 'bld_tall_cottage',  name: 'Tall Cottage',  description: 'A sturdy wide dwelling.',    category: 'buildings', icon: 'home-modern', iconColor: '#0EA5E9', price: 300, tierRequired: 4 },
  // Tier 4 — tiles
  { id: 'til_deep_rock',     name: 'Deep Rock',      description: 'Dark weathered stone.',      category: 'tiles', icon: 'diamond-stone', iconColor: '#57534E', price: 25, tierRequired: 4 },
  { id: 'til_red_sand_dune', name: 'Red Sand Dune',  description: 'Sculpted red desert dune.',  category: 'tiles', icon: 'weather-sunny', iconColor: '#B91C1C', price: 28, tierRequired: 4 },
  { id: 'til_sand_variant',  name: 'Fine Sand',      description: 'Smooth fine-grained sand.',  category: 'tiles', icon: 'beach', iconColor: '#FBBF24', price: 22, tierRequired: 4 },
  // Tier 4 — nature
  { id: 'nat_flower_cactus', name: 'Flowering Cactus', description: 'A cactus in full bloom.', category: 'nature', icon: 'cactus', iconColor: '#EC4899', price: 30, tierRequired: 4 },
  { id: 'nat_desert_cactus', name: 'Desert Cactus',    description: 'A tall desert cactus.',   category: 'nature', icon: 'cactus', iconColor: '#22C55E', price: 25, tierRequired: 4 },
  { id: 'nat_boulder',       name: 'Boulder',          description: 'A massive ancient rock.',  category: 'nature', icon: 'circle-double', iconColor: '#57534E', price: 35, tierRequired: 4 },
  { id: 'nat_old_stump',     name: 'Old Stump',        description: 'A gnarled old stump.',     category: 'nature', icon: 'tree-outline', iconColor: '#92400E', price: 18, tierRequired: 4 },
  // Tier 4 — decorations (new)
  { id: 'dec_ornate_crate',  name: 'Ornate Crate',    description: 'A finely crafted crate.',   category: 'decorations', icon: 'treasure-chest', iconColor: '#D97706', price: 22, tierRequired: 4 },
  { id: 'dec_trade_goods',   name: 'Trade Goods',     description: 'Exotic imported goods.',     category: 'decorations', icon: 'cart', iconColor: '#F59E0B', price: 25, tierRequired: 4 },

  // ── Tier 5: City (7000g threshold) ────────────────────────────────
  { id: 'bld_town_hall',     name: 'Town Hall',     description: 'Seat of governance.',         category: 'buildings', icon: 'town-hall', iconColor: '#F59E0B', price: 500, tierRequired: 5 },
  { id: 'bld_library',       name: 'Library',       description: 'Knowledge of the ages.',      category: 'buildings', icon: 'bookshelf', iconColor: '#8B5CF6', price: 450, tierRequired: 5 },
  { id: 'fix_notice_board',  name: 'Notice Board',  description: 'Community announcements.',    category: 'companion_fixtures', icon: 'bulletin-board', iconColor: '#B45309', price: 200, tierRequired: 5 },
  { id: 'fix_training_dummy', name: 'Training Dummy', description: 'Practice for companions.',  category: 'companion_fixtures', icon: 'fencing', iconColor: '#DC2626', price: 250, tierRequired: 5 },
  { id: 'fix_companion_hut', name: 'Companion Hut', description: 'Upgraded companion home.',    category: 'companion_fixtures', icon: 'home-group', iconColor: '#2563EB', price: 300, tierRequired: 5 },
  // Tier 5 — nature
  { id: 'nat_mushroom_ring', name: 'Mushroom Ring',   description: 'A mysterious fairy ring.',  category: 'nature', icon: 'mushroom', iconColor: '#8B5CF6', price: 40, tierRequired: 5 },
  { id: 'nat_giant_mushroom', name: 'Giant Mushroom', description: 'An enormous mushroom.',     category: 'nature', icon: 'mushroom-outline', iconColor: '#DC2626', price: 45, tierRequired: 5 },
  { id: 'nat_tall_cactus',   name: 'Tall Cactus',    description: 'A towering desert cactus.', category: 'nature', icon: 'cactus', iconColor: '#15803D', price: 35, tierRequired: 5 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the current town tier from stored tier number (purchased upgrades). */
export function getTownTier(townState: TownState | null): TownTier {
  const tierNum = townState?.tier || 1;
  return TOWN_TIERS.find((t) => t.tier === tierNum) || TOWN_TIERS[0];
}

/** Map flat buildings array into a grid cells array for rendering. */
export function buildTownGrid(
  buildings: PlacedBuilding[],
  gridCols: number,
): (PlacedBuilding | null)[] {
  const totalCells = gridCols * gridCols;
  const grid: (PlacedBuilding | null)[] = new Array(totalCells).fill(null);
  buildings.forEach((b) => {
    if (b.gridIndex >= 0 && b.gridIndex < totalCells) {
      grid[b.gridIndex] = b;
    }
  });
  return grid;
}

/** Look up a building definition by id. */
export function getBuildingDef(
  buildingId: string,
): TownBuildingDefinition | undefined {
  return TOWN_BUILDING_DEFINITIONS.find((b) => b.id === buildingId);
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

/**
 * Purchase a building and add it to the user's town grid.
 *
 * Buildings can be purchased multiple times (unlike shop items).
 * Uses Firestore runTransaction for atomicity.
 */
export async function purchaseTownBuilding(
  userId: string,
  buildingId: string,
  currentGold: number,
  townState: TownState | null,
  targetGridIndex?: number,
): Promise<TownPurchaseResult> {
  if (!userId) return { success: false, error: 'insufficient_gold' };

  const building = TOWN_BUILDING_DEFINITIONS.find((b) => b.id === buildingId);
  if (!building) return { success: false, error: 'insufficient_gold' };

  // Client-side fast-fail checks
  const tier = getTownTier(townState);
  if (building.tierRequired > tier.tier) return { success: false, error: 'tier_locked' };
  if (currentGold < building.price) return { success: false, error: 'insufficient_gold' };

  const existingCount = townState?.buildings?.length || 0;
  const gridCapacity = tier.gridSize * tier.gridSize;
  if (existingCount >= gridCapacity) return { success: false, error: 'grid_full' };

  // If targetGridIndex provided, check it's not already occupied
  if (targetGridIndex != null) {
    const occupied = townState?.buildings?.some(
      (b) => b.gridIndex === targetGridIndex,
    );
    if (occupied) return { success: false, error: 'grid_full' };
  }

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'insufficient_gold' };

  try {
    let newGoldBalance = 0;
    let newTotalGoldSpent = 0;
    const gridIndex = targetGridIndex ?? existingCount;

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) throw new Error('no_profile');

      const data = profileSnap.data();
      const gold = data.gold || 0;
      if (gold < building.price) throw new Error('insufficient_gold');

      const town: TownState = data.town || { totalGoldSpent: 0, buildings: [], tier: 1 };
      const currentTier = getTownTier(town);
      if (building.tierRequired > currentTier.tier) throw new Error('tier_locked');

      const capacity = currentTier.gridSize * currentTier.gridSize;
      if (town.buildings.length >= capacity) throw new Error('grid_full');

      newGoldBalance = gold - building.price;
      newTotalGoldSpent = town.totalGoldSpent + building.price;

      const newBuilding = {
        buildingId,
        placedAt: Timestamp.now(),
        gridIndex: targetGridIndex ?? town.buildings.length,
      };

      txn.update(profileRef, {
        gold: newGoldBalance,
        'town.totalGoldSpent': newTotalGoldSpent,
        'town.buildings': [...town.buildings, newBuilding],
        updatedAt: serverTimestamp(),
      });

      // Write gold ledger entry
      const ledgerRef = doc(collection(db, 'goldLedger'));
      txn.set(ledgerRef, {
        userId,
        goldDelta: -building.price,
        reason: 'town_building',
        referenceId: `town_${buildingId}_${Date.now()}`,
        referenceType: 'town',
        createdAt: serverTimestamp(),
      });
    });

    console.log(`[Town] ${userId} purchased ${buildingId} for ${building.price} Gold (grid #${gridIndex})`);
    AppEvents.emit(APP_EVENTS.TOWN_BUILDING_PURCHASED, {
      userId,
      buildingId,
      goldSpent: building.price,
      newGold: newGoldBalance,
      newTotalGoldSpent,
      gridIndex,
    });

    return { success: true, newGoldBalance, newTotalGoldSpent, gridIndex };
  } catch (error: any) {
    console.warn('[Town] purchaseTownBuilding error:', error);
    if (error.message === 'tier_locked') return { success: false, error: 'tier_locked' };
    if (error.message === 'grid_full') return { success: false, error: 'grid_full' };
    return { success: false, error: 'insufficient_gold' };
  }
}

// ---------------------------------------------------------------------------
// Tier Upgrade Purchase
// ---------------------------------------------------------------------------

/**
 * Purchase a tier upgrade to expand the town grid.
 * Uses Firestore runTransaction for atomicity.
 */
export async function purchaseTierUpgrade(
  userId: string,
  currentGold: number,
  townState: TownState | null,
): Promise<TownPurchaseResult> {
  if (!userId) return { success: false, error: 'insufficient_gold' };

  const currentTierNum = townState?.tier || 1;
  const upgrade = TOWN_TIER_UPGRADES.find((u) => u.fromTier === currentTierNum);
  if (!upgrade) return { success: false, error: 'tier_locked' }; // already max tier

  if (currentGold < upgrade.price) return { success: false, error: 'insufficient_gold' };

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'insufficient_gold' };

  try {
    let newGoldBalance = 0;
    let newTotalGoldSpent = 0;

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) throw new Error('no_profile');

      const data = profileSnap.data();
      const gold = data.gold || 0;
      if (gold < upgrade.price) throw new Error('insufficient_gold');

      const town: TownState = data.town || { totalGoldSpent: 0, buildings: [], tier: 1 };
      if ((town.tier || 1) !== currentTierNum) throw new Error('tier_locked'); // race condition guard

      newGoldBalance = gold - upgrade.price;
      newTotalGoldSpent = town.totalGoldSpent + upgrade.price;

      txn.update(profileRef, {
        gold: newGoldBalance,
        'town.totalGoldSpent': newTotalGoldSpent,
        'town.tier': upgrade.toTier,
        updatedAt: serverTimestamp(),
      });

      const ledgerRef = doc(collection(db, 'goldLedger'));
      txn.set(ledgerRef, {
        userId,
        goldDelta: -upgrade.price,
        reason: 'town_tier_upgrade',
        referenceId: `tier_upgrade_${upgrade.fromTier}_to_${upgrade.toTier}_${Date.now()}`,
        referenceType: 'town',
        createdAt: serverTimestamp(),
      });
    });

    console.log(`[Town] ${userId} upgraded tier ${upgrade.fromTier} → ${upgrade.toTier} for ${upgrade.price} Gold`);
    return { success: true, newGoldBalance, newTotalGoldSpent };
  } catch (error: any) {
    console.warn('[Town] purchaseTierUpgrade error:', error);
    if (error.message === 'tier_locked') return { success: false, error: 'tier_locked' };
    return { success: false, error: 'insufficient_gold' };
  }
}

// ---------------------------------------------------------------------------
// Town Map Snapshot (Firebase Sync)
// ---------------------------------------------------------------------------

/**
 * Save a snapshot of the current tile map state to Firestore.
 *
 * Reads the current town state from `userGameProfiles/{uid}` and writes a
 * derived snapshot to `userGameProfiles/{uid}.town.mapSnapshot`. This includes
 * the grid size, tier, and a serialized representation of the map so it can
 * be fully restored on another device without re-deriving from buildings.
 *
 * Called fire-and-forget after every purchase or tier upgrade.
 */
export async function saveTownMapSnapshot(userId: string): Promise<void> {
  if (!userId) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const profileRef = doc(db, 'userGameProfiles', userId);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) return;

    const data = profileSnap.data();
    const town: TownState = data.town || { totalGoldSpent: 0, buildings: [], tier: 1 };
    const tier = getTownTier(town);

    // Build a compact grid snapshot: { gridIndex: buildingId } map
    const gridMap: Record<number, string> = {};
    for (const b of town.buildings) {
      gridMap[b.gridIndex] = b.buildingId;
    }

    await updateDoc(profileRef, {
      'town.mapSnapshot': {
        gridSize: tier.gridSize,
        tier: tier.tier,
        tierName: tier.name,
        buildingCount: town.buildings.length,
        gridMap,
        updatedAt: serverTimestamp(),
      },
    });

    console.log(`[Town] Map snapshot saved for ${userId} (${tier.name}, ${town.buildings.length} buildings)`);
  } catch (error) {
    console.warn('[Town] saveTownMapSnapshot error:', error);
  }
}

// ---------------------------------------------------------------------------
// Demolish
// ---------------------------------------------------------------------------

/**
 * Remove a building from the user's town grid at the given gridIndex.
 * No gold refund — the building is simply deleted.
 */
export async function demolishTownBuilding(
  userId: string,
  gridIndex: number,
  townState: TownState | null,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'not_found' };
  if (!townState?.buildings?.some((b) => b.gridIndex === gridIndex)) {
    return { success: false, error: 'not_found' };
  }

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'not_found' };

  try {
    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) throw new Error('no_profile');

      const data = profileSnap.data();
      const town: TownState = data.town || { totalGoldSpent: 0, buildings: [], tier: 1 };
      const updatedBuildings = town.buildings.filter((b) => b.gridIndex !== gridIndex);

      txn.update(profileRef, {
        'town.buildings': updatedBuildings,
        updatedAt: serverTimestamp(),
      });
    });

    console.log(`[Town] ${userId} demolished building at grid #${gridIndex}`);
    return { success: true };
  } catch (error: any) {
    console.warn('[Town] demolishTownBuilding error:', error);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// Gold Vault — Passive Gold Generation
// ---------------------------------------------------------------------------

/** Vault capacity and rate per tier. Higher tiers generate more and hold more. */
export const VAULT_CONFIG: Record<number, VaultConfig> = {
  1: { goldPerHour: 5,   maxCapacity: 100  },
  2: { goldPerHour: 10,  maxCapacity: 250  },
  3: { goldPerHour: 20,  maxCapacity: 500  },
  4: { goldPerHour: 35,  maxCapacity: 1000 },
  5: { goldPerHour: 50,  maxCapacity: 2000 },
};

/**
 * Compute how much gold has accumulated in the vault since last collection.
 * Pure function — does not write to Firestore.
 */
export function computeVaultStatus(townState: TownState | null): VaultStatus {
  const tierNum = townState?.tier || 1;
  const config = VAULT_CONFIG[tierNum] || VAULT_CONFIG[1];

  // Determine time since last collection
  let lastCollected: Date;
  if (townState?.vaultLastCollectedAt) {
    lastCollected = townState.vaultLastCollectedAt.toDate
      ? townState.vaultLastCollectedAt.toDate()
      : new Date(townState.vaultLastCollectedAt);
  } else {
    // New town — no collection yet; start from now (no free gold)
    lastCollected = new Date();
  }

  const now = new Date();
  const msElapsed = Math.max(0, now.getTime() - lastCollected.getTime());
  const minutesSinceCollection = Math.floor(msElapsed / 60_000);
  const hoursElapsed = msElapsed / (3_600_000);

  const rawGold = Math.floor(hoursElapsed * config.goldPerHour);
  const accumulatedGold = Math.min(rawGold, config.maxCapacity);
  const isFull = accumulatedGold >= config.maxCapacity;

  return {
    accumulatedGold,
    maxCapacity: config.maxCapacity,
    goldPerHour: config.goldPerHour,
    isFull,
    minutesSinceCollection,
  };
}

/**
 * Claim accumulated vault gold. Atomically adds gold to user balance,
 * resets vaultLastCollectedAt, and writes a goldLedger entry.
 *
 * Returns the amount of gold claimed, or 0 if nothing to claim.
 */
export async function claimVaultGold(
  userId: string,
  townState: TownState | null,
): Promise<{ claimed: number; newGoldBalance: number }> {
  if (!userId) return { claimed: 0, newGoldBalance: 0 };

  const vaultStatus = computeVaultStatus(townState);
  if (vaultStatus.accumulatedGold <= 0) return { claimed: 0, newGoldBalance: 0 };

  const db = getFirebaseDb();
  if (!db) return { claimed: 0, newGoldBalance: 0 };

  try {
    let newGoldBalance = 0;
    const claimed = vaultStatus.accumulatedGold;

    await runTransaction(db, async (txn) => {
      const profileRef = doc(db, 'userGameProfiles', userId);
      const profileSnap = await txn.get(profileRef);
      if (!profileSnap.exists()) throw new Error('no_profile');

      const data = profileSnap.data();
      // Re-compute vault on server data to prevent cheating
      const serverTown: TownState = data.town || { totalGoldSpent: 0, buildings: [], tier: 1 };
      const serverVault = computeVaultStatus(serverTown);
      if (serverVault.accumulatedGold <= 0) throw new Error('nothing_to_claim');

      const serverClaimed = serverVault.accumulatedGold;
      newGoldBalance = (data.gold || 0) + serverClaimed;

      txn.update(profileRef, {
        gold: newGoldBalance,
        'town.vaultLastCollectedAt': Timestamp.now(),
        updatedAt: serverTimestamp(),
      });

      const ledgerRef = doc(collection(db, 'goldLedger'));
      txn.set(ledgerRef, {
        userId,
        goldDelta: serverClaimed,
        reason: 'town_vault',
        referenceId: `vault_${Date.now()}`,
        referenceType: 'town',
        createdAt: serverTimestamp(),
      });
    });

    console.log(`[Town] ${userId} claimed ${claimed} vault gold (balance: ${newGoldBalance})`);
    AppEvents.emit(APP_EVENTS.GAMIFICATION_GOLD_AWARDED, {
      userId,
      goldDelta: claimed,
      newGold: newGoldBalance,
      reason: 'town_vault',
    });

    return { claimed, newGoldBalance };
  } catch (error: any) {
    if (error.message === 'nothing_to_claim') return { claimed: 0, newGoldBalance: 0 };
    console.warn('[Town] claimVaultGold error:', error);
    return { claimed: 0, newGoldBalance: 0 };
  }
}