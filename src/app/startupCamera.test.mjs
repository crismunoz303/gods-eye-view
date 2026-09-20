import test from 'node:test';
import assert from 'node:assert/strict';
import { flyToAustin, requestDeviceLocation } from '../camera.js';

test('teardown before the initial camera delay prevents a late flight', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let flights = 0;
  let cancelled = 0;
  const stop = flyToAustin({
    isDestroyed: () => false,
    camera: {
      setView() {},
      flyTo() {
        flights++;
      },
      cancelFlight() {
        cancelled++;
      },
    },
  });
  stop();
  t.mock.timers.tick(1000);
  assert.equal(flights, 0);
  assert.equal(cancelled, 1);
});

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test('device geolocation becomes the startup camera source', async () => {
  const storage = memoryStorage();
  const result = await requestDeviceLocation({
    geolocation: {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 34,
            longitude: -118.2,
            accuracy: 9,
          },
        });
      },
    },
    storage,
    now: () => 1000,
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'live');
  assert.equal(result.latitude, 34);
  assert.equal(result.longitude, -118.2);
  assert.equal(result.accuracy, 9);
});

test('permission denial never reuses a cached location', async () => {
  const storage = memoryStorage({
    'gev:last-device-location:v1': JSON.stringify({
      latitude: 34,
      longitude: -118,
      accuracy: 20,
      timestamp: 900,
    }),
  });
  const result = await requestDeviceLocation({
    geolocation: {
      getCurrentPosition(_success, error) {
        error({ code: 1 });
      },
    },
    storage,
    now: () => 1000,
  });

  assert.deepEqual(
    { ok: result.ok, reason: result.reason },
    { ok: false, reason: 'denied' },
  );
});

test('temporary provider failure may use a recent cached location', async () => {
  const storage = memoryStorage({
    'gev:last-device-location:v1': JSON.stringify({
      latitude: 33.98,
      longitude: -118.22,
      accuracy: 35,
      timestamp: 900,
    }),
  });
  const result = await requestDeviceLocation({
    geolocation: {
      getCurrentPosition(_success, error) {
        error({ code: 3 });
      },
    },
    storage,
    now: () => 1000,
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'cached');
  assert.equal(result.latitude, 33.98);
  assert.equal(result.longitude, -118.22);
});
