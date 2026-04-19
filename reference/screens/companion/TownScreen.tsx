/**
 * TownScreen — Full-screen isometric tile-map town builder.
 *
 * Layout:
 * 1. Full-screen GestureDetector wrapping Animated.View with the Skia canvas
 *    — pinch/zoom/pan/tap all work across the entire screen
 * 2. Floating HUD overlay (pointerEvents="box-none" so gestures pass through)
 * 3. Bottom build modal (triggered by tapping an empty tile) — slide-up
 * 4. Demolish modal (triggered by tapping an occupied tile)
 * 5. Purchase confirmation modal
 * 6. Tier upgrade card in the build modal
 *
 * Tab bar is hidden while this screen is focused for immersive experience.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGamification } from '../../contexts/GamificationContext';
import {
  TOWN_BUILDING_DEFINITIONS,
  TOWN_TIERS,
  TOWN_TIER_UPGRADES,
  getBuildingDef,
  saveTownMapSnapshot,
} from '../../services/gamification/TownService';
import { BlurModal } from '../../components/BlurModal';
import GoldDisplay from '../../components/GoldDisplay';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';
import { haptics } from '../../utils/haptics';
import { DEFAULT_TAB_BAR_STYLE } from '../../constants/navigation';
import type { TownBuildingCategory, TownBuildingDefinition } from '../../services/gamification/ExpeditionTypes';
import IsometricTileMap from '../../components/town/IsometricTileMap';
import {
  computeMapDimensions,
  getInitialFitTransform,
} from '../../components/town/tileProjection';
import { buildTileCells } from '../../components/town/isometricUtils';
import { useMapGestures } from '../../components/town/useMapGestures';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLIDE_DURATION = 250;
const OFFSCREEN_Y = 2000; // Large enough to push sheet offscreen at any device size

const CATEGORY_OPTIONS = [
  { label: 'Buildings', value: 'buildings' },
  { label: 'Roads', value: 'infrastructure' },
  { label: 'Tiles', value: 'tiles' },
  { label: 'Nature', value: 'nature' },
  { label: 'Fences', value: 'fences' },
  { label: 'Decor', value: 'decorations' },
  { label: 'Fixtures', value: 'companion_fixtures' },
];

const TIER_ICONS: Record<number, string> = {
  1: 'home-outline',
  2: 'home-city-outline',
  3: 'city-variant-outline',
  4: 'office-building',
  5: 'castle',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TownScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    gold,
    townBuildings,
    townTotalGoldSpent,
    currentTownTier,
    townState,
    purchaseTownBuilding,
    purchaseTierUpgrade,
    demolishTownBuilding,
    vaultStatus,
    claimVaultGold,
  } = useGamification() as any;

  const [category, setCategory] = useState<TownBuildingCategory>('buildings');
  const [purchasing, setPurchasing] = useState(false);
  const [selectedGridIndex, setSelectedGridIndex] = useState<number | null>(null);
  const [buildModalVisible, setBuildModalVisible] = useState(false);
  const [demolishModalVisible, setDemolishModalVisible] = useState(false);
  const [demolishing, setDemolishing] = useState(false);
  const [upgradingTier, setUpgradingTier] = useState(false);
  const [claimingVault, setClaimingVault] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [screenSize, setScreenSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // Dirty flag — set true on any build/demolish/upgrade, snapshot saved once on exit
  const snapshotDirty = useRef(false);

  // Slide animation for bottom sheet
  const sheetTranslateY = useSharedValue(OFFSCREEN_Y);
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const openBuildSheet = useCallback(() => {
    setBuildModalVisible(true);
    sheetTranslateY.value = OFFSCREEN_Y;
    // Small delay so Modal renders before animation starts
    requestAnimationFrame(() => {
      sheetTranslateY.value = withTiming(0, { duration: SLIDE_DURATION });
    });
  }, []);

  const closeBuildSheet = useCallback(() => {
    sheetTranslateY.value = withTiming(OFFSCREEN_Y, { duration: SLIDE_DURATION });
    setTimeout(() => {
      setBuildModalVisible(false);
      setSelectedGridIndex(null);
    }, SLIDE_DURATION);
  }, []);

  // ---- Hide bottom tab bar while this screen is open ----
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    // Hide on focus, restore on blur (covers both goBack and swipe-back)
    const unsubFocus = navigation.addListener('focus', () => {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    });
    const unsubBlur = navigation.addListener('blur', () => {
      parent.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    });

    // Also hide immediately (screen may already be focused)
    parent.setOptions({ tabBarStyle: { display: 'none' } });

    return () => {
      unsubFocus();
      unsubBlur();
      parent.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    };
  }, [navigation]);

  // ---- Save map snapshot once on screen exit (deferred for perf) ----
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      if (snapshotDirty.current && user?.uid) {
        snapshotDirty.current = false;
        saveTownMapSnapshot(user.uid).catch(console.warn);
      }
    });
    return unsub;
  }, [navigation, user?.uid]);

  // Grid computation
  const gridCols = currentTownTier?.gridSize || 8;
  const gridCapacity = gridCols * gridCols;
  const gridFull = (townBuildings?.length || 0) >= gridCapacity;

  // Next tier upgrade info
  const nextUpgrade = TOWN_TIER_UPGRADES.find(
    (u) => u.fromTier === (currentTownTier?.tier || 1),
  );

  // Filtered building list
  const filteredItems = useMemo(
    () => TOWN_BUILDING_DEFINITIONS.filter((b) => b.category === category),
    [category],
  );

  // Grid cells (rich model — used for occupancy checks and passed to renderer)
  const tileCells = useMemo(
    () => buildTileCells(townBuildings || [], gridCols),
    [townBuildings, gridCols],
  );

  // Map dimensions (for gestures & canvas)
  const mapDims = useMemo(
    () => computeMapDimensions(gridCols),
    [gridCols],
  );

  // Initial fit transform
  const initial = useMemo(
    () =>
      screenSize.width > 0 && screenSize.height > 0
        ? getInitialFitTransform(
            mapDims.width,
            mapDims.height,
            screenSize.width,
            screenSize.height,
          )
        : { scale: 1, translateX: 0, translateY: 0 },
    [mapDims.width, mapDims.height, screenSize.width, screenSize.height],
  );

  // Active building info for demolish modal
  const selectedBuilding = useMemo(() => {
    if (selectedGridIndex == null) return null;
    const placed = tileCells[selectedGridIndex]?.placedBuilding;
    if (!placed) return null;
    const def = getBuildingDef(placed.buildingId);
    return def ? { placed, def } : null;
  }, [selectedGridIndex, tileCells]);

  // Handle tile tap — empty tiles open build modal, occupied tiles open demolish modal
  const handleTileSelect = useCallback(
    (gridIndex: number) => {
      if (!mapReady) return; // Block taps while images are still loading
      haptics.selection();
      setSelectedGridIndex(gridIndex);

      if (tileCells[gridIndex]?.placedBuilding) {
        // Tile is occupied — open demolish modal
        setDemolishModalVisible(true);
      } else {
        // Tile is empty — open build modal
        openBuildSheet();
      }
    },
    [mapReady, tileCells, openBuildSheet],
  );

  // Gestures — owned at the screen level so pan/pinch works across the entire view.
  // Hit test is done entirely in the worklet (no cross-thread coordinate issues).
  const gestureResult = useMapGestures({
    mapWidth: mapDims.width,
    mapHeight: mapDims.height,
    containerWidth: screenSize.width,
    containerHeight: screenSize.height,
    initialScale: initial.scale,
    initialTranslateX: initial.translateX,
    initialTranslateY: initial.translateY,
    mapOriginX: mapDims.originX,
    mapOriginY: mapDims.originY,
    gridCols,
    onTileSelect: handleTileSelect,
  });

  // Screen layout measurement
  const handleScreenLayout = useCallback((e: LayoutChangeEvent) => {
    setScreenSize({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  // Close demolish modal
  const closeDemolishModal = useCallback(() => {
    setDemolishModalVisible(false);
    setSelectedGridIndex(null);
  }, []);

  // Purchase handler — place building on the grid
  const handleBuy = useCallback(async (item: TownBuildingDefinition) => {
    if (selectedGridIndex == null) return;
    setPurchasing(true);
    try {
      const result = await purchaseTownBuilding(item.id, selectedGridIndex);
      if (result?.success) {
        haptics.success?.() || haptics.selection();
        setBuildModalVisible(false);
        sheetTranslateY.value = OFFSCREEN_Y;
        setSelectedGridIndex(null);
        snapshotDirty.current = true;
      } else if (result?.error === 'insufficient_gold') {
        Alert.alert('Not Enough Gold', 'You need more gold to purchase this building.');
      } else if (result?.error === 'tier_locked') {
        Alert.alert('Tier Locked', 'Your town needs to reach a higher tier to unlock this.');
      } else if (result?.error === 'grid_full') {
        Alert.alert('Grid Full', 'Your town grid is full! Upgrade your tier to expand.');
      }
    } finally {
      setPurchasing(false);
    }
  }, [selectedGridIndex, purchaseTownBuilding, user?.uid]);

  // Demolish handler
  const handleDemolish = useCallback(async () => {
    if (selectedGridIndex == null) return;
    setDemolishing(true);
    try {
      const result = await demolishTownBuilding(selectedGridIndex);
      if (result?.success) {
        haptics.success?.() || haptics.selection();
        setDemolishModalVisible(false);
        setSelectedGridIndex(null);
        snapshotDirty.current = true;
      }
    } finally {
      setDemolishing(false);
    }
  }, [selectedGridIndex, demolishTownBuilding, user?.uid]);

  // Tier upgrade handler
  const handleTierUpgrade = useCallback(async () => {
    if (!nextUpgrade) return;
    setUpgradingTier(true);
    try {
      const result = await purchaseTierUpgrade();
      if (result?.success) {
        haptics.success?.() || haptics.selection();
        Alert.alert('Town Expanded!', `Your town is now a ${TOWN_TIERS.find((t) => t.tier === nextUpgrade.toTier)?.name || 'larger settlement'}!`);
        snapshotDirty.current = true;
      } else if (result?.error === 'insufficient_gold') {
        Alert.alert('Not Enough Gold', `You need ${nextUpgrade.price} gold for this upgrade.`);
      }
    } finally {
      setUpgradingTier(false);
    }
  }, [nextUpgrade, purchaseTierUpgrade, user?.uid]);

  // Vault claim handler
  const handleClaimVault = useCallback(async () => {
    if (!vaultStatus || vaultStatus.accumulatedGold <= 0) return;
    setClaimingVault(true);
    try {
      const result = await claimVaultGold();
      if (result?.claimed > 0) {
        haptics.success?.() || haptics.selection();
      }
    } finally {
      setClaimingVault(false);
    }
  }, [vaultStatus, claimVaultGold]);

  // Render a building item row in the build modal
  const renderBuildItem = useCallback(
    ({ item }: { item: TownBuildingDefinition }) => {
      const tierLocked = (currentTownTier?.tier || 1) < item.tierRequired;
      const canBuy = !tierLocked && !gridFull && (gold || 0) >= item.price;

      return (
        <View style={[styles.itemCard, (tierLocked || gridFull) && styles.itemCardDimmed]}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}15` }]}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={tierLocked ? (Colors.textSecondary || '#9CA3AF') : item.iconColor}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, tierLocked && styles.textLocked]}>
                {item.name}
              </Text>
              <View style={styles.priceRow}>
                <MaterialCommunityIcons name="circle-multiple" size={11} color="#F59E0B" />
                <Text style={styles.priceText}>{item.price}</Text>
                {item.tierRequired > 1 && (
                  <>
                    <MaterialCommunityIcons name="castle" size={11} color={Colors.textSecondary || '#6B7280'} />
                    <Text style={styles.priceText}>Tier {item.tierRequired}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {tierLocked ? (
            <View style={styles.lockBadge}>
              <MaterialCommunityIcons name="lock" size={12} color="#fff" />
              <Text style={styles.lockText}>Tier {item.tierRequired}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.buyButton, !canBuy && styles.buyButtonDisabled]}
              onPress={() => handleBuy(item)}
              disabled={!canBuy || purchasing}
              activeOpacity={0.7}
            >
              <Text style={[styles.buyButtonText, !canBuy && styles.buyButtonTextDisabled]}>
                Build
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [currentTownTier, gridFull, gold, handleBuy, purchasing],
  );

  return (
    <View style={styles.screen} onLayout={handleScreenLayout}>
      {/* Render layer — animated transform for zoom/pan, no touch handling */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#1a1a2e' },
          gestureResult.animatedStyle,
        ]}
        pointerEvents="none"
      >
        <IsometricTileMap
          gridCols={gridCols}
          townBuildings={townBuildings || []}
          selectedGridIndex={selectedGridIndex}
          mapDims={mapDims}
          onReady={() => setMapReady(true)}
        />
      </Animated.View>

      {/* Gesture layer — static full-screen overlay (no transforms = full hit area) */}
      <GestureDetector gesture={gestureResult.gestureHandler}>
        <View style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>

      {/* Loading overlay — shown while tile images are decoding */}
      {!mapReady && (
        <View style={styles.loadingOverlay} pointerEvents="box-none">
          <ActivityIndicator color="#F59E0B" size="large" />
          <Text style={styles.loadingOverlayText}>Loading town...</Text>
        </View>
      )}

      {/* Floating HUD — Top (pointerEvents box-none: gestures pass through gaps) */}
      <View style={[styles.hudTop, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.hudCenterGroup}>
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={gestureResult.resetToFit}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.hudCenter}>
            <MaterialCommunityIcons
              name={(TIER_ICONS[currentTownTier?.tier] || 'home-outline') as any}
              size={16}
              color="#F59E0B"
            />
            <Text style={styles.hudTierText}>{currentTownTier?.name || 'Hamlet'}</Text>
          </View>
        </View>
        <GoldDisplay gold={gold || 0} />
      </View>

      {/* Floating HUD — Bottom info bar + vault */}
      <View style={[styles.hudBottom, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
        <Text style={styles.hudTileCount}>
          {townBuildings?.length || 0} / {gridCapacity} tiles
        </Text>
        {vaultStatus && vaultStatus.accumulatedGold > 0 && (
          <TouchableOpacity
            style={styles.vaultCollectButton}
            onPress={handleClaimVault}
            disabled={claimingVault}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="treasure-chest" size={14} color="#F59E0B" />
            <Text style={styles.vaultCollectText}>
              {claimingVault ? '...' : `Collect ${vaultStatus.accumulatedGold}`}
            </Text>
            <View style={styles.vaultCapacityBar}>
              <View
                style={[
                  styles.vaultCapacityFill,
                  { width: `${Math.min(100, (vaultStatus.accumulatedGold / vaultStatus.maxCapacity) * 100)}%` },
                ]}
              />
            </View>
            {vaultStatus.isFull && (
              <Text style={styles.vaultFullBadge}>FULL</Text>
            )}
          </TouchableOpacity>
        )}
        {vaultStatus && vaultStatus.accumulatedGold === 0 && (
          <View style={styles.vaultInfoBadge}>
            <MaterialCommunityIcons name="treasure-chest" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.vaultInfoText}>
              +{vaultStatus.goldPerHour}/hr
            </Text>
          </View>
        )}
      </View>

      {/* Build Modal — full-width slide-from-bottom */}
      <Modal visible={buildModalVisible} transparent animationType="none" onRequestClose={closeBuildSheet}>
        {/* Backdrop */}
        <Pressable style={styles.modalBackdrop} onPress={closeBuildSheet}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        {/* Animated sheet */}
        <Animated.View
          style={[styles.buildSheet, { maxHeight: screenSize.height * 0.55, paddingBottom: insets.bottom + 16 }, sheetAnimatedStyle]}
          pointerEvents="box-none"
        >
          <View style={styles.buildSheetInner}>
            <View style={styles.buildSheetHandle} />
            <View style={styles.buildSheetHeader}>
              <Text style={styles.buildSheetTitle}>Build</Text>
              <TouchableOpacity onPress={closeBuildSheet} activeOpacity={0.7}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary || '#6B7280'} />
              </TouchableOpacity>
            </View>

            {/* Tier upgrade card */}
            {nextUpgrade && (
              <TouchableOpacity
                style={styles.upgradeCard}
                onPress={handleTierUpgrade}
                disabled={upgradingTier || (gold || 0) < nextUpgrade.price}
                activeOpacity={0.8}
              >
                <View style={styles.upgradeLeft}>
                  <MaterialCommunityIcons
                    name={(TIER_ICONS[nextUpgrade.toTier] || 'castle') as any}
                    size={24}
                    color="#F59E0B"
                  />
                  <View style={styles.upgradeInfo}>
                    <Text style={styles.upgradeName}>{nextUpgrade.name}</Text>
                    <Text style={styles.upgradeDesc}>{nextUpgrade.description}</Text>
                  </View>
                </View>
                <View style={styles.upgradePriceBadge}>
                  <MaterialCommunityIcons name="circle-multiple" size={12} color="#F59E0B" />
                  <Text style={styles.upgradePriceText}>
                    {upgradingTier ? '...' : nextUpgrade.price}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Category tabs — scrollable */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabs}
              contentContainerStyle={styles.tabsContent}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.tabPill, category === opt.value && styles.tabPillActive]}
                  onPress={() => setCategory(opt.value as TownBuildingCategory)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabPillText, category === opt.value && styles.tabPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Item list */}
            <FlatList
              data={filteredItems}
              renderItem={renderBuildItem}
              keyExtractor={(item) => item.id}
              style={styles.itemList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Animated.View>
      </Modal>

      {/* Demolish Modal — centered card */}
      <BlurModal visible={demolishModalVisible} onClose={closeDemolishModal}>
        {selectedBuilding && (
          <View style={styles.demolishCard}>
            <View style={[styles.demolishIconCircle, { backgroundColor: `${selectedBuilding.def.iconColor}15` }]}>
              <MaterialCommunityIcons
                name={selectedBuilding.def.icon as any}
                size={36}
                color={selectedBuilding.def.iconColor}
              />
            </View>
            <Text style={styles.demolishName}>{selectedBuilding.def.name}</Text>
            <Text style={styles.demolishDesc}>{selectedBuilding.def.description}</Text>
            <View style={styles.demolishButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeDemolishModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demolishButton}
                onPress={handleDemolish}
                disabled={demolishing}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="delete-outline" size={16} color="#fff" />
                <Text style={styles.demolishButtonText}>
                  {demolishing ? 'Removing...' : 'Demolish'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BlurModal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingOverlayText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },

  // Floating HUD — top bar
  hudTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCenterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recenterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  hudTierText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '700',
  },

  // Floating HUD — bottom bar
  hudBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  hudTileCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // Vault
  vaultCollectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  vaultCollectText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  vaultCapacityBar: {
    width: 30,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  vaultCapacityFill: {
    height: '100%' as const,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  vaultFullBadge: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  vaultInfoBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  vaultInfoText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Build modal backdrop + sheet
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  buildSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  buildSheetInner: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  buildSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  buildSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  buildSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary || '#1F2937',
  },

  // Tier upgrade card
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: BorderRadius.md || 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 12,
    marginBottom: 12,
  },
  upgradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  upgradeInfo: { flex: 1 },
  upgradeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  upgradeDesc: {
    fontSize: 11,
    color: Colors.textSecondary || '#6B7280',
    marginTop: 2,
  },
  upgradePriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  upgradePriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },

  tabs: { marginBottom: 10 },
  tabsContent: { gap: 8, paddingHorizontal: 2 },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabPillActive: {
    backgroundColor: Colors.primary || '#4200FF',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary || '#6B7280',
  },
  tabPillTextActive: {
    color: '#fff',
  },
  itemList: { flex: 1 },

  // Item cards
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: BorderRadius.md || 12,
    padding: 12,
    marginBottom: 8,
  },
  itemCardDimmed: { opacity: 0.55 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary || '#1F2937' },
  textLocked: { color: Colors.textSecondary || '#6B7280' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  priceText: { fontSize: 11, color: Colors.textSecondary || '#6B7280', marginRight: 6 },

  buyButton: {
    backgroundColor: Colors.primary || '#4200FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  buyButtonDisabled: { backgroundColor: 'rgba(0,0,0,0.1)' },
  buyButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  buyButtonTextDisabled: { color: Colors.textSecondary || '#9CA3AF' },

  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  lockText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Demolish modal
  demolishCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg || 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  demolishIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  demolishName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary || '#1F2937', marginBottom: 4 },
  demolishDesc: { fontSize: 13, color: Colors.textSecondary || '#6B7280', textAlign: 'center', marginBottom: 20 },
  demolishButtons: { flexDirection: 'row', gap: 12 },
  demolishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  demolishButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Shared modal styles
  cancelButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary || '#6B7280' },
});
