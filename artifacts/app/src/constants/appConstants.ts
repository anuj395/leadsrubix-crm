import { Platform } from 'react-native';

const LIVE_API_URL = 'https://api1.leadsrubix.com/api';
const LIVE_WEB_URL = 'https://web.leadsrubix.com';

const getDevApiUrl = () => {
  // If explicitly overridden via EXPO_PUBLIC_API_URL environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Android Emulator maps localhost to 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }
  // iOS Simulator / Local Mac
  return 'http://127.0.0.1:8080/api';
};

// __DEV__ is true in Expo Go, Simulator, Metro, local debugging
// __DEV__ is false in App Store IPA, Play Store APK/AAB release builds
export const IS_PRODUCTION = !__DEV__;

export const APP_CONFIG = {
  appName: 'Leads Rubix',
  version: '1.0.0',
  build: '2026.08.27',
  environment: 'Production',
  buildNumber: '5',
  tagline: 'Enterprise Multi-Tenant CRM Engine',
  footerVersionText: 'v1.0.0 • Enterprise Edition',
  isProduction: IS_PRODUCTION,
  isDevelopment: __DEV__,
  // Auto-switches: Localhost during local development, Live Cloud API on production build
  apiBaseUrl: IS_PRODUCTION ? LIVE_API_URL : getDevApiUrl(),
  webBaseUrl: IS_PRODUCTION ? LIVE_WEB_URL : 'http://localhost:22333',
  liveApiUrl: LIVE_API_URL,
  liveWebUrl: LIVE_WEB_URL,
};
