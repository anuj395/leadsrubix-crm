export interface BuildInfo {
  version: string
  buildHash: string
  buildDate: string
  env: string
}

export const APP_BUILD_INFO: BuildInfo = {
  version: (import.meta as any).env?.VITE_APP_VERSION || '1.0.2',
  buildHash: (import.meta as any).env?.VITE_BUILD_HASH || '88f9c41',
  buildDate: (import.meta as any).env?.VITE_BUILD_TIME || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
  env: (import.meta as any).env?.MODE || 'production',
}
