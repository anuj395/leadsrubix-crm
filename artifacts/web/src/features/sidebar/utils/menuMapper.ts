import type { MenuIconKey } from '@/config/menuConfig'
import type { RawSidebarMenuItem, SidebarNavItem, SidebarChildItem } from '../types/sidebar.types'

// ── Icon string → MenuIconKey ─────────────────────────────────────────────────
const ICON_MAP: Record<string, MenuIconKey> = {
  account: 'account', analytics: 'analytics', api: 'api',
  billing: 'billing', blog: 'blog', booking: 'booking',
  call: 'call', configuration: 'configuration', contact: 'contact',
  coupon: 'coupon', dashboard: 'dashboard', data: 'data',
  faq: 'faq', headers: 'headers', leads: 'leads',
  news: 'news', organization: 'organization', password: 'password',
  projects: 'projects', resources: 'resources', settings: 'settings',
  shield: 'shield', sidebar: 'sidebar', sort: 'sort',
  support: 'support', tasks: 'tasks', users: 'users', whatsapp: 'whatsapp',
  leaddistribution: 'leadDistribution',
  reassignlist: 'reassignList',
  uinavigation: 'sidebar',
  accesscontrol: 'shield',
}

export function toIconKey(icon?: string): MenuIconKey {
  return (icon && ICON_MAP[icon.toLowerCase()]) ? ICON_MAP[icon.toLowerCase()] : 'data'
}

/**
 * Maps raw flat menu records from the database into a sorted parent-child hierarchy tree.
 * 
 * - The parent-child relationships, display names, modules, routes, and sort order
 *   are completely driven by the database config.
 */
export function mapApiMenusToNavItems(raw: RawSidebarMenuItem[], _roleKey?: string): SidebarNavItem[] {
  if (!raw?.length) return []

  // Create a map of ID -> raw item for quick lookup
  const itemMap = new Map<string, RawSidebarMenuItem>()
  raw.forEach(item => {
    itemMap.set(item._id, item)
  })

  // Distinguish roots (parent_id is null/empty or invalid) and children
  const roots: RawSidebarMenuItem[] = []
  const childrenMap = new Map<string, RawSidebarMenuItem[]>()

  raw.forEach(item => {
    const parentId = item.parent_id || item.parentId
    if (parentId && itemMap.has(String(parentId))) {
      const pIdStr = String(parentId)
      if (!childrenMap.has(pIdStr)) {
        childrenMap.set(pIdStr, [])
      }
      childrenMap.get(pIdStr)!.push(item)
    } else {
      roots.push(item)
    }
  })

  // Sort roots by order numerically
  roots.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

  const result: SidebarNavItem[] = []

  roots.forEach(root => {
    const rootIdStr = String(root._id)
    const children = childrenMap.get(rootIdStr) || []
    
    // Sort children by order numerically
    children.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

    const mappedChildren: SidebarChildItem[] = children.map(child => ({
      id: child.key,
      name: child.name,
      route: child.route ?? '#',
      icon: toIconKey(child.icon),
    }))

    result.push({
      id: root.key,
      name: root.name,
      route: root.route,
      icon: toIconKey(root.icon),
      module: root.module ?? root.key,
      order: root.order ?? 999,
      children: mappedChildren.length > 0 ? mappedChildren : undefined
    })
  })

  return result
}
