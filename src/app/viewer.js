import * as Cesium from 'cesium';
import { resolveRenderProfile } from './renderProfile.js';

/** Create the standard globe viewer in caller-owned, visible containers. */
export function createApplicationViewer({ container, creditContainer }) {
  if (!container || !creditContainer)
    throw new TypeError('Viewer and credit containers are required');
  const renderProfile = resolveRenderProfile();
  document.documentElement.classList.toggle(
    'gev-mobile-performance',
    renderProfile.mobile,
  );
  const viewer = new Cesium.Viewer(container, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    selectionIndicator: false,
    infoBox: false,
    baseLayer: false,
    creditContainer,
    msaaSamples: renderProfile.msaaSamples,
    useBrowserRecommendedResolution: true,
    contextOptions: {
      webgl: { preserveDrawingBuffer: renderProfile.preserveDrawingBuffer },
    },
  });
  try {
    viewer.targetFrameRate = renderProfile.targetFrameRate;
    viewer.resolutionScale = renderProfile.resolutionScale;
    viewer.__gevRenderProfile = renderProfile;
    viewer.scene.globe.show = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18;
    viewer.scene.skyAtmosphere.saturationShift = -0.12;
    viewer.scene.skyAtmosphere.brightnessShift = -0.08;
    return viewer;
  } catch (error) {
    viewer.destroy();
    throw error;
  }
}
