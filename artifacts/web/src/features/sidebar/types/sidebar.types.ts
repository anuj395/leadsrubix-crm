// ─── Sidebar Types ────────────────────────────────────────────────────────────

import type { MenuIconKey } from '@/config/menuConfig'

// ── Raw shape returned by POST /sidebar/user ─────────────────────────────────
export interface RawSidebarMenuItem {
  _id: string
  key: string
  name: string
  route?: string
  icon?: string
  module?: string
  order?: number
  parent_id?: string | null
  parentId?: string | null
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
  order?: number
  children?: SidebarChildItem[]
}

// ── Hook return value ─────────────────────────────────────────────────────────
export interface UseSidebarMenuResult {
  menu: SidebarNavItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}
