import { spawn } from 'node:child_process';

const accessKey = String(process.env.GEV_ACCESS_KEY || '').trim();
const publicShare = ['1', 'true', 'yes'].includes(
  String(process.env.GEV_PUBLIC_SHARE || '')
    .trim()
    .toLowerCase(),
);

if (!publicShare && accessKey.length < 32) {
  console.error(
    'GEV_ACCESS_KEY must be set to a private value of at least 32 characters, or GEV_PUBLIC_SHARE=1 must be set explicitly.',
  );
  process.exit(1);
}

if (publicShare && accessKey) {
  console.error(
    'GEV_PUBLIC_SHARE cannot be combined with GEV_ACCESS_KEY. Remove the access key before starting a public service.',
  );
  process.exit(1);
}

const rawPort = String(process.env.PORT || '4173');
if (
  !/^\d{1,5}$/.test(rawPort) ||
  Number(rawPort) < 1 ||
  Number(rawPort) > 65535
) {
  console.error('PORT must be an integer from 1 to 65535.');
  process.exit(1);
}

const host = String(process.env.HOST || '0.0.0.0').trim();
const childEnv = { ...process.env, HOST: host };
if (publicShare && !childEnv.OPENSKY_AUTH_MODE) {
  childEnv.OPENSKY_AUTH_MODE = 'anon';
}

const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url);
const child = spawn(
  process.execPath,
  [viteBin.pathname, 'preview', '--host', host, '--port', rawPort],
  {
    stdio: 'inherit',
    env: childEnv,
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
