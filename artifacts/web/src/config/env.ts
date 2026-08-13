interface EnvironmentConfig {
  apiBaseUrl: string
  appName: string
  allowDemoFallback: boolean
}

function normalizeBaseUrl(url: string) {
  // remove trailing slashes only
  return url.replace(/\/+$/g, '').trim()
}

// Default to same-origin (empty string) so requests go to /api on the same host —
// the dev server proxies /api → backend, and in production the proxy routes /api
// to the API service.
const defaultApi = import.meta.env.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL)
  : ''

export const env: EnvironmentConfig = {
  apiBaseUrl: normalizeBaseUrl(defaultApi),
  appName: String(import.meta.env.VITE_APP_NAME ?? 'LeadsRubix'),
  allowDemoFallback: import.meta.env.VITE_ALLOW_DEMO_FALLBACK
    ? String(import.meta.env.VITE_ALLOW_DEMO_FALLBACK).toLowerCase() === 'true'
    : Boolean(import.meta.env.DEV),
}
