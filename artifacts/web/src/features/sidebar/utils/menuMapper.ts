import type { MenuIconKey } from '@/config/menuConfig'
import type { RawSidebarMenuItem, SidebarNavItem, SidebarChildItem } from '../types/sidebar.types'
import { translationService } from '@/services/translationService'

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

export const MODULE_INFO_HELP: Record<string, string> = {
  analytics: 'Real-time analytics for lead volume, conversion rates, and pipeline trends.',
  users: 'Invite team members, assign departments, and configure permissions.',
  'users.list': 'Directory of active and invited team members with role details.',
  'users.roles': 'Configure role privileges, screen access, and action permissions.',
  'leads.contact': 'Central database of customer leads, stages, and qualification details.',
  'leads.tasks': 'Actionable task manager for follow-ups, meetings, and deadlines.',
  'leads.call': 'Call logs, call outcomes, duration metrics, and client notes.',
  leadDistribution: 'Automate inbound lead routing using team quotas and criteria rules.',
  'leadDistribution.list': 'Rule-based lead routing engine for instant team assignment.',
  'leadDistribution.reassignList': 'Bulk lead reassignment and territory transfer workflow.',
  'configuration.projects': 'Manage master catalog of projects, properties, and mandates.',
  'configuration.resources': 'Track physical assets, equipment, and inventory allocations.',
  'configuration.holiday': 'Define organization holidays, shutdowns, and non-working days.',
  'configuration.days': 'Set operational business hours, shifts, and weekly schedules.',
  'configuration.domainSettings': 'Custom subdomain, domain mapping, and branding settings.',
  whatsapp: 'WhatsApp Cloud API integration for automated alerts and messages.',
  integrations: 'Connect third-party webhook endpoints and external REST APIs.',
  'integrations.api': 'API tokens for programmatic access and developer integrations.',
  'integrations.apiData': 'Incoming data payload logs and webhook delivery records.',
  'invoices.paymentLogs': 'Payment receipts, subscription invoices, and tax logs.',
  'invoices.receiptsHistory': 'Historical transaction records and billing charge history.',
  'account.subscription': 'Manage subscription plan, user seat limits, and upgrades.',
  'account.password': 'Update personal account credentials and security password.',
  'support.news': 'Company bulletins, announcements, and operational news feeds.',
  'support.faq': 'Frequently asked questions, SOPs, and onboarding guides.',
}

export function getModuleInfoHelp(key?: string, fallbackName?: string): string {
  if (!key) return fallbackName ? `Module: ${fallbackName}` : 'CRM Workspace Feature'
  if (MODULE_INFO_HELP[key]) return MODULE_INFO_HELP[key]
  const lowerKey = key.toLowerCase()
  for (const [k, v] of Object.entries(MODULE_INFO_HELP)) {
    if (lowerKey.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerKey)) return v
  }
  return `Comprehensive management portal for ${fallbackName || key}.`
}

/**
 * Clean Executive Navigation Tree with infoHelp descriptions
 */
