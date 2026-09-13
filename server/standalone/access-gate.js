import { createHash, timingSafeEqual } from 'node:crypto';

const ACCESS_QUERY = 'app_access';
const ACCESS_COOKIE = 'gev_access';

function digest(value) {
  return createHash('sha256').update(value).digest('base64url');
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function readCookie(header, name) {
  const prefix = `${name}=`;
  for (const part of String(header || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) return value.slice(prefix.length);
  }
  return '';
}

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    '<!doctype html><meta name="viewport" content="width=device-width"><title>Private</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#020706;color:#b7ffcd;font-family:monospace"><p>PRIVATE APP CONNECTION REQUIRED</p></body>',
  );
}

export function accessGatePlugin({ env = process.env } = {}) {
  const key = String(env.GEV_ACCESS_KEY || '').trim();
  const expectedCookie = key ? digest(key) : '';

  const install = (server) => {
    server.middlewares.use((req, res, next) => {
      const requestUrl = new URL(req.url || '/', 'http://localhost');

      if (requestUrl.pathname === '/healthz') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('ok');
        return;
      }

      // No key means the upstream localhost development behavior is unchanged.
      if (!key) {
        next();
        return;
      }

      const cookie = readCookie(req.headers.cookie, ACCESS_COOKIE);
      if (constantTimeEqual(cookie, expectedCookie)) {
        next();
        return;
      }

      const suppliedKey = requestUrl.searchParams.get(ACCESS_QUERY) || '';
      if (constantTimeEqual(suppliedKey, key)) {
        requestUrl.searchParams.delete(ACCESS_QUERY);
        res.statusCode = 302;
        res.setHeader(
          'Set-Cookie',
          `${ACCESS_COOKIE}=${expectedCookie}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict`,
        );
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader(
          'Location',
          `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`,
        );
        res.end();
        return;
      }

      unauthorized(res);
    });
  };

  return {
    name: 'gev-private-cloud-access',
    configureServer: install,
    configurePreviewServer: install,
  };
}
