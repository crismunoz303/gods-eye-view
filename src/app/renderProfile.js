/** Resolve rendering costs for the current device without changing app features. */
export function resolveRenderProfile({
  userAgent = globalThis.navigator?.userAgent || '',
  maxTouchPoints = globalThis.navigator?.maxTouchPoints || 0,
  viewportWidth = globalThis.innerWidth || 1280,
} = {}) {
  const ios =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const mobile = ios && viewportWidth <= 1180;

  return Object.freeze({
    mobile,
    targetFrameRate: mobile ? 24 : 60,
    msaaSamples: mobile ? 1 : 4,
    resolutionScale: mobile ? 0.7 : 1,
    preserveDrawingBuffer: !mobile,
    maximumScreenSpaceError: mobile ? 32 : 16,
  });
}
