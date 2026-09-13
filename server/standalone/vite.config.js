import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { createBrowserViteConfig } from '../../build/vite.js';
import { localProviderPlugins } from '../providers/local.js';
import { apiNotFoundPlugin } from './api-not-found.js';
import { accessGatePlugin } from './access-gate.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** Load this checkout's configuration and attach its local provider middleware. */
export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, root, '');
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  const cloudAccessPlugins = process.env.GEV_ACCESS_KEY
    ? [accessGatePlugin()]
    : [];
  const config = createBrowserViteConfig({
    plugins: [
      ...cloudAccessPlugins,
      ...localProviderPlugins(),
      apiNotFoundPlugin(),
    ],
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    cesiumToken: process.env.CESIUM_ION_TOKEN,
    host: process.env.HOST,
    port: process.env.PORT,
  });

  // This entry point is only used by the protected standalone server. Railway
  // assigns the public hostname after deployment, so Vite cannot know it while
  // the image is built. The access gate still authenticates every non-health
  // request before the application or provider middleware can answer it.
  return {
    ...config,
    define: {
      ...config.define,
      'import.meta.env.GEV_VOICE_ENABLED': JSON.stringify(
        Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
      ),
    },
    preview: { ...config.preview, allowedHosts: true },
  };
});