export const DEFAULT_MASTER_SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'analytics',
    key: 'analytics',
    name: 'Analytics Overview',
    route: '/analytics',
    icon: 'analytics',
    order: 1,
    module: 'analytics',
    infoHelp: MODULE_INFO_HELP.analytics,
  },
  {
    id: 'leads_group',
    key: 'leads',
    name: 'Lead Pipeline',
    route: '',
    icon: 'leads',
    order: 2,
    module: 'leads',
    infoHelp: 'Core customer relationship management for leads, follow-ups, and interaction history.',
    children: [
      { id: 'leads_contacts', key: 'leads.contact', name: 'Contacts & Leads', route: '/leads/contacts', icon: 'contact', infoHelp: MODULE_INFO_HELP['leads.contact'] },
      { id: 'leads_tasks', key: 'leads.tasks', name: 'Tasks & Follow-ups', route: '/leads/tasks', icon: 'tasks', infoHelp: MODULE_INFO_HELP['leads.tasks'] },
      { id: 'leads_calls', key: 'leads.call', name: 'Call Interaction Logs', route: '/leads/call-logs', icon: 'call', infoHelp: MODULE_INFO_HELP['leads.call'] },
    ],
  },
  {
    id: 'users_group',
    key: 'users',
    name: 'Team & Access',
    route: '',
    icon: 'users',
    order: 3,
    module: 'users',
    infoHelp: MODULE_INFO_HELP.users,
    children: [
      { id: 'users_list', key: 'users.list', name: 'Team Members', route: '/users', icon: 'users', infoHelp: MODULE_INFO_HELP['users.list'] },
      { id: 'users_roles', key: 'users.roles', name: 'Roles & Permissions', route: '/users/roles', icon: 'shield', infoHelp: MODULE_INFO_HELP['users.roles'] },
    ],
  },
  {
    id: 'distribution_group',
    key: 'leadDistribution',
    name: 'Lead Distribution',
    route: '/lead-distribution/list',
    icon: 'leadDistribution',
    order: 4,
    module: 'leadDistribution',
    infoHelp: MODULE_INFO_HELP.leadDistribution,
  },
  {
    id: 'config_group',
    key: 'configuration',
    name: 'Operations & Catalog',
    route: '',
    icon: 'configuration',
    order: 5,
    module: 'configuration',
    infoHelp: 'Master catalogs, inventory, operational calendars, and workspace parameters.',
    children: [
      { id: 'cfg_projects', key: 'configuration.projects', name: 'Projects & Mandates', route: '/configuration/projects', icon: 'projects', infoHelp: MODULE_INFO_HELP['configuration.projects'] },
      { id: 'cfg_resources', key: 'configuration.resources', name: 'Resources & Inventory', route: '/configuration/resources', icon: 'resources', infoHelp: MODULE_INFO_HELP['configuration.resources'] },
      { id: 'cfg_days', key: 'configuration.days', name: 'Business Hours', route: '/configuration/days-config', icon: 'days', infoHelp: MODULE_INFO_HELP['configuration.days'] },
      { id: 'cfg_holidays', key: 'configuration.holiday', name: 'Holidays Calendar', route: '/configuration/holiday-config', icon: 'holiday', infoHelp: MODULE_INFO_HELP['configuration.holiday'] },
    ],
  },
  {
    id: 'integrations_group',
    key: 'integrations',
    name: 'Integrations & API',
    route: '/integrations/api-data',
    icon: 'api',
    order: 6,
    module: 'integrations',
    infoHelp: MODULE_INFO_HELP.integrations,
  },
  {
    id: 'billing_group',
    key: 'account.subscription',
    name: 'Subscription & Billing',
    route: '/account/subscription-details',
    icon: 'billing',
    order: 7,
    module: 'account',
    infoHelp: MODULE_INFO_HELP['account.subscription'],
  },
]

