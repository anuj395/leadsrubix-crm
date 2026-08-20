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
  description?: string
  infoHelp?: string
}

export interface SidebarApiResponse {
  industryId: string
  role: string
  menus: RawSidebarMenuItem[]
}

// ── Internal shape used by Sidebar component ──────────────────────────────────
export interface SidebarChildItem {
  id: string
  key?: string
  name: string
  route: string
  icon?: MenuIconKey
  description?: string
  infoHelp?: string
}

export interface SidebarNavItem {
  id: string
  key?: string
  name: string
  icon?: MenuIconKey
  route?: string
  module?: string
  order?: number
  description?: string
  infoHelp?: string
  children?: SidebarChildItem[]
}

// ── Hook return value ─────────────────────────────────────────────────────────
export interface UseSidebarMenuResult {
  menu: SidebarNavItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}
