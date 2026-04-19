/**
 * tileProjection.ts — Single source of truth for all isometric coordinate math.
 *
 * Pure functions only. No UI, no Firestore, no asset imports.
 * Arithmetic functions are tagged 'worklet' so they run on both the JS thread
 * and the Reanimated UI thread (gesture handlers).
 *
 * Transform model:  screenPt = scale * mapPt + translate
 * Inverse:          mapPt   = (screenPt - translate) / scale
 */

import type { MapDimensions } from './tileMapTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Native pixel width of a terrain tile sprite. */
const TILE_WIDTH = 32;
/** Native pixel height of a terrain tile sprite (diamond + cube sides). */
const TILE_IMG_HEIGHT = 32;
/** Height of just the diamond top face (half the tile sprite). */
const TILE_SURFACE_HEIGHT = 16;
/** Extra vertical space above the top tile for tall building sprites. */
const BUILDING_OVERFLOW = 100;

/** Scale factor for rendering pixel art at larger sizes. */
export const RENDER_SCALE = 2.5;

// Derived scaled values
export const SCALED_TILE_W = TILE_WIDTH * RENDER_SCALE;             // 80
export const SCALED_TILE_H = TILE_IMG_HEIGHT * RENDER_SCALE;        // 80
export const SCALED_SURFACE_H = TILE_SURFACE_HEIGHT * RENDER_SCALE;  // 40
export const HALF_TILE_W = SCALED_TILE_W / 2;                       // 40
export const HALF_SURFACE_H = SCALED_SURFACE_H / 2;                 // 20

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * Forward projection: grid cell → screen pixel position (top-left of tile image).
 * Row 0 is the back row; higher rows are closer to the viewer.
 */
export function gridToScreen(
  row: number,
  col: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  'worklet';
  return {
    x: originX + (col - row) * HALF_TILE_W,
    y: originY + (col + row) * HALF_SURFACE_H,
  };
}

/**
 * Inverse projection: screen pixel → fractional grid coordinates.
 * Returns FLOAT values — caller decides rounding/selection strategy.
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
): { row: number; col: number } {
  'worklet';
  const dx = screenX - originX - HALF_TILE_W;
  const dy = screenY - originY - HALF_SURFACE_H;

  return {
    col: (dx / HALF_TILE_W + dy / HALF_SURFACE_H) / 2,
    row: (dy / HALF_SURFACE_H - dx / HALF_TILE_W) / 2,
  };
}

// ---------------------------------------------------------------------------
// Diamond Hit Testing
// ---------------------------------------------------------------------------

/**
 * Diamond containment test: is (px, py) inside the isometric diamond
 * centered at (cx, cy) with half-widths HALF_TILE_W and HALF_SURFACE_H?
 * Uses normalized taxicab (L1) distance.
 */
export function isPointInDiamond(
  px: number,
  py: number,
  cx: number,
  cy: number,
): boolean {
  'worklet';
  return (
    Math.abs(px - cx) / HALF_TILE_W +
    Math.abs(py - cy) / HALF_SURFACE_H
  ) <= 1.0;
}

/**
 * Full hit-test pipeline: undo gesture transform, find tile under tap,
 * verify with diamond containment. Returns gridIndex or -1.
 *
 * Checks the 4 candidate cells around the fractional grid coordinate
 * (floor and floor+1 for both row and col) for geometrically exact results.
 */
export function hitTestTile(
  tapX: number,
  tapY: number,
  translateX: number,
  translateY: number,
  scale: number,
  originX: number,
  originY: number,
  gridCols: number,
): number {
  'worklet';
  // 1. Invert gesture transform: screenPt → mapPt
  const mapX = (tapX - translateX) / scale;
  const mapY = (tapY - translateY) / scale;

  // 2. Get float grid coords
  const { row: rowF, col: colF } = screenToGrid(mapX, mapY, originX, originY);

  // 3. Check 4 candidate cells (avoid array allocation in worklet)
  const r0 = Math.floor(rowF);
  const c0 = Math.floor(colF);

  let r: number, c: number, cx: number, cy: number;

  r = r0; c = c0;
  if (r >= 0 && r < gridCols && c >= 0 && c < gridCols) {
    cx = originX + (c - r) * HALF_TILE_W + HALF_TILE_W;
    cy = originY + (c + r) * HALF_SURFACE_H + HALF_SURFACE_H;
    if (isPointInDiamond(mapX, mapY, cx, cy)) return r * gridCols + c;
  }

  r = r0 + 1; c = c0;
  if (r >= 0 && r < gridCols && c >= 0 && c < gridCols) {
    cx = originX + (c - r) * HALF_TILE_W + HALF_TILE_W;
    cy = originY + (c + r) * HALF_SURFACE_H + HALF_SURFACE_H;
    if (isPointInDiamond(mapX, mapY, cx, cy)) return r * gridCols + c;
  }

  r = r0; c = c0 + 1;
  if (r >= 0 && r < gridCols && c >= 0 && c < gridCols) {
    cx = originX + (c - r) * HALF_TILE_W + HALF_TILE_W;
    cy = originY + (c + r) * HALF_SURFACE_H + HALF_SURFACE_H;
    if (isPointInDiamond(mapX, mapY, cx, cy)) return r * gridCols + c;
  }

  r = r0 + 1; c = c0 + 1;
  if (r >= 0 && r < gridCols && c >= 0 && c < gridCols) {
    cx = originX + (c - r) * HALF_TILE_W + HALF_TILE_W;
    cy = originY + (c + r) * HALF_SURFACE_H + HALF_SURFACE_H;
    if (isPointInDiamond(mapX, mapY, cx, cy)) return r * gridCols + c;
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Map Dimensions
// ---------------------------------------------------------------------------

/**
 * Calculate the total canvas size and origin offset for a given grid size.
 */
export function computeMapDimensions(gridCols: number): MapDimensions {
  const width = gridCols * SCALED_TILE_W;
  const height =
    BUILDING_OVERFLOW +
    (gridCols - 1) * SCALED_SURFACE_H +
    SCALED_TILE_H;
  const originX = (gridCols - 1) * HALF_TILE_W;
  const originY = BUILDING_OVERFLOW;

  return { width, height, originX, originY };
}

// ---------------------------------------------------------------------------
// Initial Fit
// ---------------------------------------------------------------------------

/**
 * Calculate the initial scale and translate to center-fit the map in a container.
 */
export function getInitialFitTransform(
  mapWidth: number,
  mapHeight: number,
  containerWidth: number,
  containerHeight: number,
): { scale: number; translateX: number; translateY: number } {
  const fitScale =
    Math.min(containerWidth / mapWidth, containerHeight / mapHeight) * 0.9;
  const translateX = (containerWidth - mapWidth * fitScale) / 2;
  const translateY = (containerHeight - mapHeight * fitScale) / 2;
  return { scale: fitScale, translateX, translateY };
}
