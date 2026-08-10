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

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  uinavigation: 'UI & Navigation',
  accesscontrol: 'Access Control',
  account: 'Account & Settings',
  invoices: 'Invoices',
  configuration: 'Configuration',
  integrations: 'Integrations',
  analytics: 'Analytics',
  organization: 'Organization',
  users: 'Users',
  leads: 'Lead Section',
  support: 'Support',
}

const ADMIN_MODULE_ORDER: Record<string, number> = {
  analytics: 10,
  users: 20,
  leads: 30,
  leaddistribution: 40,
  configuration: 50,
  integrations: 60,
  uinavigation: 70,
  accesscontrol: 80,
  account: 90,
  invoices: 92,
  support: 100,
}

const SUPER_ADMIN_MODULE_ORDER: Record<string, number> = {
  analytics: 10,
  organization: 20,
  users: 30,
  leads: 40,
  configuration: 50,
  integrations: 60,
  uinavigation: 70,
  accesscontrol: 80,
  invoices: 90,
  support: 100,
  account: 110,
}

export function toIconKey(icon?: string): MenuIconKey {
  return (icon && ICON_MAP[icon.toLowerCase()]) ? ICON_MAP[icon.toLowerCase()] : 'data'
}

export function mapApiMenusToNavItems(raw: RawSidebarMenuItem[], roleKey?: string): SidebarNavItem[] {
  if (!raw?.length) return []
  const filtered = raw.filter((item) => {
    const k = (item.key || '').toLowerCase()
    const n = (item.name || '').toLowerCase()
    const r = (item.route || '').toLowerCase()
    if (k.includes('booking') || n.includes('booking') || r.includes('booking')) {
      return false
    }
    if (roleKey === 'admin') {
      if (k === 'analytics.dashboard' || k === 'users.list' || k === 'analytics.config') {
        return false
      }
    }
    if (roleKey === 'superAdmin') {
      if (
        k === 'analytics.dashboard' ||
        k === 'users.list' ||
        k === 'configuration.apidata' ||
        k === 'integrations.apidata' ||
        k === 'leaddistribution' ||
        k.startsWith('leaddistribution.') ||
        k === 'tool' ||
        k.startsWith('tool.') ||
        k === 'configuration.holiday' ||
        k === 'configuration.days' ||
        k === 'account.subscription'
      ) {
        return false
      }
    }
    return true
  })

  // Remap modules & child names for Super Admin / Admin to match requested structure
  if (roleKey === 'superAdmin' || roleKey === 'admin') {
    filtered.forEach((item) => {
      const k = item.key
      if (k === 'leads') {
        item.name = 'Lead Section'
      } else if (k === 'configuration.industries') {
        item.name = 'Industry'
      } else if (k === 'configuration.projects') {
        item.name = 'Project'
      } else if (k === 'configuration.resources') {
        item.name = 'Resource'
      } else if (k === 'configuration.holiday') {
        item.name = 'Holidays Configuration'
      } else if (k === 'configuration.days') {
        item.name = 'Working Days Configuration'
      } else if (k === 'configuration.domainSettings' || k === 'integrations.domainSettings') {
        item.name = 'Domain Setting'
      } else if (k === 'invoices.paymentLogs') {
        item.name = 'Payment Invoices Logs'
      } else if (k === 'invoices.receiptsHistory') {
        item.name = 'Receipts & Historical Charges'
      } else if (k === 'support.news') {
        item.name = 'News List'
      } else if (k === 'support.faq') {
        item.name = 'FAQ List'
      } else if (k === 'account.subscription') {
        item.name = 'Subscription Details'
      } else if (k === 'account.password') {
        item.name = 'Update Password'
      } else if (k === 'configuration.api' || k === 'integrations.api') {
        item.module = 'integrations'
        item.name = 'API Token'
      } else if (k === 'integrations.apiData' || k === 'configuration.apiData') {
        item.name = 'API Data'
      } else if (k === 'configuration.whatsapp' || k === 'integrations.whatsapp') {
        item.module = 'integrations'
        item.name = 'WhatsApp API'
      } else if (k === 'configuration.menus' || k === 'uiNavigation.menus') {
        item.module = 'uinavigation'
        item.name = 'Sidebar Menus'
      } else if (k === 'configuration.screens' || k === 'uiNavigation.screens') {
        item.module = 'uinavigation'
        item.name = 'Screens'
      } else if (k === 'configuration.screenFields' || k === 'uiNavigation.screenFields') {
        item.module = 'uinavigation'
        item.name = 'Screen Fields'
      } else if (k === 'analytics.config' || k === 'configuration.analyticsConfig' || k === 'uiNavigation.analyticsConfig') {
        item.key = 'uiNavigation.analyticsConfig'
        item.module = 'uinavigation'
        item.name = 'Analytics Layout Builder'
        item.route = '/ui-navigation/analytics-config'
      } else if (k === 'configuration.permissions' || k === 'accessControl.permissions') {
        item.module = 'accesscontrol'
        item.name = 'Permission Matrix (Sidebar)'
      } else if (k === 'configuration.screenPermissions' || k === 'accessControl.screenPermissions') {
        item.module = 'accesscontrol'
        item.name = 'Permission Fields'
      } else if (k === 'users.roles' || k === 'accessControl.roles') {
        item.module = 'accesscontrol'
        item.name = 'Role & Permission'
      } else if (k === 'account.licenses') {
        item.name = 'License Cost'
      } else if (k === 'account.coupons') {
        item.name = 'Coupons'
      } else if (k === 'leads.contact' || k === 'leads.contacts') {
        item.name = 'Contacts List'
      } else if (k === 'leads.tasks') {
        item.name = 'Tasks List'
      } else if (k === 'leads.call' || k === 'leads.callLogs') {
        item.name = 'Call Logs List'
      } else if (k === 'leads.sorted') {
        item.name = 'Sorted List'
      }
    })
  }

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
      const defaultRoutes: Record<string, string> = {
        analytics: '/analytics',
        organization: '/organization/list',
        users: '/users',
      }
      const itemKey = parent?.key ?? mod
      const itemRoute = parent?.route || defaultRoutes[mod.toLowerCase()] || `/${mod}`
      const itemName = parent?.name || MODULE_DISPLAY_NAMES[mod.toLowerCase()] || (mod.charAt(0).toUpperCase() + mod.slice(1))

      result.push({
        id: itemKey,
        name: itemName,
        route: itemRoute,
        icon: toIconKey(parent?.icon ?? mod),
        module: mod,
      })
    } else {
      // Parent + children: deduplicate child items strictly by route or name
      const uniqueChildrenMap = new Map<string, SidebarChildItem>()
      children.forEach((c) => {
        const dedupeKey = (c.route && c.route !== '#') ? c.route.toLowerCase().trim() : c.name.toLowerCase().trim()
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
        name: parent?.name || MODULE_DISPLAY_NAMES[mod.toLowerCase()] || (mod.charAt(0).toUpperCase() + mod.slice(1)),
        icon: toIconKey(parent?.icon ?? mod),
        route: parent?.route,
        module: mod,
        children: childItems,
      })
    }
  })

  if (roleKey === 'admin') {
    result.sort((a, b) => {
      const modA = (a.module || a.id || '').toLowerCase()
      const modB = (b.module || b.id || '').toLowerCase()
      const orderA = ADMIN_MODULE_ORDER[modA] ?? 999
      const orderB = ADMIN_MODULE_ORDER[modB] ?? 999
      return orderA - orderB
    })
  } else if (roleKey === 'superAdmin') {
    result.sort((a, b) => {
      const modA = (a.module || a.id || '').toLowerCase()
      const modB = (b.module || b.id || '').toLowerCase()
      const orderA = SUPER_ADMIN_MODULE_ORDER[modA] ?? 999
      const orderB = SUPER_ADMIN_MODULE_ORDER[modB] ?? 999
      return orderA - orderB
    })
  }

  return result
}
