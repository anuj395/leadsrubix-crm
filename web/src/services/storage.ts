import type { AuthSession } from '@/features/auth'

const AUTH_STORAGE_KEY = 'rubix-crm.auth'

function readStorage<T>(key: string): T | null {
  const value = globalThis.localStorage?.getItem(key)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const storage = {
  clearAuthSession() {
    globalThis.localStorage?.removeItem(AUTH_STORAGE_KEY)
  },
  getAuthSession() {
    return readStorage<AuthSession>(AUTH_STORAGE_KEY)
  },
  setAuthSession(session: AuthSession) {
    globalThis.localStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  },
}