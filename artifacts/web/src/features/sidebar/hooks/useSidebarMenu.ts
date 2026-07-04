import { useCallback, useEffect } from 'react'

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
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as SidebarNavItem[]) : null
  } catch { return null }
}

function clearPersistedMenu() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

// ── Map static superAdmin config to SidebarNavItem[] ─────────────────────────
const mappedSuperAdminMenu: SidebarNavItem[] = mapApiMenusToNavItems(superAdminMenuConfig as any)
function mapSuperAdminConfig(): SidebarNavItem[] {
  return mappedSuperAdminMenu
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/**
 * `useSidebarMenu` — single source of truth for sidebar navigation.
 *
 * - role === "superAdmin"  → returns static adminMenuConfig (no API call)
 * - all other roles        → POST /sidebar/user, persisted to localStorage
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
    if (!user || isSuperAdmin) return

    const industryId = user.industryId
    if (!industryId) {
      console.warn('[useSidebarMenu] user.industryId is missing — skipping API fetch.')
      return
    }

    const result = await dispatch(loadSidebarMenu({ industryId, role: user.role }))

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

    if (isSuperAdmin) {
      dispatch(setSidebarItems(mapSuperAdminConfig()))
      return
    }

    // Hydrate from localStorage immediately for instant UX
    const cached = loadPersistedMenu()
    if (cached?.length) dispatch(setSidebarItems(cached))

    // Then fetch fresh from API
    void fetchMenu()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, isAuthenticated])

  const menu: SidebarNavItem[] = isSuperAdmin ? mapSuperAdminConfig() : reduxItems 
  console.log("reduxItems",menu);

  return {
    menu,
    loading: isSuperAdmin ? false : loading,
    error:   isSuperAdmin ? null  : error,
    refresh: fetchMenu,
  }
}
