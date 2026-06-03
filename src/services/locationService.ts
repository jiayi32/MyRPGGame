// ─── Location Service ─────────────────────────────────────────────
// Wraps expo-location for GPS tracking with permission handling.
// Provides foreground location updates for the world map.

import * as Location from 'expo-location';
import type { WorldPosition } from '@/domain/world/types';

export type LocationStatus =
  | 'unknown'
  | 'denied'
  | 'granted'
  | 'error';

export interface LocationUpdate {
  readonly position: WorldPosition;
  readonly timestamp: number; // unix ms
  readonly accuracy: number | null; // meters
  readonly speed: number | null; // m/s
}

export type LocationCallback = (update: LocationUpdate) => void;

let watchSubscription: Location.LocationSubscription | null = null;
let listeners: LocationCallback[] = [];
let currentStatus: LocationStatus = 'unknown';

// ─── Permission ───────────────────────────────────────────────────

export async function requestLocationPermission(): Promise<LocationStatus> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    currentStatus = status === 'granted' ? 'granted' : 'denied';
    return currentStatus;
  } catch (err) {
    console.error('[locationService] Permission request failed:', err);
    currentStatus = 'error';
    return 'error';
  }
}

export async function checkLocationPermission(): Promise<LocationStatus> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    currentStatus = status === 'granted' ? 'granted' : 'denied';
    return currentStatus;
  } catch {
    return currentStatus;
  }
}

export function getLocationStatus(): LocationStatus {
  return currentStatus;
}

// ─── Tracking ──────────────────────────────────────────────────────

/**
 * Start watching GPS position.
 * Fires callback on each position update (configurable interval via Expo).
 */
export async function startLocationTracking(
  callback: LocationCallback,
): Promise<void> {
  if (currentStatus !== 'granted') {
    const status = await requestLocationPermission();
    if (status !== 'granted') {
      console.warn('[locationService] Cannot start tracking: permission denied');
      return;
    }
  }

  // Subscribe callback
  if (!listeners.includes(callback)) {
    listeners.push(callback);
  }

  // ── Fire an immediate one-shot position so the UI isn't stuck waiting ──
  //    watchPositionAsync may not fire for a while (or at all on emulators
  //    with no movement), so we seed the initial position via getCurrentPosition.
  try {
    const initial = await getCurrentPosition();
    if (initial) {
      for (const listener of listeners) {
        try {
          listener(initial);
        } catch (err) {
          console.error('[locationService] Listener error (initial):', err);
        }
      }
    }
  } catch (err) {
    console.warn('[locationService] Could not get initial position:', err);
  }

  // Already watching
  if (watchSubscription) return;

  try {
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,     // 5 seconds in foreground
        distanceInterval: 0,    // fire even without movement (critical for emulators)
      },
      (loc) => {
        const update: LocationUpdate = {
          position: {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          },
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy ?? null,
          speed: loc.coords.speed ?? null,
        };

        for (const listener of listeners) {
          try {
            listener(update);
          } catch (err) {
            console.error('[locationService] Listener error:', err);
          }
        }
      },
    );
  } catch (err) {
    console.error('[locationService] Failed to start tracking:', err);
    currentStatus = 'error';
  }
}

/** Stop GPS tracking and clear all listeners. */
export async function stopLocationTracking(): Promise<void> {
  if (watchSubscription) {
    await watchSubscription.remove();
    watchSubscription = null;
  }
  listeners = [];
}

/** Remove a specific callback without stopping tracking entirely. */
export function removeLocationListener(callback: LocationCallback): void {
  listeners = listeners.filter((l) => l !== callback);
}

// ─── One-Shot ─────────────────────────────────────────────────────

/** Get a single current position (no continuous tracking). */
export async function getCurrentPosition(): Promise<LocationUpdate | null> {
  if (currentStatus !== 'granted') {
    const status = await requestLocationPermission();
    if (status !== 'granted') return null;
  }

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      position: {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      },
      timestamp: loc.timestamp,
      accuracy: loc.coords.accuracy ?? null,
      speed: loc.coords.speed ?? null,
    };
  } catch (_currentErr) {
    // getCurrentPositionAsync may fail on emulators / devices with
    // location services off. Try last-known position as softer fallback.
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        return {
          position: {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
          },
          timestamp: lastKnown.timestamp,
          accuracy: lastKnown.coords.accuracy ?? null,
          speed: lastKnown.coords.speed ?? null,
        };
      }
    } catch (_lastKnownErr) {
      // last-known also unavailable — expected on emulators.
    }

    // On dev builds / emulators with no GPS, fall back to a demo
    // position so the world map isn't stuck on "Calibrating...".
    if (__DEV__) {
      console.warn(
        '[locationService] GPS unavailable — using fallback demo position (dev mode)',
      );
      return {
        position: { lat: 37.7749, lng: -122.4194 },
        timestamp: Date.now(),
        accuracy: null,
        speed: null,
      };
    }
    return null;
  }
}

// ─── Geo Utils ────────────────────────────────────────────────────

/**
 * Clamp a virtual position to within `maxRadiusM` meters of the anchor.
 * Returns the clamped position.
 */
export function clampVirtualPosition(
  anchor: WorldPosition,
  virtual: WorldPosition,
  maxRadiusM: number,
): WorldPosition {
  const dist = haversineM(anchor, virtual);
  if (dist <= maxRadiusM) return virtual;

  // Move virtual toward anchor along the great-circle path
  const ratio = maxRadiusM / dist;
  return {
    lat: anchor.lat + (virtual.lat - anchor.lat) * ratio,
    lng: anchor.lng + (virtual.lng - anchor.lng) * ratio,
  };
}

/** Haversine distance in meters (duplicated to avoid circular deps). */
function haversineM(a: WorldPosition, b: WorldPosition): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aa =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}
