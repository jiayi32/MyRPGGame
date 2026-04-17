/**
 * tileAssetRegistry.ts — Maps building IDs and terrain types to PNG assets.
 *
 * Provides a useTileMapImages() hook that preloads every asset via Skia useImage,
 * following the same fixed-count pattern as useCharacterImages.ts.
 */

import { useImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { TileAssetDef, RenderLayer } from './tileMapTypes';

// ---------------------------------------------------------------------------
// Asset Registry — every asset used by the tile map
// ---------------------------------------------------------------------------

/** Ordered list of all asset definitions. Length MUST be a compile-time constant. */
const ASSET_LIST: TileAssetDef[] = [
  // ── Terrain tiles (32×32) ──────────────────────────────────────────────
  // 0-4: original terrain
  { key: 'grass1',           source: require('../../../assets/miniatureworld/Tiles/Grass Block 1.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'grass2',           source: require('../../../assets/miniatureworld/Tiles/Grass Block 2.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'dirt1',            source: require('../../../assets/miniatureworld/Tiles/Dirt Block 1.png'),              pixelWidth: 32, pixelHeight: 32 },
  { key: 'path',             source: require('../../../assets/miniatureworld/Tiles/Path Block.png'),                pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock1',            source: require('../../../assets/miniatureworld/Tiles/Rock Block 1.png'),              pixelWidth: 32, pixelHeight: 32 },
  // 5-18: new terrain
  { key: 'dirt2',            source: require('../../../assets/miniatureworld/Tiles/Dirt Block 2.png'),              pixelWidth: 32, pixelHeight: 32 },
  { key: 'dirt_rocky',       source: require('../../../assets/miniatureworld/Tiles/Dirt Block(Rocky ).png'),        pixelWidth: 32, pixelHeight: 32 },
  { key: 'grass1_flowered',  source: require('../../../assets/miniatureworld/Tiles/Grass Block 1(flowered).png'),   pixelWidth: 32, pixelHeight: 32 },
  { key: 'grass2_flowered',  source: require('../../../assets/miniatureworld/Tiles/Grass Block 2(flowered).png'),   pixelWidth: 32, pixelHeight: 32 },
  { key: 'red_sand1',        source: require('../../../assets/miniatureworld/Tiles/Red Sand Block 1.png'),          pixelWidth: 32, pixelHeight: 32 },
  { key: 'red_sand2',        source: require('../../../assets/miniatureworld/Tiles/Red Sand Block 2.png'),          pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock2',            source: require('../../../assets/miniatureworld/Tiles/Rock Block 2.png'),              pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock3',            source: require('../../../assets/miniatureworld/Tiles/Rock Block 3.png'),              pixelWidth: 32, pixelHeight: 32 },
  { key: 'sand1',            source: require('../../../assets/miniatureworld/Tiles/Sand Block 1.png'),              pixelWidth: 32, pixelHeight: 32 },
  { key: 'sand2',            source: require('../../../assets/miniatureworld/Tiles/Sand Block 2.png'),              pixelWidth: 32, pixelHeight: 32 },
  { key: 'sand_grassed',     source: require('../../../assets/miniatureworld/Tiles/Sand Block(Grassed).png'),       pixelWidth: 32, pixelHeight: 32 },
  { key: 'sand_rocky',       source: require('../../../assets/miniatureworld/Tiles/Sand Block(Rocky ).png'),        pixelWidth: 32, pixelHeight: 32 },
  { key: 'water',            source: require('../../../assets/miniatureworld/Tiles/Water Block.png'),               pixelWidth: 32, pixelHeight: 32 },
  { key: 'wheat',            source: require('../../../assets/miniatureworld/Tiles/Wheat tile.png'),                pixelWidth: 32, pixelHeight: 32 },

  // ── Houses / Buildings ─────────────────────────────────────────────────
  // 19-30: original houses
  { key: 'house_little_1',   source: require('../../../assets/miniatureworld/Without outline/Houses/#1 little House 1.png'),  pixelWidth: 32, pixelHeight: 32 },
  { key: 'house_medium_1',   source: require('../../../assets/miniatureworld/Without outline/Houses/#1 Medium House.png'),    pixelWidth: 48, pixelHeight: 32 },
  { key: 'market',           source: require('../../../assets/miniatureworld/Without outline/Houses/#U Market.png'),          pixelWidth: 32, pixelHeight: 32 },
  { key: 'main_building_1',  source: require('../../../assets/miniatureworld/Without outline/Houses/#1 Main Building.png'),   pixelWidth: 48, pixelHeight: 48 },
  { key: 'house_big_2',      source: require('../../../assets/miniatureworld/Without outline/Houses/#2 Big House.png'),       pixelWidth: 48, pixelHeight: 48 },
  { key: 'main_building_2',  source: require('../../../assets/miniatureworld/Without outline/Houses/#2 Main Building.png'),   pixelWidth: 48, pixelHeight: 32 },
  { key: 'house_big_1',      source: require('../../../assets/miniatureworld/Without outline/Houses/#1 Big House.png'),       pixelWidth: 48, pixelHeight: 48 },
  { key: 'tower_2',          source: require('../../../assets/miniatureworld/Without outline/Houses/#2 Tower.png'),           pixelWidth: 32, pixelHeight: 32 },
  { key: 'tower_1',          source: require('../../../assets/miniatureworld/Without outline/Houses/#1 Tower.png'),           pixelWidth: 32, pixelHeight: 48 },
  { key: 'wide_house_1',     source: require('../../../assets/miniatureworld/Without outline/Houses/#1 Wide House.png'),      pixelWidth: 32, pixelHeight: 32 },
  { key: 'house_little_2_b', source: require('../../../assets/miniatureworld/Without outline/Houses/#1 little House 2.png'),  pixelWidth: 32, pixelHeight: 48 },
  { key: 'house_medium_2',   source: require('../../../assets/miniatureworld/Without outline/Houses/#2 Medium House.png'),    pixelWidth: 32, pixelHeight: 32 },
  // 31-33: new houses
  { key: 'house_little_1_v2', source: require('../../../assets/miniatureworld/Without outline/Houses/#2 little House 1.png'), pixelWidth: 32, pixelHeight: 32 },
  { key: 'house_little_2_v2', source: require('../../../assets/miniatureworld/Without outline/Houses/#2 little House 2.png'), pixelWidth: 32, pixelHeight: 48 },
  { key: 'wide_house_2',      source: require('../../../assets/miniatureworld/Without outline/Houses/#2 Wide House.png'),     pixelWidth: 32, pixelHeight: 32 },

  // ── Decorations (16×16) ────────────────────────────────────────────────
  // 34-39: original decorations
  { key: 'barrel',         source: require('../../../assets/miniatureworld/Without outline/Decorations/Barrel.png'),           pixelWidth: 16, pixelHeight: 16 },
  { key: 'well',           source: require('../../../assets/miniatureworld/Without outline/Decorations/Well.png'),             pixelWidth: 16, pixelHeight: 16 },
  { key: 'well_no_roof',   source: require('../../../assets/miniatureworld/Without outline/Decorations/Well without roof.png'), pixelWidth: 16, pixelHeight: 16 },
  { key: 'sign1',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Sign 1.png'),           pixelWidth: 16, pixelHeight: 16 },
  { key: 'hanging_sign',   source: require('../../../assets/miniatureworld/Without outline/Decorations/Hanging Sign.png'),     pixelWidth: 16, pixelHeight: 16 },
  { key: 'box_c',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Box C.png'),            pixelWidth: 16, pixelHeight: 16 },
  // 40-47: new decorations
  { key: 'box_a',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Box A.png'),            pixelWidth: 16, pixelHeight: 16 },
  { key: 'box_b',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Box B.png'),            pixelWidth: 16, pixelHeight: 16 },
  { key: 'box_d',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Box D.png'),            pixelWidth: 16, pixelHeight: 16 },
  { key: 'box_e',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Box E.png'),            pixelWidth: 16, pixelHeight: 16 },
  { key: 'box_f',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Box F.png'),            pixelWidth: 16, pixelHeight: 16 },
  { key: 'box_plain',      source: require('../../../assets/miniatureworld/Without outline/Decorations/Box.png'),              pixelWidth: 16, pixelHeight: 16 },
  { key: 'mini_barrel',    source: require('../../../assets/miniatureworld/Without outline/Decorations/Mini barrel.png'),      pixelWidth: 16, pixelHeight: 16 },
  { key: 'sign2',          source: require('../../../assets/miniatureworld/Without outline/Decorations/Sign 2.png'),           pixelWidth: 16, pixelHeight: 16 },

  // ── Objects (32×32 / 16×16) ────────────────────────────────────────────
  // 48-53: original objects
  { key: 'bush_flowered',    source: require('../../../assets/miniatureworld/Without outline/Objects/Bush 1(flowered).png'),   pixelWidth: 32, pixelHeight: 32 },
  { key: 'bush2_flowered',   source: require('../../../assets/miniatureworld/Without outline/Objects/Bush 2(flowered).png'),   pixelWidth: 32, pixelHeight: 32 },
  { key: 'bush1',            source: require('../../../assets/miniatureworld/Without outline/Objects/Bush 1.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'hay_bale',         source: require('../../../assets/miniatureworld/Without outline/Objects/Hay bale.png'),           pixelWidth: 16, pixelHeight: 16 },
  { key: 'stump1',           source: require('../../../assets/miniatureworld/Without outline/Objects/Stump 1.png'),            pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree1',            source: require('../../../assets/miniatureworld/Without outline/Objects/Tree 1.png'),             pixelWidth: 32, pixelHeight: 32 },
  // 54-73: new objects / nature
  { key: 'bush2',            source: require('../../../assets/miniatureworld/Without outline/Objects/Bush 2.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'cactus1',          source: require('../../../assets/miniatureworld/Without outline/Objects/Cactus 1.png'),           pixelWidth: 32, pixelHeight: 32 },
  { key: 'cactus2',          source: require('../../../assets/miniatureworld/Without outline/Objects/Cactus 2.png'),           pixelWidth: 32, pixelHeight: 32 },
  { key: 'cactus2_flowered', source: require('../../../assets/miniatureworld/Without outline/Objects/Cactus 2(flowered).png'), pixelWidth: 32, pixelHeight: 32 },
  { key: 'cactus3',          source: require('../../../assets/miniatureworld/Without outline/Objects/Cactus 3.png'),           pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock_obj1',        source: require('../../../assets/miniatureworld/Without outline/Objects/Rock 1.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock_obj2',        source: require('../../../assets/miniatureworld/Without outline/Objects/Rock 2.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock_obj3',        source: require('../../../assets/miniatureworld/Without outline/Objects/Rock 3.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'rock_obj4',        source: require('../../../assets/miniatureworld/Without outline/Objects/Rock 4.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'sandstone',        source: require('../../../assets/miniatureworld/Without outline/Objects/Sandstone.png'),          pixelWidth: 32, pixelHeight: 32 },
  { key: 'stump2',           source: require('../../../assets/miniatureworld/Without outline/Objects/Stump 2.png'),            pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree2',            source: require('../../../assets/miniatureworld/Without outline/Objects/Tree 2.png'),             pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree_dead',        source: require('../../../assets/miniatureworld/Without outline/Objects/Tree(Dead).png'),         pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree_fall',        source: require('../../../assets/miniatureworld/Without outline/Objects/Tree(Fall).png'),         pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree_fir',         source: require('../../../assets/miniatureworld/Without outline/Objects/Tree(Fir).png'),          pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree_pine',        source: require('../../../assets/miniatureworld/Without outline/Objects/Tree(Pine).png'),         pixelWidth: 32, pixelHeight: 32 },
  { key: 'tree_sakura',      source: require('../../../assets/miniatureworld/Without outline/Objects/Tree(Sakura).png'),       pixelWidth: 32, pixelHeight: 32 },
  { key: 'mushroom1',        source: require('../../../assets/miniatureworld/Without outline/Objects/mashroom 1.png'),         pixelWidth: 16, pixelHeight: 16 },
  { key: 'mushroom2',        source: require('../../../assets/miniatureworld/Without outline/Objects/mashroom 2.png'),         pixelWidth: 16, pixelHeight: 16 },
  { key: 'mushroom3',        source: require('../../../assets/miniatureworld/Without outline/Objects/mashroom 3.png'),         pixelWidth: 16, pixelHeight: 16 },

  // ── Fences (16×16) ────────────────────────────────────────────────────
  // 74-75: original fences
  { key: 'fence',           source: require('../../../assets/miniatureworld/Fence.png'),                                      pixelWidth: 16, pixelHeight: 16, anchorOffsetX: 4, anchorOffsetY: 4 },
  { key: 'fence_straight',  source: require('../../../assets/miniatureworld/Fence(straight).png'),                            pixelWidth: 16, pixelHeight: 16, anchorOffsetX: 4, anchorOffsetY: 4 },
];

// Total: 76 assets — this number MUST match the useImage call count below.

// ---------------------------------------------------------------------------
// Lookup Tables
// ---------------------------------------------------------------------------

/** Fast lookup: asset key → TileAssetDef */
export const ASSET_REGISTRY: Record<string, TileAssetDef> = {};
for (const a of ASSET_LIST) ASSET_REGISTRY[a.key] = a;

/** Ordered keys (same order as ASSET_LIST). */
export const TILE_ASSET_KEYS = ASSET_LIST.map((a) => a.key);

/** Maps a TownBuildingDefinition id → { assetKey, layer }. */
export const BUILDING_TO_ASSET: Record<string, { assetKey: string; layer: RenderLayer }> = {
  // ── Buildings ──────────────────────────────────────────────────────────
  bld_starter_house:   { assetKey: 'house_little_1',    layer: 'building' },
  bld_bakery:          { assetKey: 'house_medium_1',     layer: 'building' },
  bld_market:          { assetKey: 'market',             layer: 'building' },
  bld_blacksmith:      { assetKey: 'main_building_1',    layer: 'building' },
  bld_windmill:        { assetKey: 'house_big_2',        layer: 'building' },
  bld_inn:             { assetKey: 'main_building_2',    layer: 'building' },
  bld_chapel:          { assetKey: 'house_big_1',        layer: 'building' },
  bld_town_hall:       { assetKey: 'tower_2',            layer: 'building' },
  bld_library:         { assetKey: 'tower_1',            layer: 'building' },
  bld_cottage:         { assetKey: 'house_little_2_b',   layer: 'building' },
  bld_townhouse:       { assetKey: 'house_medium_2',     layer: 'building' },
  bld_village_cottage:  { assetKey: 'house_little_1_v2', layer: 'building' },
  bld_estate_house:     { assetKey: 'house_little_2_v2', layer: 'building' },
  bld_tall_cottage:     { assetKey: 'wide_house_2',      layer: 'building' },

  // ── Infrastructure (replace terrain) ───────────────────────────────────
  inf_dirt_road:       { assetKey: 'dirt1',              layer: 'terrain' },
  inf_stone_path:      { assetKey: 'path',               layer: 'terrain' },
  inf_cobble_bridge:   { assetKey: 'rock1',              layer: 'terrain' },

  // ── Tiles (terrain replacements) ───────────────────────────────────────
  til_water:           { assetKey: 'water',              layer: 'terrain' },
  til_sand:            { assetKey: 'sand1',              layer: 'terrain' },
  til_rock:            { assetKey: 'rock2',              layer: 'terrain' },
  til_flowered_grass:  { assetKey: 'grass1_flowered',    layer: 'terrain' },
  til_red_sand:        { assetKey: 'red_sand1',          layer: 'terrain' },
  til_wheat:           { assetKey: 'wheat',              layer: 'terrain' },
  til_rocky_dirt:      { assetKey: 'dirt_rocky',         layer: 'terrain' },
  til_sandy_rock:      { assetKey: 'sand_rocky',         layer: 'terrain' },
  til_grassy_sand:     { assetKey: 'sand_grassed',       layer: 'terrain' },
  til_dirt_path:       { assetKey: 'dirt2',              layer: 'terrain' },
  til_deep_rock:       { assetKey: 'rock3',              layer: 'terrain' },
  til_red_sand_dune:   { assetKey: 'red_sand2',          layer: 'terrain' },
  til_sand_variant:    { assetKey: 'sand2',              layer: 'terrain' },
  til_flowered_grass2: { assetKey: 'grass2_flowered',    layer: 'terrain' },

  // ── Nature (decoration layer) ──────────────────────────────────────────
  nat_oak_tree:        { assetKey: 'tree2',              layer: 'decoration' },
  nat_bush:            { assetKey: 'bush2',              layer: 'decoration' },
  nat_tree_stump:      { assetKey: 'stump2',             layer: 'decoration' },
  nat_rock:            { assetKey: 'rock_obj1',          layer: 'decoration' },
  nat_pine_tree:       { assetKey: 'tree_pine',          layer: 'decoration' },
  nat_fir_tree:        { assetKey: 'tree_fir',           layer: 'decoration' },
  nat_mushroom:        { assetKey: 'mushroom1',          layer: 'decoration' },
  nat_cactus:          { assetKey: 'cactus1',            layer: 'decoration' },
  nat_sakura_tree:     { assetKey: 'tree_sakura',        layer: 'decoration' },
  nat_dead_tree:       { assetKey: 'tree_dead',          layer: 'decoration' },
  nat_autumn_tree:     { assetKey: 'tree_fall',          layer: 'decoration' },
  nat_large_rock:      { assetKey: 'rock_obj2',          layer: 'decoration' },
  nat_sandstone:       { assetKey: 'sandstone',          layer: 'decoration' },
  nat_flower_cactus:   { assetKey: 'cactus2_flowered',   layer: 'decoration' },
  nat_desert_cactus:   { assetKey: 'cactus2',            layer: 'decoration' },
  nat_boulder:         { assetKey: 'rock_obj3',          layer: 'decoration' },
  nat_old_stump:       { assetKey: 'rock_obj4',          layer: 'decoration' },
  nat_mushroom_ring:   { assetKey: 'mushroom2',          layer: 'decoration' },
  nat_giant_mushroom:  { assetKey: 'mushroom3',          layer: 'decoration' },
  nat_tall_cactus:     { assetKey: 'cactus3',            layer: 'decoration' },

  // ── Fences ─────────────────────────────────────────────────────────────
  fen_wooden_fence:    { assetKey: 'fence',              layer: 'decoration' },
  fen_hedge_row:       { assetKey: 'bush1',              layer: 'decoration' },
  fen_stone_wall:      { assetKey: 'fence_straight',     layer: 'decoration' },
  fen_iron_gate:       { assetKey: 'fence_straight',     layer: 'decoration' },

  // ── Decorations ────────────────────────────────────────────────────────
  dec_flower_patch:    { assetKey: 'bush_flowered',      layer: 'decoration' },
  dec_campfire:        { assetKey: 'hay_bale',           layer: 'decoration' },
  dec_barrel_stack:    { assetKey: 'barrel',             layer: 'decoration' },
  dec_signpost:        { assetKey: 'sign1',              layer: 'decoration' },
  dec_well:            { assetKey: 'well',               layer: 'decoration' },
  dec_lamp_post:       { assetKey: 'hanging_sign',       layer: 'decoration' },
  dec_garden_bed:      { assetKey: 'bush2_flowered',     layer: 'decoration' },
  dec_fountain:        { assetKey: 'well_no_roof',       layer: 'decoration' },
  dec_supply_box:      { assetKey: 'box_plain',          layer: 'decoration' },
  dec_small_barrel:    { assetKey: 'mini_barrel',        layer: 'decoration' },
  dec_crate_stack:     { assetKey: 'box_a',              layer: 'decoration' },
  dec_road_sign:       { assetKey: 'sign2',              layer: 'decoration' },
  dec_storage_boxes:   { assetKey: 'box_b',              layer: 'decoration' },
  dec_cargo_crate:     { assetKey: 'box_d',              layer: 'decoration' },
  dec_ornate_crate:    { assetKey: 'box_e',              layer: 'decoration' },
  dec_trade_goods:     { assetKey: 'box_f',              layer: 'decoration' },

  // ── Companion fixtures ─────────────────────────────────────────────────
  fix_notice_board:    { assetKey: 'box_c',              layer: 'building' },
  fix_training_dummy:  { assetKey: 'stump1',             layer: 'building' },
  fix_companion_hut:   { assetKey: 'wide_house_1',       layer: 'building' },
};

// ---------------------------------------------------------------------------
// Image Preloader Hook
// ---------------------------------------------------------------------------

export type TileImageMap = Record<string, SkImage | null>;

/**
 * Preloads all tile map images via Skia useImage.
 * Calls useImage exactly 76 times (fixed, hooks-safe).
 */
export function useTileMapImages(): TileImageMap {
  // Each line corresponds to ASSET_LIST[i] — do NOT reorder or conditionalize.
  const img0  = useImage(ASSET_LIST[0].source);
  const img1  = useImage(ASSET_LIST[1].source);
  const img2  = useImage(ASSET_LIST[2].source);
  const img3  = useImage(ASSET_LIST[3].source);
  const img4  = useImage(ASSET_LIST[4].source);
  const img5  = useImage(ASSET_LIST[5].source);
  const img6  = useImage(ASSET_LIST[6].source);
  const img7  = useImage(ASSET_LIST[7].source);
  const img8  = useImage(ASSET_LIST[8].source);
  const img9  = useImage(ASSET_LIST[9].source);
  const img10 = useImage(ASSET_LIST[10].source);
  const img11 = useImage(ASSET_LIST[11].source);
  const img12 = useImage(ASSET_LIST[12].source);
  const img13 = useImage(ASSET_LIST[13].source);
  const img14 = useImage(ASSET_LIST[14].source);
  const img15 = useImage(ASSET_LIST[15].source);
  const img16 = useImage(ASSET_LIST[16].source);
  const img17 = useImage(ASSET_LIST[17].source);
  const img18 = useImage(ASSET_LIST[18].source);
  const img19 = useImage(ASSET_LIST[19].source);
  const img20 = useImage(ASSET_LIST[20].source);
  const img21 = useImage(ASSET_LIST[21].source);
  const img22 = useImage(ASSET_LIST[22].source);
  const img23 = useImage(ASSET_LIST[23].source);
  const img24 = useImage(ASSET_LIST[24].source);
  const img25 = useImage(ASSET_LIST[25].source);
  const img26 = useImage(ASSET_LIST[26].source);
  const img27 = useImage(ASSET_LIST[27].source);
  const img28 = useImage(ASSET_LIST[28].source);
  const img29 = useImage(ASSET_LIST[29].source);
  const img30 = useImage(ASSET_LIST[30].source);
  const img31 = useImage(ASSET_LIST[31].source);
  const img32 = useImage(ASSET_LIST[32].source);
  const img33 = useImage(ASSET_LIST[33].source);
  const img34 = useImage(ASSET_LIST[34].source);
  const img35 = useImage(ASSET_LIST[35].source);
  const img36 = useImage(ASSET_LIST[36].source);
  const img37 = useImage(ASSET_LIST[37].source);
  const img38 = useImage(ASSET_LIST[38].source);
  const img39 = useImage(ASSET_LIST[39].source);
  const img40 = useImage(ASSET_LIST[40].source);
  const img41 = useImage(ASSET_LIST[41].source);
  const img42 = useImage(ASSET_LIST[42].source);
  const img43 = useImage(ASSET_LIST[43].source);
  const img44 = useImage(ASSET_LIST[44].source);
  const img45 = useImage(ASSET_LIST[45].source);
  const img46 = useImage(ASSET_LIST[46].source);
  const img47 = useImage(ASSET_LIST[47].source);
  const img48 = useImage(ASSET_LIST[48].source);
  const img49 = useImage(ASSET_LIST[49].source);
  const img50 = useImage(ASSET_LIST[50].source);
  const img51 = useImage(ASSET_LIST[51].source);
  const img52 = useImage(ASSET_LIST[52].source);
  const img53 = useImage(ASSET_LIST[53].source);
  const img54 = useImage(ASSET_LIST[54].source);
  const img55 = useImage(ASSET_LIST[55].source);
  const img56 = useImage(ASSET_LIST[56].source);
  const img57 = useImage(ASSET_LIST[57].source);
  const img58 = useImage(ASSET_LIST[58].source);
  const img59 = useImage(ASSET_LIST[59].source);
  const img60 = useImage(ASSET_LIST[60].source);
  const img61 = useImage(ASSET_LIST[61].source);
  const img62 = useImage(ASSET_LIST[62].source);
  const img63 = useImage(ASSET_LIST[63].source);
  const img64 = useImage(ASSET_LIST[64].source);
  const img65 = useImage(ASSET_LIST[65].source);
  const img66 = useImage(ASSET_LIST[66].source);
  const img67 = useImage(ASSET_LIST[67].source);
  const img68 = useImage(ASSET_LIST[68].source);
  const img69 = useImage(ASSET_LIST[69].source);
  const img70 = useImage(ASSET_LIST[70].source);
  const img71 = useImage(ASSET_LIST[71].source);
  const img72 = useImage(ASSET_LIST[72].source);
  const img73 = useImage(ASSET_LIST[73].source);
  const img74 = useImage(ASSET_LIST[74].source);
  const img75 = useImage(ASSET_LIST[75].source);

  const images = [
    img0,  img1,  img2,  img3,  img4,  img5,  img6,  img7,  img8,  img9,
    img10, img11, img12, img13, img14, img15, img16, img17, img18, img19,
    img20, img21, img22, img23, img24, img25, img26, img27, img28, img29,
    img30, img31, img32, img33, img34, img35, img36, img37, img38, img39,
    img40, img41, img42, img43, img44, img45, img46, img47, img48, img49,
    img50, img51, img52, img53, img54, img55, img56, img57, img58, img59,
    img60, img61, img62, img63, img64, img65, img66, img67, img68, img69,
    img70, img71, img72, img73, img74, img75,
  ];

  const map: TileImageMap = {};
  for (let i = 0; i < ASSET_LIST.length; i++) {
    map[ASSET_LIST[i].key] = images[i];
  }
  return map;
}
