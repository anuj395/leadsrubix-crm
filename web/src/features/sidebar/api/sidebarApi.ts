import axiosInstance from '@/services/axiosInstance'
import type { SidebarApiResponse, RawSidebarMenuItem } from '../types/sidebar.types'

// ── In-memory cache (30 s TTL) ────────────────────────────────────────────────
const CACHE_TTL_MS = 30_000
interface CacheEntry { ts: number; data: RawSidebarMenuItem[] }
const cache = new Map<string, CacheEntry>()

/**
 * Fetches sidebar menu items for the given industry + role.
 * POST /sidebar/user  →  { industryId, role, menus: [...] }
 */
export async function fetchSidebarMenu(
  industryId: string,
  role: string,
  organizationId?: string,
): Promise<RawSidebarMenuItem[]> {
  const key = `${organizationId || 'global'}:${industryId}:${role}`
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.data

  const response = await axiosInstance.post<SidebarApiResponse>('/sidebar/user', {
    industryId: industryId,
    role,
  })

  const menus = response.data?.menus ?? []
  cache.set(key, { ts: now, data: menus })
  return menus
}

/** Clears the in-memory cache (called on logout). */
export function clearSidebarCache() {
  cache.clear()
}
