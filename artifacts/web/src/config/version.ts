export interface BuildInfo {
  version: string
  buildHash: string
  buildDate: string
  env: string
}

export const APP_BUILD_INFO: BuildInfo = {
  version: (import.meta as any).env?.VITE_APP_VERSION || '1.0.0',
  buildHash: (import.meta as any).env?.VITE_BUILD_HASH || 'dev',
  buildDate: (import.meta as any).env?.VITE_BUILD_TIME || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
  env: (import.meta as any).env?.MODE || 'development',
}
