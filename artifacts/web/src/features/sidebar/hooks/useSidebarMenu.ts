import { useCallback, useEffect, useMemo } from 'react'

import { superAdminMenuConfig } from '@/config/menuConfig'
import { useAuth } from '@/hooks/useAuth'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

import {
  loadSidebarMenu,
  resetSidebar,
  selectSidebarError,
  selectSidebarItems,
  selectSidebarLoading,
  setSidebarItems,
} from '../store/sidebarSlice'
import type { SidebarNavItem, UseSidebarMenuResult } from '../types/sidebar.types'
import { mapApiMenusToNavItems } from '../utils/menuMapper'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = 'rubix-crm.sidebar-menu'

function persistMenu(items: SidebarNavItem[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)) } catch { /* quota */ }
}

function loadPersistedMenu(): SidebarNavItem[] | null {
  return null;
}

function clearPersistedMenu() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

// ── Map static superAdmin config to SidebarNavItem[] ─────────────────────────
const mappedSuperAdminMenu: SidebarNavItem[] = mapApiMenusToNavItems(superAdminMenuConfig as any, 'superAdmin')
function mapSuperAdminConfig(): SidebarNavItem[] {
  return mappedSuperAdminMenu
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/**
 * `useSidebarMenu` — single source of truth for sidebar navigation.
 *
 * - Reads dynamically from DB for all roles (including superAdmin)
 * - Gated and persisted to localStorage.
 *
 * Returns { menu, loading, error, refresh }
 */
export function useSidebarMenu(): UseSidebarMenuResult {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAuth()

  const reduxItems = useAppSelector(selectSidebarItems)
  const loading    = useAppSelector(selectSidebarLoading)
  const error      = useAppSelector(selectSidebarError)

  const isSuperAdmin = user?.role === 'superAdmin'

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    if (!user) return

    let industryId = user.industryId || (user as any).industry_id || (user as any).industryCode || (user as any).industry_code
    if (!industryId && isSuperAdmin) {
      industryId = 'temp0001'
    }
    const role = user.role || (user as any).roleKey || (user as any).role_key
    const organizationId = (user as any).organizationId || (user as any).organization_id
    if (!industryId) {
      console.warn('[useSidebarMenu] user.industryId is missing — skipping API fetch.')
      return
    }

    const result = await dispatch(loadSidebarMenu({ industryId, role, organizationId }))

    if (loadSidebarMenu.fulfilled.match(result)) {
      persistMenu(result.payload)
    }
  }, [dispatch, user, isSuperAdmin])

  // ── On auth / role change ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) {
      dispatch(resetSidebar())
      clearPersistedMenu()
      return
    }

    // Hydrate from localStorage immediately for instant UX
    const cached = loadPersistedMenu()
    if (cached?.length) dispatch(setSidebarItems(cached))

    // Then fetch fresh from API
    void fetchMenu()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, isAuthenticated])

  const menu = useMemo(() => {
    let list = reduxItems

    // Filter out all booking items
    list = list
      .filter((item) => !item.id.toLowerCase().includes('booking') && !item.name.toLowerCase().includes('booking'))
      .map((item) => ({
        ...item,
        children: item.children?.filter((c) => !c.id.toLowerCase().includes('booking') && !c.name.toLowerCase().includes('booking'))
      }))

    return list
  }, [reduxItems])

  return {
    menu,
    loading,
    error,
    refresh: fetchMenu,
  }
}
