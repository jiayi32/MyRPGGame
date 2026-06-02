// ─── World Map Screen ─────────────────────────────────────────────
// Primary game screen showing the GPS world map with spawn markers,
// joystick overlay for virtual movement, and action controls.

import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle, type Region } from 'react-native-maps';
import { useWorldStore } from '@/stores/worldStore';
import { JoystickOverlay } from '@/components/molecules/JoystickOverlay';
import type { WorldSpawn } from '@/domain/world/types';
import { VIRTUAL_MOVEMENT_RADIUS_M, SPAWN_VISIBLE_RADIUS_M } from '@/domain/world/types';

// ─── Spawn Marker Colors ───────────────────────────────────────────

const SPAWN_COLORS: Record<WorldSpawn['type'], string> = {
  patrol: '#ff4444',
  elite: '#ff8800',
  boss: '#ff0000',
  data_vault: '#44aaff',
  resource_node: '#44ff44',
  vendor: '#ffdd44',
  anomaly: '#cc44ff',
  settlement: '#44ddff',
};

const SPAWN_LABELS: Record<WorldSpawn['type'], string> = {
  patrol: '⚔️',
  elite: '💀',
  boss: '👑',
  data_vault: '🔒',
  resource_node: '📦',
  vendor: '💰',
  anomaly: '🌀',
  settlement: '🏠',
};

// ─── Component ─────────────────────────────────────────────────────

interface WorldMapScreenProps {
  onSpawnPress?: (spawn: WorldSpawn) => void;
  onMenuPress?: () => void;
}

export const WorldMapScreen: React.FC<WorldMapScreenProps> = ({
  onSpawnPress,
  onMenuPress,
}) => {
  const {
    virtualPosition,
    realPosition,
    gpsPermissionGranted,
    gpsTracking,
    visibleSpawns,
    playerLevel,
    playerTier,
    bootstrap,
    requestPermission,
    startTracking,
    beginEncounter,
  } = useWorldStore();

  // Bootstrap GPS on mount
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Handle spawn tap
  const handleSpawnPress = useCallback(
    (spawn: WorldSpawn) => {
      if (spawn.type === 'resource_node' || spawn.type === 'vendor') {
        // Non-combat interactions — handled later
        Alert.alert(spawn.label, `Tier ${spawn.tier} ${spawn.type.replace('_', ' ')}. Interaction coming soon.`);
        return;
      }

      beginEncounter(spawn.id);
      onSpawnPress?.(spawn);
    },
    [beginEncounter, onSpawnPress],
  );

  // No GPS permission yet
  if (!gpsPermissionGranted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Grid Link Required</Text>
        <Text style={styles.subtitle}>
          This game uses your location to generate the world around you.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            await requestPermission();
            await startTracking();
          }}
        >
          <Text style={styles.permissionButtonText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading initial position
  const position = virtualPosition ?? realPosition;
  if (!position) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ffff" />
        <Text style={styles.loadingText}>Calibrating Grid Position...</Text>
      </View>
    );
  }

  const region: Region = {
    latitude: position.lat,
    longitude: position.lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={styles.container}>
      {/* ── Map ── */}
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        customMapStyle={DARK_MAP_STYLE}
      >
        {/* Player position */}
        <Marker
          coordinate={{ latitude: position.lat, longitude: position.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.playerMarker}>
            <View style={styles.playerDot} />
          </View>
        </Marker>

        {/* Virtual movement radius (real GPS anchor) */}
        {realPosition && (
          <Circle
            center={{ latitude: realPosition.lat, longitude: realPosition.lng }}
            radius={VIRTUAL_MOVEMENT_RADIUS_M}
            fillColor="rgba(0, 255, 255, 0.03)"
            strokeColor="rgba(0, 255, 255, 0.15)"
            strokeWidth={1}
          />
        )}

        {/* Spawn markers */}
        {visibleSpawns.map((spawn) => (
          <Marker
            key={spawn.id}
            coordinate={{ latitude: spawn.position.lat, longitude: spawn.position.lng }}
            onPress={() => handleSpawnPress(spawn)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.spawnMarker,
                { borderColor: SPAWN_COLORS[spawn.type] ?? '#888' },
              ]}
            >
              <Text style={styles.spawnIcon}>
                {SPAWN_LABELS[spawn.type] ?? '?'}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── HUD Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.playerInfo}>
          <Text style={styles.playerLevel}>Lv.{playerLevel}</Text>
          <Text style={styles.playerTier}>T{playerTier}</Text>
        </View>
        <View style={styles.statusIndicators}>
          <View
            style={[
              styles.gpsDot,
              { backgroundColor: gpsTracking ? '#44ff44' : '#ff4444' },
            ]}
          />
          <Text style={styles.gpsText}>{gpsTracking ? 'LIVE' : '---'}</Text>
        </View>
      </View>

      {/* ── Joystick Overlay ── */}
      <JoystickOverlay />

      {/* ── Bottom Action Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🎒</Text>
          <Text style={styles.actionLabel}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionLabel}>Character</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionLabel}>Quests</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Dark Cyberpunk Map Style ─────────────────────────────────────

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a6fa5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#16213e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f3460' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0a1628' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1a2744' }],
  },
];

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  map: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#00ffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'JetBrainsMono',
  },
  subtitle: {
    color: '#8899aa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionButtonText: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#667788',
    fontSize: 14,
    marginTop: 12,
    fontFamily: 'JetBrainsMono',
  },

  // Player marker
  playerMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#00ffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ffff',
  },

  // Spawn markers
  spawnMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spawnIcon: { fontSize: 18 },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
  },
  menuIcon: { color: '#00ffff', fontSize: 20 },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
  },
  playerLevel: { color: '#00ffff', fontSize: 14, fontWeight: '700' },
  playerTier: {
    color: '#00ffff',
    fontSize: 12,
    opacity: 0.7,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,255,255,0.3)',
    paddingLeft: 8,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: { color: '#667788', fontSize: 11, fontFamily: 'JetBrainsMono' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    gap: 8,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 22 },
  actionLabel: {
    color: '#667788',
    fontSize: 9,
    marginTop: 1,
    fontFamily: 'JetBrainsMono',
  },
});
