import cesium from 'vite-plugin-cesium';

/** Build browser assets with explicit inputs; never load environment or providers. */
export function createBrowserViteConfig({
  plugins = [],
  googleApiKey,
  cesiumToken,
  host = 'localhost',
  port = 4173,
} = {}) {
  const allowedHosts =
    host === '0.0.0.0' || host === '::'
      ? true
      : ['localhost', '127.0.0.1', '.local'];

  return {
    plugins: [cesium(), ...plugins],
    server: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts,
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/ENVIRONMENT'],
      },
      // These headers protect the document containing Provider Settings.
      headers: {
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
      },
    },
    preview: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts,
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}
