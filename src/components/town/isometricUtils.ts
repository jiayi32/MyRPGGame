/**
 * isometricUtils.ts — Grid model builder and render list builder
 * for the isometric tile map.
 *
 * All coordinate math and constants are imported from tileProjection.ts
 * (the single source of truth for projection/hit-test logic).
 */

import type {
  TileCell,
  RenderItem,
  MapDimensions,
  TerrainType,
} from './tileMapTypes';
import type { PlacedBuilding } from '../../services/gamification/ExpeditionTypes';
import { ASSET_REGISTRY, BUILDING_TO_ASSET } from './tileAssetRegistry';
import { getBuildingDef } from '../../services/gamification/TownService';
import {
  RENDER_SCALE,
  HALF_TILE_W,
  HALF_SURFACE_H,
  gridToScreen,
} from './tileProjection';

// Re-export projection utilities so existing deep imports from this module
// continue to work without a breaking change during the transition.
export {
  RENDER_SCALE,
  SCALED_TILE_W,
  SCALED_TILE_H,
  SCALED_SURFACE_H,
  HALF_TILE_W,
  HALF_SURFACE_H,
  gridToScreen,
  screenToGrid,
  computeMapDimensions,
  getInitialFitTransform,
} from './tileProjection';

// ---------------------------------------------------------------------------
// Grid Builder
// ---------------------------------------------------------------------------

/**
 * Build the TileCell array from Firestore building data.
 * Returns a flat array of length gridCols * gridCols.
 */
export function buildTileCells(
  buildings: PlacedBuilding[],
  gridCols: number,
): TileCell[] {
  const total = gridCols * gridCols;
  const cells: TileCell[] = [];

  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    cells.push({
      row,
      col,
      gridIndex: i,
      terrain: ((row + col) % 3 === 0 ? 'grass2' : 'grass1') as TerrainType,
      placedBuilding: null,
      buildingDef: null,
    });
  }

  for (const b of buildings) {
    if (b.gridIndex >= 0 && b.gridIndex < total) {
      cells[b.gridIndex].placedBuilding = b;
      cells[b.gridIndex].buildingDef = getBuildingDef(b.buildingId) ?? null;
    }
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Render List Builder
// ---------------------------------------------------------------------------

/**
 * Generate a sorted list of draw commands using painter's algorithm.
 * Iterates back-to-front (row 0 → N-1), left-to-right (col 0 → N-1).
 * Within each cell: terrain → decoration → building.
 */
export function buildRenderList(
  cells: TileCell[],
  gridCols: number,
  mapDims: MapDimensions,
): RenderItem[] {
  const items: RenderItem[] = [];

  for (let row = 0; row < gridCols; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = cells[row * gridCols + col];
      const { x: tileX, y: tileY } = gridToScreen(
        row,
        col,
        mapDims.originX,
        mapDims.originY,
      );

      // ── Terrain tile ──
      let terrainKey = cell.terrain;
      const bldMapping = cell.placedBuilding
        ? BUILDING_TO_ASSET[cell.placedBuilding.buildingId]
        : null;

      // Infrastructure buildings replace the terrain tile
      if (bldMapping?.layer === 'terrain') {
        terrainKey = bldMapping.assetKey as TerrainType;
      }

      const terrainAsset = ASSET_REGISTRY[terrainKey];
      if (terrainAsset) {
        items.push({
          layer: 'terrain',
          assetKey: terrainKey,
          x: tileX,
          y: tileY,
          width: terrainAsset.pixelWidth * RENDER_SCALE,
          height: terrainAsset.pixelHeight * RENDER_SCALE,
          row,
          col,
        });
      }

      // ── Decoration or Building ──
      if (bldMapping && bldMapping.layer !== 'terrain') {
        const asset = ASSET_REGISTRY[bldMapping.assetKey];
        if (asset) {
          const scaledW = asset.pixelWidth * RENDER_SCALE;
          const scaledH = asset.pixelHeight * RENDER_SCALE;

          // Anchor: bottom-center of sprite aligned to tile diamond center
          const tileCenterX = tileX + HALF_TILE_W;
          const tileCenterY = tileY + HALF_SURFACE_H;
          const objX =
            tileCenterX -
            scaledW / 2 +
            (asset.anchorOffsetX ?? 0) * RENDER_SCALE;
          const objY =
            tileCenterY -
            scaledH +
            (asset.anchorOffsetY ?? 0) * RENDER_SCALE;

          items.push({
            layer: bldMapping.layer,
            assetKey: bldMapping.assetKey,
            x: objX,
            y: objY,
            width: scaledW,
            height: scaledH,
            row,
            col,
          });
        }
      }
    }
  }

  return items;
}
