import assert from 'node:assert/strict';
import test from 'node:test';
import { accessGatePlugin } from '../server/standalone/access-gate.js';

function middlewareFor(key) {
  let middleware;
  accessGatePlugin({
    env: key ? { GEV_ACCESS_KEY: key } : {},
  }).configurePreviewServer({
    middlewares: {
      use(fn) {
        middleware = fn;
      },
    },
  });
  return middleware;
}

function invoke(middleware, { url = '/', cookie = '' } = {}) {
  const result = { headers: {}, next: false, body: '' };
  const req = { url, headers: { cookie } };
  const res = {
    statusCode: 200,
    setHeader(name, value) {
      result.headers[name.toLowerCase()] = value;
    },
    end(body = '') {
      result.statusCode = this.statusCode;
      result.body = body;
    },
  };
  middleware(req, res, () => {
    result.next = true;
  });
  return result;
}

test('cloud access gate leaves keyless localhost development unchanged', () => {
  assert.equal(invoke(middlewareFor('')).next, true);
});

test('cloud access gate exposes only its keyless health probe', () => {
  const middleware = middlewareFor('a'.repeat(32));
  const health = invoke(middleware, { url: '/healthz' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.body, 'ok');
  assert.equal(invoke(middleware, { url: '/' }).statusCode, 401);
  assert.equal(invoke(middleware, { url: '/api/opensky' }).statusCode, 401);
});

test('cloud access gate trades the private launch query for an HTTP-only cookie', () => {
  const key = 'correct-horse-battery-staple-123456';
  const middleware = middlewareFor(key);
  const login = invoke(middleware, {
    url: `/?app_access=${encodeURIComponent(key)}&setup=1`,
  });

  assert.equal(login.statusCode, 302);
  assert.equal(login.headers.location, '/?setup=1');
  assert.match(login.headers['set-cookie'], /^gev_access=[A-Za-z0-9_-]+;/);
  assert.match(
    login.headers['set-cookie'],
    /HttpOnly; Secure; SameSite=Strict/,
  );
  assert.doesNotMatch(login.headers['set-cookie'], new RegExp(key));

  const cookie = login.headers['set-cookie'].split(';', 1)[0];
  assert.equal(invoke(middleware, { url: '/api/opensky', cookie }).next, true);
});

test('cloud access gate rejects wrong query and cookie values', () => {
  const middleware = middlewareFor('z'.repeat(32));
  assert.equal(
    invoke(middleware, { url: '/?app_access=wrong' }).statusCode,
    401,
  );
  assert.equal(
    invoke(middleware, { cookie: 'gev_access=wrong' }).statusCode,
    401,
  );
});
