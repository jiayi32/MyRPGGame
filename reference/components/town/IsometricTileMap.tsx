/**
 * IsometricTileMap.tsx — Skia Canvas isometric tile renderer with
 * layered terrain/decoration/building rendering and selection highlight.
 *
 * This is a pure rendering component — gesture handling is done by the parent
 * (TownScreen) so that pinch/zoom/pan applies to the entire screen.
 */

import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Canvas,
  Image as SkiaImage,
  Path as SkiaPath,
  Skia,
} from '@shopify/react-native-skia';

import type { PlacedBuilding } from '../../services/gamification/ExpeditionTypes';
import type { MapDimensions } from './tileMapTypes';
import { useTileMapImages } from './tileAssetRegistry';
import {
  SCALED_TILE_W,
  SCALED_SURFACE_H,
  gridToScreen,
} from './tileProjection';
import {
  buildTileCells,
  buildRenderList,
} from './isometricUtils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IsometricTileMapProps {
  gridCols: number;
  townBuildings: PlacedBuilding[];
  selectedGridIndex: number | null;
  mapDims: MapDimensions;
  onReady?: () => void;
}

// ---------------------------------------------------------------------------
// Selection diamond path helper
// ---------------------------------------------------------------------------

function buildDiamondPath(tileX: number, tileY: number): string {
  const hw = SCALED_TILE_W / 2;
  const hs = SCALED_SURFACE_H / 2;
  const cx = tileX + hw;
  const cy = tileY + hs;
  // Diamond vertices (clockwise from top)
  return [
    `M ${cx} ${tileY}`,
    `L ${tileX + SCALED_TILE_W} ${cy}`,
    `L ${cx} ${tileY + SCALED_SURFACE_H}`,
    `L ${tileX} ${cy}`,
    'Z',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IsometricTileMap({
  gridCols,
  townBuildings,
  selectedGridIndex,
  mapDims,
  onReady,
}: IsometricTileMapProps) {
  // 1. Preload all tile images
  const imageMap = useTileMapImages();

  // 2. Build grid model
  const cells = useMemo(
    () => buildTileCells(townBuildings, gridCols),
    [townBuildings, gridCols],
  );

  // 3. Build render list (painter's algorithm order)
  const renderList = useMemo(
    () => buildRenderList(cells, gridCols, mapDims),
    [cells, gridCols, mapDims],
  );

  // 4. Selection highlight position
  const selectionPath = useMemo(() => {
    if (selectedGridIndex == null) return null;
    const row = Math.floor(selectedGridIndex / gridCols);
    const col = selectedGridIndex % gridCols;
    const pos = gridToScreen(row, col, mapDims.originX, mapDims.originY);
    return Skia.Path.MakeFromSVGString(buildDiamondPath(pos.x, pos.y));
  }, [selectedGridIndex, gridCols, mapDims]);

  // 5. Check if images are loaded
  const allLoaded = useMemo(() => {
    return Object.values(imageMap).every((img) => img != null);
  }, [imageMap]);

  // 6. Notify parent when ready
  useEffect(() => {
    if (allLoaded) onReady?.();
  }, [allLoaded, onReady]);

  if (!allLoaded) {
    return (
      <View style={[styles.container, { width: mapDims.width, height: mapDims.height }]}>
        <ActivityIndicator color="#F59E0B" size="small" />
        <Text style={styles.loadingText}>Loading town...</Text>
      </View>
    );
  }

  return (
    <Canvas style={{ width: mapDims.width, height: mapDims.height }}>
      {/* Render all tiles/decorations/buildings in painter's order */}
      {renderList.map((item, i) => {
        const img = imageMap[item.assetKey];
        if (!img) return null;
        return (
          <SkiaImage
            key={i}
            image={img}
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
          />
        );
      })}

      {/* Selection highlight */}
      {selectionPath && (
        <>
          <SkiaPath
            path={selectionPath}
            color="rgba(66, 0, 255, 0.3)"
            style="fill"
          />
          <SkiaPath
            path={selectionPath}
            color="rgba(66, 0, 255, 0.8)"
            style="stroke"
            strokeWidth={2}
          />
        </>
      )}
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
});
