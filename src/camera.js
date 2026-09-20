import * as Cesium from 'cesium';

/**
 * Camera presets for notable locations.
 * Named camera presets remain available, but startup location is device-driven.
 */
export const CAMERA_PRESETS = {
  austin: {
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 800),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0.0,
    },
  },
  sf: {
    destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 1000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
  nyc: {
    destination: Cesium.Cartesian3.fromDegrees(-73.9857, 40.7484, 1200),
    orientation: {
      heading: Cesium.Math.toRadians(-20),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
};


const DEVICE_LOCATION_STORAGE_KEY = 'gev:last-device-location:v1';
const DEVICE_LOCATION_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function isValidDeviceCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function readCachedDeviceLocation(storage, now = Date.now()) {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(DEVICE_LOCATION_STORAGE_KEY) || 'null');
    if (
      !parsed ||
      !isValidDeviceCoordinate(parsed.latitude, parsed.longitude) ||
      !Number.isFinite(parsed.timestamp) ||
      now - parsed.timestamp > DEVICE_LOCATION_CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeDeviceLocation(storage, coordinates, now = Date.now()) {
  if (!storage) return;
  try {
    storage.setItem(
      DEVICE_LOCATION_STORAGE_KEY,
      JSON.stringify({ ...coordinates, timestamp: now }),
    );
  } catch {
    // Storage is optional. Geolocation still works without it.
  }
}

/**
 * Ask the current device for its location. A recent cached fix is used only
 * when the provider is temporarily unavailable or times out; an explicit
 * permission denial never falls back to cached coordinates.
 */
export function requestDeviceLocation({
  geolocation = globalThis.navigator?.geolocation,
  storage = globalThis.localStorage,
  timeout = 8000,
  maximumAge = 30000,
  enableHighAccuracy = true,
  now = () => Date.now(),
} = {}) {
  return new Promise((resolve) => {
    if (!geolocation?.getCurrentPosition) {
      resolve({ ok: false, reason: 'unsupported' });
      return;
    }

    geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position?.coords?.latitude);
        const longitude = Number(position?.coords?.longitude);
        const accuracy = Number(position?.coords?.accuracy);
        if (!isValidDeviceCoordinate(latitude, longitude)) {
          resolve({ ok: false, reason: 'invalid' });
          return;
        }
        const coordinates = {
          latitude,
          longitude,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
        };
        storeDeviceLocation(storage, coordinates, now());
        resolve({ ok: true, source: 'live', ...coordinates });
      },
      (error) => {
        const code = Number(error?.code);
        if (code === 1) {
          resolve({ ok: false, reason: 'denied', code });
          return;
        }
        const cached = readCachedDeviceLocation(storage, now());
        if (cached) {
          resolve({
            ok: true,
            source: 'cached',
            latitude: cached.latitude,
            longitude: cached.longitude,
            accuracy: cached.accuracy ?? null,
          });
          return;
        }
        resolve({
          ok: false,
          reason: code === 3 ? 'timeout' : 'unavailable',
          code: Number.isFinite(code) ? code : null,
        });
      },
      { enableHighAccuracy, timeout, maximumAge },
    );
  });
}

/** Put the full globe on screen when device location cannot be used. */
export function setNeutralGlobeView(viewer) {
  if (!viewer || viewer.isDestroyed?.()) return;
  viewer.camera.cancelFlight?.();
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-20, 15, 22000000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  });
}

/**
 * Fly from an overhead acquisition view to a useful local oblique view.
 * Returns a cleanup function that cancels an in-progress flight.
 */
export function flyToCoordinates(
  viewer,
  { longitude, latitude, altitude = 900, duration = 3.2 } = {},
) {
  if (
    !viewer ||
    viewer.isDestroyed?.() ||
    !isValidDeviceCoordinate(Number(latitude), Number(longitude))
  ) {
    return () => {};
  }

  const lat = Number(latitude);
  const lon = Number(longitude);
  viewer.camera.cancelFlight?.();
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 24000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  });

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, altitude),
    orientation: {
      heading: Cesium.Math.toRadians(15),
      pitch: Cesium.Math.toRadians(-34),
      roll: 0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });

  return () => {
    if (!viewer.isDestroyed?.()) viewer.camera.cancelFlight?.();
  };
}

/**
 * Resolve this device's location and move the globe there. Shared-view startup
 * bypasses this entirely so a shared URL always restores the shared camera.
 */
export async function flyToDeviceLocation(viewer, options = {}) {
  const result = await requestDeviceLocation(options);
  if (!result.ok) {
    setNeutralGlobeView(viewer);
    return { ...result, cancel: () => {} };
  }
  const cancel = flyToCoordinates(viewer, result);
  return { ...result, cancel };
}

/**
 * Fly the camera to a preset location with a smooth animation.
 */
export function flyToPreset(viewer, presetName, duration = 3.0) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  viewer.camera.flyTo({
    destination: preset.destination,
    orientation: preset.orientation,
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

/**
 * Set camera to Austin on load with a cinematic fly-in.
 * @returns {Function} Cancels the pending or active startup flight.
 */
export function flyToAustin(viewer) {
  // Start from a high altitude, then fly down
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 25000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  // Cinematic fly-in after a brief pause
  const timer = setTimeout(() => {
    if (viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 600),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0.0,
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 500);
  return () => {
    clearTimeout(timer);
    if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
  };
}
