/**
 * ExpeditionTypes.ts — TypeScript types for the companion economy system.
 *
 * Covers: expeditions, gold currency, shop items.
 */

// ---------------------------------------------------------------------------
// Expedition
// ---------------------------------------------------------------------------

export type ExpeditionTypeId =
  | 'quick_errand'
  | 'village_patrol'
  | 'forest_hunt'
  | 'mountain_climb'
  | 'dragon_lair';

export interface ExpeditionDefinition {
  id: ExpeditionTypeId;
  name: string;
  description: string;
  icon: string;
  durationMinutes: number;
  goldRange: { min: number; max: number };
  levelRequired: number;
}

export interface ActiveExpedition {
  active: boolean;
  expeditionType: ExpeditionTypeId;
  startedAt: any;       // Firestore Timestamp
  returnsAt: any;       // Firestore Timestamp
  resolved: boolean;
}

export interface ExpeditionLoot {
  gold: number;
}

// ---------------------------------------------------------------------------
// Gold
// ---------------------------------------------------------------------------

export interface GoldLedgerEntry {
  userId: string;
  goldDelta: number;
  reason: string;
  referenceId: string;
  referenceType: string;
  createdAt: any;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export type ShopCategory = 'hats' | 'capes' | 'weapons' | 'effects' | 'consumables';

export interface ShopItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  icon: string;
  price: number;
  levelRequired: number;
}

export interface PurchaseResult {
  success: boolean;
  error?: 'insufficient_gold' | 'already_owned' | 'level_too_low';
  newGoldBalance?: number;
}

// ---------------------------------------------------------------------------
// Town Building
// ---------------------------------------------------------------------------

export type TownBuildingCategory =
  | 'buildings'
  | 'infrastructure'
  | 'tiles'
  | 'nature'
  | 'fences'
  | 'decorations'
  | 'companion_fixtures';

export interface TownBuildingDefinition {
  id: string;
  name: string;
  description: string;
  category: TownBuildingCategory;
  icon: string;           // MaterialCommunityIcons name
  iconColor: string;      // tint color on grid
  price: number;
  tierRequired: number;   // 1-5
}

export interface PlacedBuilding {
  buildingId: string;
  placedAt: any;          // Firestore Timestamp
  gridIndex: number;
}

export interface TownState {
  totalGoldSpent: number;
  buildings: PlacedBuilding[];
  tier?: number;            // purchased tier level (1-5), defaults to 1
  vaultLastCollectedAt?: any; // Firestore Timestamp — last time vault gold was claimed
  mapSnapshot?: any;        // compact grid snapshot for cross-device sync
}

export interface TownTier {
  tier: number;
  name: string;
  goldThreshold: number;
  gridSize: number;       // grid is gridSize × gridSize
}

/** Vault config per tier — passive gold generation rates + capacity. */
export interface VaultConfig {
  goldPerHour: number;    // gold generated per hour
  maxCapacity: number;    // max gold the vault can hold before collection
}

export interface VaultStatus {
  accumulatedGold: number;
  maxCapacity: number;
  goldPerHour: number;
  isFull: boolean;
  minutesSinceCollection: number;
}

export interface TownPurchaseResult {
  success: boolean;
  error?: 'insufficient_gold' | 'tier_locked' | 'grid_full';
  newGoldBalance?: number;
  newTotalGoldSpent?: number;
  gridIndex?: number;
}
