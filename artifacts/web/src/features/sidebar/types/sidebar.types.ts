// ─── Sidebar Types ────────────────────────────────────────────────────────────

import type { MenuIconKey } from '@/config/menuConfig'

// ── Raw shape returned by POST /sidebar/user ─────────────────────────────────
export interface RawSidebarMenuItem {
  key: string
  name: string
  route?: string
  icon?: string
  module?: string
}

export interface SidebarApiResponse {
  industryId: string
  role: string
  menus: RawSidebarMenuItem[]
}

// ── Internal shape used by Sidebar component ──────────────────────────────────
export interface SidebarChildItem {
  id: string
  name: string
  route: string
  icon?: MenuIconKey
}

export interface SidebarNavItem {
  id: string
  name: string
  icon?: MenuIconKey
  route?: string
  module?: string
  children?: SidebarChildItem[]
}

// ── Hook return value ─────────────────────────────────────────────────────────
export interface UseSidebarMenuResult {
  menu: SidebarNavItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}
