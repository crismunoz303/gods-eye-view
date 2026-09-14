import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRenderProfile } from './renderProfile.js';

test('iPhone receives the lower-cost rendering profile', () => {
  assert.deepEqual(
    resolveRenderProfile({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X)',
      maxTouchPoints: 5,
      viewportWidth: 440,
    }),
    {
      mobile: true,
      targetFrameRate: 30,
      msaaSamples: 1,
      resolutionScale: 0.9,
      preserveDrawingBuffer: false,
      maximumScreenSpaceError: 24,
    },
  );
});

test('desktop rendering quality remains unchanged', () => {
  const profile = resolveRenderProfile({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
    maxTouchPoints: 0,
    viewportWidth: 1440,
  });
  assert.equal(profile.mobile, false);
  assert.equal(profile.targetFrameRate, 60);
  assert.equal(profile.msaaSamples, 4);
  assert.equal(profile.resolutionScale, 1);
  assert.equal(profile.preserveDrawingBuffer, true);
  assert.equal(profile.maximumScreenSpaceError, 16);
});
