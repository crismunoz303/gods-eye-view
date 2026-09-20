import { StyleManager } from '../ui.js';
import { flyToDeviceLocation } from '../camera.js';
import { initCockpitCloudEffects } from '../cockpitCloudEffects.js';

/** Construct the existing controls and camera presentation. */
export async function createStandaloneControls({
  scene: { viewer, mapStackController },
  loaderStatus,
  placeSearch,
  defer,
}) {
  // Initialize the style manager (post-processing, HUD, locations, share links)
  const styleManager = new StyleManager(viewer, {
    mapStackController,
    placeSearch,
  });
  defer(() => styleManager.orbitController.stop());
  defer(() => styleManager.hud.destroy());
  defer(() => styleManager.dispose());
  // The previous multi-canvas weather compositor remains disabled. Cockpit
  // clouds use a separate, capped low-resolution GPU pass that never attaches
  // Cesium fog or post-process stages and is fully stopped in map mode.
  const weatherEffects = null;
  const cockpitCloudEffects = initCockpitCloudEffects(viewer);
  defer(() => cockpitCloudEffects?.destroy());

  // Shared URLs own their camera. Normal launches resolve this device's
  // current location instead of falling back to a hard-coded city.
  if (!styleManager.hasShareState) {
    loaderStatus.textContent = 'Finding your current location...';
    const locationFlight = await flyToDeviceLocation(viewer, { timeout: 8000 });
    defer(locationFlight.cancel);
    if (locationFlight.ok) {
      loaderStatus.textContent =
        locationFlight.source === 'live'
          ? 'Flying to your current location...'
          : 'Location temporarily unavailable — using your recent location...';
    } else if (locationFlight.reason === 'denied') {
      loaderStatus.textContent =
        'Location permission is off — starting with the full globe...';
    } else {
      loaderStatus.textContent =
        'Current location unavailable — starting with the full globe...';
    }
  } else {
    loaderStatus.textContent = 'Restoring shared view...';
  }

  return { styleManager, weatherEffects, cockpitCloudEffects };
}