export const DEFAULT_SUPER_ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'analytics',
    key: 'analytics',
    name: 'Analytics',
    route: '/analytics',
    icon: 'analytics',
    order: 1,
    module: 'analytics',
    infoHelp: 'Real-time analytics for lead volume, conversion rates, and pipeline trends.',
  },
  {
    id: 'organization',
    key: 'organization',
    name: 'Organization',
    route: '/organization/list',
    icon: 'organization',
    order: 2,
    module: 'organization',
    infoHelp: 'Master organization directory and client workspace administration.',
  },
  {
    id: 'users',
    key: 'users',
    name: 'Users',
    route: '/users',
    icon: 'users',
    order: 3,
    module: 'users',
    infoHelp: 'Manage platform users, directory records, and account statuses.',
  },
  {
    id: 'leads_group',
    key: 'leads',
    name: 'Lead Inquiries',
    route: '',
    icon: 'leads',
    order: 4,
    module: 'leads',
    infoHelp: 'Lead pipeline management, interaction records, and sorted lists.',
    children: [
      { id: 'leads_contacts', key: 'leads.contacts', name: 'Contacts', route: '/leads/contacts', icon: 'contact', infoHelp: 'Central database of customer leads, stages, and qualification details.' },
      { id: 'leads_tasks', key: 'leads.tasks', name: 'Tasks & Activities', route: '/leads/tasks', icon: 'tasks', infoHelp: 'Actionable task manager for follow-ups, meetings, and deadlines.' },
      { id: 'leads_calls', key: 'leads.callLogs', name: 'Call Interaction Logs', route: '/leads/call-logs', icon: 'call', infoHelp: 'Call logs, call outcomes, duration metrics, and client notes.' },
      { id: 'leads_sorted', key: 'leads.sorted', name: 'Sorted List', route: '/leads/sorted', icon: 'sort', infoHelp: 'Sorted and ranked lead prioritization queue.' },
    ],
  },
  {
    id: 'config_group',
    key: 'configuration',
    name: 'Configuration',
    route: '',
    icon: 'configuration',
    order: 5,
    module: 'configuration',
    infoHelp: 'Manage industry blueprints, project catalog, and asset allocations.',
    children: [
      { id: 'cfg_industries', key: 'configuration.industries', name: 'Industry', route: '/configuration/industries', icon: 'organization', infoHelp: 'Configure industry verticals, templates, and vocabulary mapping.' },
      { id: 'cfg_projects', key: 'configuration.projects', name: 'Project & Service', route: '/configuration/projects', icon: 'projects', infoHelp: 'Manage master catalog of projects, properties, and mandates.' },
      { id: 'cfg_resources', key: 'configuration.resources', name: 'Resources & Assets', route: '/configuration/resources', icon: 'resources', infoHelp: 'Track physical assets, equipment, and inventory allocations.' },
    ],
  },
  {
    id: 'integrations_group',
    key: 'integrations',
    name: 'Integrations & API',
    route: '',
    icon: 'api',
    order: 6,
    module: 'integrations',
    infoHelp: 'API credentials and external service integrations.',
    children: [
      { id: 'int_api', key: 'integrations.api', name: 'API Tokens', route: '/integrations/api', icon: 'api', infoHelp: 'API tokens for programmatic access and developer integrations.' },
      { id: 'int_whatsapp', key: 'integrations.whatsapp', name: 'WhatsApp API', route: '/integrations/whatsapp', icon: 'whatsapp', infoHelp: 'WhatsApp Cloud API integration for automated alerts and messages.' },
    ],
  },
  {
    id: 'uinavigation_group',
    key: 'uiNavigation',
    name: 'UI & Navigation',
    route: '',
    icon: 'sidebar',
    order: 7,
    module: 'uiNavigation',
    infoHelp: 'Visual builder for dashboard analytics, menus, and custom screens.',
    children: [
      { id: 'ui_analytics', key: 'uiNavigation.analyticsConfig', name: 'Analytics Layout Builder', route: '/ui-navigation/analytics-config', icon: 'settings', infoHelp: 'Configure visual dashboard layout, charts, and metric widgets.' },
      { id: 'ui_menus', key: 'uiNavigation.menus', name: 'Sidebar Menus', route: '/ui-navigation/menus', icon: 'sidebar', infoHelp: 'Define and organize hierarchical navigation menu items.' },
      { id: 'ui_screens', key: 'uiNavigation.screens', name: 'Screens', route: '/ui-navigation/screens', icon: 'headers', infoHelp: 'Manage dynamic application screens and form layouts.' },
      { id: 'ui_fields', key: 'uiNavigation.screenFields', name: 'Screen Fields', route: '/ui-navigation/screen-fields', icon: 'headers', infoHelp: 'Configure custom input fields and form schema definitions.' },
    ],
  },
  {
    id: 'accesscontrol_group',
    key: 'accessControl',
    name: 'Access Control',
    route: '',
    icon: 'shield',
    order: 8,
    module: 'accessControl',
    infoHelp: 'Role-based access control, sidebar permissions, and field rules.',
    children: [
      { id: 'ac_roles', key: 'accessControl.roles', name: 'Roles & Permissions', route: '/access-control/roles', icon: 'shield', infoHelp: 'Configure custom role privileges and access levels.' },
      { id: 'ac_matrix', key: 'accessControl.permissions', name: 'Permission Matrix (Sidebar)', route: '/access-control/permissions', icon: 'shield', infoHelp: 'Matrix of sidebar menu visibility by role and industry.' },
      { id: 'ac_fields', key: 'accessControl.screenPermissions', name: 'Permission Fields', route: '/access-control/screen-permissions', icon: 'shield', infoHelp: 'Control read/write access permissions per screen field.' },
    ],
  },
  {
    id: 'invoices_group',
    key: 'invoices',
    name: 'Invoices',
    route: '',
    icon: 'billing',
    order: 9,
    module: 'invoices',
    infoHelp: 'Payment invoice logs and transaction charge histories.',
    children: [
      { id: 'inv_payments', key: 'invoices.paymentLogs', name: 'Payment Invoice Logs', route: '/invoices/payment-invoices', icon: 'billing', infoHelp: 'Payment receipts, subscription invoices, and tax logs.' },
      { id: 'inv_history', key: 'invoices.receiptsHistory', name: 'Receipts & Historical Charges', route: '/invoices/receipts-history', icon: 'subscription', infoHelp: 'Historical transaction records and billing charge history.' },
    ],
  },
  {
    id: 'account_group',
    key: 'account',
    name: 'Account & Settings',
    route: '',
    icon: 'settings',
    order: 10,
    module: 'account',
    infoHelp: 'License costs, discount coupons, and account password management.',
    children: [
      { id: 'acc_licenses', key: 'account.licenses', name: 'License Cost', route: '/account/licenses', icon: 'billing', infoHelp: 'Manage per-seat pricing and subscription tier costs.' },
      { id: 'acc_coupons', key: 'account.coupons', name: 'Coupons', route: '/account/coupons', icon: 'coupon', infoHelp: 'Create and configure promotional discount codes.' },
      { id: 'acc_password', key: 'account.password', name: 'Update Password', route: '/account/update-password', icon: 'password', infoHelp: 'Update personal account credentials and security password.' },
    ],
  },
  {
    id: 'support_group',
    key: 'support',
    name: 'Support',
    route: '',
    icon: 'support',
    order: 11,
    module: 'support',
    infoHelp: 'Knowledge base, bulletins, and FAQs.',
    children: [
      { id: 'sup_news', key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', infoHelp: 'Company bulletins, announcements, and operational news feeds.' },
      { id: 'sup_faq', key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', infoHelp: 'Frequently asked questions, SOPs, and onboarding guides.' },
    ],
  },
]

export function mapApiMenusToNavItems(raw: RawSidebarMenuItem[], roleKey?: string, industryCode?: string): SidebarNavItem[] {
  const isSuperAdmin = roleKey === 'superAdmin'
  if (isSuperAdmin) return DEFAULT_SUPER_ADMIN_NAV_ITEMS
  if (!raw?.length) return DEFAULT_MASTER_SIDEBAR_NAV_ITEMS
  const translations = translationService.getIndustryTranslations(industryCode)

  const isRealEstate = (industryCode || '').toLowerCase().includes('real_estate') || (industryCode || '').toLowerCase().includes('prop')

  const filteredRaw = raw.filter((m) => {
    if (isSuperAdmin) return true
    const nameLower = (m.name || '').toLowerCase()
    const keyLower = (m.key || '').toLowerCase()
    if (!isRealEstate && keyLower.startsWith('tool')) return false
    return (
      !nameLower.includes('ui & navigation') &&
      !nameLower.includes('access control') &&
      !nameLower.includes('screens') &&
      !nameLower.includes('screen fields') &&
      !nameLower.includes('permission matrix') &&
      !nameLower.includes('permission fields') &&
      !nameLower.includes('analytics layout builder') &&
      !nameLower.includes('industry') &&
      !nameLower.includes('domain setting') &&
      !nameLower.includes('sorted list') &&
      !keyLower.includes('uinavigation') &&
      !keyLower.includes('accesscontrol') &&
      !keyLower.includes('screen') &&
      !keyLower.includes('sorted') &&
      keyLower !== 'configuration.industries' &&
      keyLower !== 'configuration.domainsettings' &&
      keyLower !== 'integrations.webhook' &&
      keyLower !== 'integrations.api' &&
      keyLower !== 'organization' &&
      keyLower !== 'account.licenses' &&
      keyLower !== 'account.coupons'
    )
  })

  if (!filteredRaw.length) return DEFAULT_MASTER_SIDEBAR_NAV_ITEMS

  const itemMap = new Map<string, RawSidebarMenuItem>()
  filteredRaw.forEach((item) => {
    itemMap.set(item._id, item)
  })

  const roots: RawSidebarMenuItem[] = []
  const childrenMap = new Map<string, RawSidebarMenuItem[]>()

  filteredRaw.forEach((item) => {
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

  roots.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

  function translateTitle(key?: string, defaultName?: string): string {
    const k = String(key || '').toLowerCase().trim()
    const name = String(defaultName || '').trim()

    if (k === 'leads.contact' || name === 'Contacts List' || name === 'Contact') return translations.contacts
    if (k === 'leads.tasks' || name === 'Tasks List' || name === 'Task') return translations.tasks
    if (k === 'leads.booking' || name === 'Bookings List' || name === 'Booking') return translations.bookings
    if (k === 'configuration.projects' || name === 'Project' || name === 'Projects') return translations.projects
    if (k === 'configuration.resources' || name === 'Resource' || name === 'Resources') return translations.resources
    if (k === 'configuration' || name === 'Configuration') return translations.configuration || 'Operations & Catalog'
    if (k === 'leads' || name === 'Lead') return translations.leads || 'Lead Pipeline'
    if (k === 'users.list' || name === 'User List') return 'Team Members'
    if (k === 'users.roles' || name === 'Roles & Permissions') return 'Roles & Permissions'
    if (k === 'users' || name === 'User') return 'Team & Access'
    if (k === 'leads.call' || name === 'Call Logs List') return 'Call Interaction Logs'
    if (k === 'leadDistribution.list' || name === 'Lead Distribution List') return 'Lead Routing Rules'
    if (k === 'leadDistribution.reassignList' || name === 'Reassign List') return 'Reassign Leads'
    if (k === 'leadDistribution' || name === 'Distribution') return 'Lead Distribution'
    if (k === 'configuration.days' || name === 'Working Days Configuration') return 'Business Hours & Shifts'
    if (k === 'configuration.holiday' || name === 'Holidays Configuration') return 'Holidays Calendar'
    if (k === 'integrations.apidata' || name === 'API Data') return 'API & Webhook Integrations'
    if (k === 'integrations.whatsapp' || name === 'WhatsApp API') return 'WhatsApp Cloud API'
    if (k === 'integrations' || name === 'Integrations') return 'Integrations & API'
    if (k === 'analytics' || name === 'Analytics') return 'Analytics Overview'
    if (k === 'account.subscription' || name === 'Subscription Details') return 'Subscription & Billing'

    return defaultName || key || 'Module'
  }

  const result: SidebarNavItem[] = roots.map((root) => {
    const children = (childrenMap.get(root._id) || []).sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

    const mappedName = translateTitle(root.key, root.name)
    const rootInfo = getModuleInfoHelp(root.key, mappedName)

    return {
      id: root._id,
      key: root.key,
      name: mappedName,
      route: root.route,
      icon: toIconKey(root.icon),
      order: root.order,
      module: root.module,
      infoHelp: rootInfo,
      description: rootInfo,
      children:
        children.length > 0
          ? children.map((c) => {
              const childName = translateTitle(c.key, c.name)
              const childInfo = getModuleInfoHelp(c.key, childName)

              return {
                id: c._id,
                key: c.key,
                name: childName,
                route: c.route,
                icon: toIconKey(c.icon),
                order: c.order,
                module: c.module,
                infoHelp: childInfo,
                description: childInfo,
              } as SidebarChildItem
            })
          : undefined,
    }
  })

  return result.length > 0 ? result : DEFAULT_MASTER_SIDEBAR_NAV_ITEMS
}
