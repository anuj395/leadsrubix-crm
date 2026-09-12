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

function formatMenuName(key: string, route?: string, rawName?: string, industryId?: string): string {
  const k = (key || '').toLowerCase();
  const r = (route || '').toLowerCase();
  const n = (rawName || '').trim();
  const indCode = String(industryId || '').toLowerCase().trim();

  // Root Dashboard formatting
  if (k === 'analytics' || r === '/analytics' || r === '/dashboard') {
    if (!n || n.toLowerCase() === 'analytics') {
      return 'Dashboard';
    }
    return n;
  }

  // Dashboard layout builder
  if (k === 'uinavigation.analyticsconfig' || k === 'configuration.analyticsconfig' || r === '/ui-navigation/analytics-config' || r === '/configuration/analytics-config') {
    if (!n || n.toLowerCase() === 'analytics layout builder') {
      return 'Dashboard Layout Builder';
    }
    return n;
  }

  // Notifications & Automation
  if (k === 'integrations.whatsapp' || k === 'configuration.whatsapp' || r === '/integrations/whatsapp' || r === '/configuration/whatsapp' || r === '/configuration/notifications' || r === '/integrations/notifications') {
    return 'Notifications & Automation';
  }

  // Sector-Aware Lead / Inquiries Root Section Header
  if (k === 'leads') {
    if (indCode === 'temp0003') return 'Patients & Inquiries';
    if (indCode === 'temp0002') return 'Customers & Inquiries';
    if (indCode === 'temp0004') return 'Students & Admissions';
    if (indCode === 'temp0005') return 'Clients & Portfolios';
    if (indCode === 'temp0006') return 'Accounts & Inquiries';
    if (indCode === 'temp0007') return 'Dealers & Orders';
    // Real Estate (temp0001), Super Admin, or General
    return 'Leads & Inquiries';
  }

  // Sector-Aware Child Items Sanitation (Prevent "Students" from contaminating non-education tenants)
  if (k === 'leads.contact' || r === '/leads/contacts') {
    if (indCode === 'temp0004') return 'Students & Applicants';
    if (indCode === 'temp0003') return 'Patients List';
    if (indCode === 'temp0002') return 'Customer Directory';
    return 'Leads & Contacts';
  }

  if (k === 'leads.inquiries' || r === '/leads/inquiries') {
    return 'Inbound Inquiries';
  }

  if (k === 'leads.tasks' || r === '/leads/tasks') {
    return 'Tasks & Follow-ups';
  }

  if (k === 'leads.call' || r === '/leads/call-logs') {
    return 'Call Logs';
  }

  return n;
}

function resolveIconKey(key: string, route?: string, icon?: string): MenuIconKey {
  const k = (key || '').toLowerCase();
  const r = (route || '').toLowerCase();
  if (k === 'analytics' || r === '/analytics' || r === '/dashboard') {
    return 'dashboard';
  }
  return toIconKey(icon);
}

/**
 * Maps raw flat menu records from the database into a sorted parent-child hierarchy tree.
 * 
 * - The parent-child relationships, display names, modules, routes, and sort order
 *   are completely driven by the database config.
 */
export function mapApiMenusToNavItems(raw: RawSidebarMenuItem[], _roleKey?: string, industryId?: string): SidebarNavItem[] {
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
    let parentDoc = parentId && itemMap.has(String(parentId)) ? itemMap.get(String(parentId)) : null

    if (!parentDoc && item.key && item.key.includes('.')) {
      const parentKey = item.key.split('.')[0]
      parentDoc = Array.from(itemMap.values()).find(m => m.key === parentKey)
    }

    if (parentDoc && String(parentDoc._id) !== String(item._id)) {
      const pIdStr = String(parentDoc._id)
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
      name: formatMenuName(child.key, child.route, child.name, industryId),
      route: child.route ?? '#',
      icon: resolveIconKey(child.key, child.route, child.icon),
    }))

    result.push({
      id: root.key,
      name: formatMenuName(root.key, root.route, root.name, industryId),
      route: root.route,
      icon: resolveIconKey(root.key, root.route, root.icon),
      module: root.module ?? root.key,
      order: root.order ?? 999,
      children: mappedChildren.length > 0 ? mappedChildren : undefined
    })
  })

  return result
}
