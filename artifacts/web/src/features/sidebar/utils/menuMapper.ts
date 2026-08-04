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
}

export function toIconKey(icon?: string): MenuIconKey {
  return (icon && ICON_MAP[icon.toLowerCase()]) ? ICON_MAP[icon.toLowerCase()] : 'data'
}

/**
 * Converts the flat `menus` array from the API into a nested SidebarNavItem[].
 *
 * Items are grouped by their `module` field.
 * Items whose `key` contains a dot (e.g. "leads.contacts") are treated as
 * children of the matching parent group; others are top-level leaves.
 *
 * Example:
 *   { key: "leads",          name: "Leads",         icon: "leads",   module: "leads" }
 *   { key: "leads.contacts", name: "Contacts List",  icon: "contact", module: "leads" }
 *   → SidebarNavItem { id:"leads", name:"Leads", icon:"leads",
 *       children: [{ id:"leads.contacts", name:"Contacts List", route:"...", icon:"contact" }] }
 */
export function mapApiMenusToNavItems(raw: RawSidebarMenuItem[]): SidebarNavItem[] {
  if (!raw?.length) return []
  const filtered = raw.filter((item) => {
    const k = (item.key || '').toLowerCase()
    const n = (item.name || '').toLowerCase()
    const r = (item.route || '').toLowerCase()
    return !k.includes('booking') && !n.includes('booking') && !r.includes('booking')
  })

  // Group by module, preserving insertion order
  const groups = new Map<string, { parent: RawSidebarMenuItem | null; children: RawSidebarMenuItem[] }>()

  filtered.forEach((item) => {
    const mod = (item.module ?? item.key).toLowerCase()
    if (!groups.has(mod)) groups.set(mod, { parent: null, children: [] })
    const g = groups.get(mod)!

    if (item.key.includes('.')) {
      g.children.push(item)
    } else {
      g.parent = item
    }
  })

  const result: SidebarNavItem[] = []

  groups.forEach((g, mod) => {
    const { parent, children } = g

    if (children.length === 0) {
      // Pure leaf
      if (parent) {
        result.push({
          id: parent.key,
          name: parent.name,
          route: parent.route,
          icon: toIconKey(parent.icon),
          module: mod,
        })
      }
    } else {
      // Parent + children: deduplicate child items by key and route
      const uniqueChildrenMap = new Map<string, SidebarChildItem>()
      children.forEach((c) => {
        const dedupeKey = c.key || c.route || c.name
        if (!uniqueChildrenMap.has(dedupeKey)) {
          uniqueChildrenMap.set(dedupeKey, {
            id: c.key,
            name: c.name,
            route: c.route ?? '#',
            icon: toIconKey(c.icon),
          })
        }
      })
      const childItems: SidebarChildItem[] = Array.from(uniqueChildrenMap.values())

      result.push({
        id: parent?.key ?? mod,
        name: parent?.name ?? (mod.charAt(0).toUpperCase() + mod.slice(1)),
        icon: toIconKey(parent?.icon ?? mod),
        route: parent?.route,
        module: mod,
        children: childItems,
      })
    }
  })

  return result
}
