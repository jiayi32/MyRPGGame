/**
 * tileMapTypes.ts — TypeScript types for the isometric tile map system.
 */

import type { PlacedBuilding, TownBuildingDefinition } from '../../services/gamification/ExpeditionTypes';

// ---------------------------------------------------------------------------
// Terrain & Layer
// ---------------------------------------------------------------------------

export type TerrainType = 'grass1' | 'grass2';

export type RenderLayer = 'terrain' | 'decoration' | 'building';

// ---------------------------------------------------------------------------
// Asset Definitions
// ---------------------------------------------------------------------------

/** A registered tile asset with its require() source and pixel dimensions. */
export interface TileAssetDef {
  key: string;
  source: number; // require('...png') return value
  pixelWidth: number;
  pixelHeight: number;
  /** Pixels to shift the sprite horizontally from its default anchor. */
  anchorOffsetX?: number;
  /** Pixels to shift the sprite vertically from its default anchor. */
  anchorOffsetY?: number;
}

// ---------------------------------------------------------------------------
// Grid Model
// ---------------------------------------------------------------------------

/** A single cell in the 2D tile grid. */
export interface TileCell {
  row: number;
  col: number;
  gridIndex: number;
  terrain: TerrainType;
  placedBuilding: PlacedBuilding | null;
  buildingDef: TownBuildingDefinition | null;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** A single draw command in the sorted render list. */
export interface RenderItem {
  layer: RenderLayer;
  assetKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

/** Total map canvas dimensions and origin offset. */
export interface MapDimensions {
  width: number;
  height: number;
  originX: number;
  originY: number;
}
