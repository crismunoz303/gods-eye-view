import type { CapacitorConfig } from '@capacitor/cli';

const remoteUrl = (process.env.GEV_SERVER_URL || '').trim().replace(/\/$/, '');
const accessKey = (process.env.GEV_APP_ACCESS_KEY || '').trim();

if (remoteUrl && !remoteUrl.startsWith('https://')) {
  throw new Error(
    'GEV_SERVER_URL must be an https:// URL for an iPhone build.',
  );
}

if (remoteUrl && accessKey.length < 32) {
  throw new Error(
    'GEV_APP_ACCESS_KEY must contain at least 32 characters for a cloud iPhone build.',
  );
}

const config: CapacitorConfig = {
  appId: 'com.crismunoz.godseyeview',
  appName: "God's Eye View",
  webDir: 'dist',
  backgroundColor: '#000000',
  loggingBehavior: 'debug',
  ios: {
    backgroundColor: '#000000',
    contentInset: 'never',
    scrollEnabled: true,
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    webContentsDebuggingEnabled: false,
  },
  ...(remoteUrl
    ? {
        server: {
          url: `${remoteUrl}/?app_access=${encodeURIComponent(accessKey)}`,
          cleartext: false,
          allowNavigation: [new URL(remoteUrl).hostname],
          errorPath: 'offline.html',
        },
      }
    : {}),
};

export default config;
