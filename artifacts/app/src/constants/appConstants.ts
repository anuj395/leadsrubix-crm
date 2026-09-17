import { Platform } from 'react-native';

const LIVE_API_URL = 'https://api1.leadsrubix.com/api';
const LIVE_WEB_URL = 'https://web.leadsrubix.com';

const getDevApiUrl = () => {
  // If explicitly overridden via EXPO_PUBLIC_API_URL environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // If explicit local dev backend requested via EXPO_PUBLIC_USE_LOCAL
  if (process.env.EXPO_PUBLIC_USE_LOCAL === 'true') {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080/api';
    }
    return 'http://127.0.0.1:8080/api';
  }
  // Default to live cloud backend for seamless simulator & reviewer testing
  return LIVE_API_URL;
};

// __DEV__ is true in Expo Go, Simulator, Metro, local debugging
// __DEV__ is false in App Store IPA, Play Store APK/AAB release builds
export const IS_PRODUCTION = !__DEV__;

export const APP_CONFIG = {
  appName: 'Leads Rubix',
  version: '1.0.1',
  build: '2026.09.16',
  environment: 'Production',
  buildNumber: '10',
  tagline: 'Enterprise Sales & Relationship Management CRM',
  footerVersionText: 'v1.0.1 • Enterprise Edition',
  isProduction: IS_PRODUCTION,
  isDevelopment: __DEV__,
  // Auto-switches: Localhost during local development, Live Cloud API on production build
  apiBaseUrl: IS_PRODUCTION ? LIVE_API_URL : getDevApiUrl(),
  webBaseUrl: IS_PRODUCTION ? LIVE_WEB_URL : 'http://localhost:3000',
  liveApiUrl: LIVE_API_URL,
  liveWebUrl: LIVE_WEB_URL,
};
