import type { UserRole } from '@/types/user'

export type MenuIconKey =
  | 'account'
  | 'analytics'
  | 'api'
  | 'billing'
  | 'blog'
  | 'booking'
  | 'call'
  | 'configuration'
  | 'contact'
  | 'coupon'
  | 'dashboard'
  | 'data'
  | 'faq'
  | 'headers'
  | 'leads'
  | 'news'
  | 'organization'
  | 'password'
  | 'projects'
  | 'resources'
  | 'settings'
  | 'shield'
  | 'sort'
  | 'support'
  | 'tasks'
  | 'users'
  | 'whatsapp'
  | 'sidebar'
  | 'holiday'
  | 'days'
  | 'subscription'
  | 'integrations'
  | 'apiData'
  | 'areaConverter'
  | 'calculator'
  | 'emiCalculator'
  | 'leadDistribution'
  | 'reassignList'
  | 'list'

export interface MenuChildItem {
  badge?: string
  icon?: MenuIconKey
  label: string
  path?: string
}

export interface MenuItem {
  children?: MenuChildItem[]
  defaultExpanded?: boolean
  highlighted?: boolean
  icon: MenuIconKey
  label: string
  path?: string
}

export interface MenuSection {
  items: MenuItem[]
  title?: string
}

interface SuperAdminChild {
  key: string
  name: string
  route?: string
  icon?: MenuIconKey
  module?: string
}

export interface SuperAdminMenuItem {
  key: string
  name: string
  route?: string
  icon?: MenuIconKey
  module?: string
  highlighted?: boolean
  defaultExpanded?: boolean
  children?: SuperAdminChild[]
}

export const superAdminMenuConfig: SuperAdminMenuItem[] = [
  { key: "analytics", name: "Analytics", route: "/analytics", icon: "analytics", module: "analytics" },
  { key: "organization", name: "Organization", route: "/organization/list", icon: "organization", module: "organization" },
  { key: "users", name: "Users", route: "/users", icon: "users", module: "users" },

  { key: "leads.contacts", name: "Contacts List", route: "/leads/contacts", icon: "contact", module: "leads" },
  { key: "leads.tasks", name: "Tasks List", route: "/leads/tasks", icon: "tasks", module: "leads" },
  { key: "leads.callLogs", name: "Call Logs List", route: "/leads/call-logs", icon: "call", module: "leads" },
  { key: "leads.sorted", name: "Sorted List", route: "/leads/sorted", icon: "sort", module: "leads" },

  { key: "configuration.industries", name: "Industries", route: "/configuration/industries", icon: "organization", module: "configuration" },
  { key: "configuration.projects", name: "Projects", route: "/configuration/projects", icon: "projects", module: "configuration" },
  { key: "configuration.resources", name: "Resources", route: "/configuration/resources", icon: "resources", module: "configuration" },

  { key: "integrations.api", name: "API Tokens", route: "/integrations/api", icon: "api", module: "integrations" },
  { key: "integrations.whatsapp", name: "WhatsApp API", route: "/configuration/whatsapp", icon: "whatsapp", module: "integrations" },

  { key: "uiNavigation.menus", name: "Sidebar Menus", route: "/configuration/menus", icon: "sidebar", module: "uiNavigation" },
  { key: "uiNavigation.screens", name: "Screens", route: "/configuration/screens", icon: "headers", module: "uiNavigation" },
  { key: "uiNavigation.screenFields", name: "Screen Fields", route: "/configuration/screen-fields", icon: "headers", module: "uiNavigation" },
  { key: "uiNavigation.analyticsConfig", name: "Layout Builder", route: "/configuration/analytics-config", icon: "settings", module: "uiNavigation" },

  { key: "accessControl.permissions", name: "Permissions Matrix", route: "/configuration/permissions", icon: "shield", module: "accessControl" },
  { key: "accessControl.screenPermissions", name: "Permission Fields", route: "/configuration/screen-permissions", icon: "shield", module: "accessControl" },
  { key: "accessControl.roles", name: "Roles & Permissions", route: "/users/roles", icon: "shield", module: "accessControl" },

  { key: "account.licenses", name: "Licenses Cost", route: "/account/licenses", icon: "billing", module: "account" },
  { key: "account.coupons", name: "Coupon", route: "/account/coupons", icon: "coupon", module: "account" },
  { key: "account.password", name: "Update Password", route: "/account/update-password", icon: "password", module: "account" },

  { key: "support.news", name: "News List", route: "/support/news", icon: "news", module: "support" },
  { key: "support.faq", name: "FAQ List", route: "/support/faq", icon: "faq", module: "support" }
]

export const adminMenuConfig: SuperAdminMenuItem[] = [
  {
    key: "analytics",
    name: "Analytics",
    route: "/analytics",
    icon: "analytics",
    module: "Analytics"
  },
  {
    key: "users.list",
    name: "Users List",
    route: "/users",
    icon: "users",
    module: "Users"
  },
  {
    key: "users.roles",
    name: "Roles & Permissions",
    route: "/users/roles",
    icon: "shield",
    module: "Users"
  },
  {
    key: "leads.contacts",
    name: "Contacts List",
    route: "/leads/contacts",
    icon: "contact",
    module: "Leads"
  },
  {
    key: "leads.tasks",
    name: "Tasks List",
    route: "/leads/tasks",
    icon: "tasks",
    module: "Leads"
  },
  {
    key: "leads.callLogs",
    name: "Call Logs List",
    route: "/leads/call-logs",
    icon: "call",
    module: "Leads"
  },
  /* Hidden: Bookings functionality
  {
    key: "leads.bookings",
    name: "Bookings List",
    route: "/leads/bookings",
    icon: "booking",
    module: "Leads"
  },
  */
  {
    key: "configuration.projects",
    name: "Projects List",
    route: "/configuration/projects",
    icon: "projects",
    module: "Configuration"
  },
  {
    key: "configuration.whatsapp",
    name: "Whatsapp API",
    route: "/configuration/whatsapp",
    icon: "whatsapp",
    module: "Configuration"
  },
  {
    key: "configuration.resources",
    name: "Resources",
    route: "/configuration/resources",
    icon: "resources",
    module: "Configuration"
  },
  {
    key: "configuration.holidayConfig",
    name: "Holiday Config",
    route: "/configuration/holidayConfig",
    icon: "holiday",
    module: "Configuration"
  },
  {
    key: "configuration.daysConfig",
    name: "Days Config",
    route: "/configuration/daysConfig",
    icon: "days",
    module: "Configuration"
  },
  {
    key: "leadDistribution.list",
    name: "Lead Distribution List",
    route: "/leadDistribution/list",
    icon: "list",
    module: "leadDistribution"
  },
  {
    key: "leadDistribution.reassignList",
    name: "Reassign List",
    route: "/reassign/list",
    icon: "reassignList",
    module: "leadDistribution"
  },
  {
    key: "integrations.integrations",
    name: "Integrations",
    route: "/integrations",
    icon: "integrations",
    module: "Integrations"
  },
  {
    key: "integrations.api",
    name: "API List",
    route: "/integrations/api",
    icon: "api",
    module: "Integrations"
  },
  {
    key: "integrations.apiData",
    name: "API Data",
    route: "/integrations/api-data",
    icon: "apiData",
    module: "Integrations"
  },
  {
    key: "support.news",
    name: "News List",
    route: "/support/news",
    icon: "news",
    module: "Support"
  },
  {
    key: "support.faq",
    name: "FAQ List",
    route: "/support/faq",
    icon: "faq",
    module: "Support"
  },
  {
    key: "account.subscriptionDetails",
    name: "Subscription Details",
    route: "/account/subscription-details",
    icon: "subscription",
    module: "Account"
  },
  {
    key: "account.password",
    name: "Update Password",
    route: "/account/update-password",
    icon: "password",
    module: "Account"
  }
]

export const leadManagerMenuConfig: SuperAdminMenuItem[] = [
  {
    key: "analytics",
    name: "Analytics",
    route: "/analytics",
    icon: "analytics",
    module: "Analytics"
  },
  {
    key: "leads.contacts",
    name: "Contacts List",
    route: "/leads/contacts",
    icon: "contact",
    module: "Leads"
  },
  {
    key: "leads.tasks",
    name: "Tasks List",
    route: "/leads/tasks",
    icon: "tasks",
    module: "Leads"
  },
  {
    key: "leads.callLogs",
    name: "Call Logs List",
    route: "/leads/call-logs",
    icon: "call",
    module: "Leads"
  },
  {
    key: "support.news",
    name: "News List",
    route: "/support/news",
    icon: "news",
    module: "Support"
  },
  {
    key: "support.faq",
    name: "FAQ List",
    route: "/support/faq",
    icon: "faq",
    module: "Support"
  },
  {
    key: "tool.areaConverter",
    name: "Area Converter",
    route: "/tool/areaConverter",
    icon: "areaConverter",
    module: "Tool"
  },
  {
    key: "tool.calculator",
    name: "Calculator",
    route: "/tool/calculator",
    icon: "calculator",
    module: "Tool"
  },
  {
    key: "tool.emiCalculator",
    name: "EMI Calculator",
    route: "/tool/emi-calculator",
    icon: "emiCalculator",
    module: "Tool"
  },
]

export const teamLeadMenuConfig: SuperAdminMenuItem[] = [
  {
    key: "analytics",
    name: "Analytics",
    route: "/analytics",
    icon: "analytics",
    module: "Analytics"
  },
  {
    key: "leads.contacts",
    name: "Contacts List",
    route: "/leads/contacts",
    icon: "contact",
    module: "Leads"
  },
  {
    key: "leads.tasks",
    name: "Tasks List",
    route: "/leads/tasks",
    icon: "tasks",
    module: "Leads"
  },
  {
    key: "leads.callLogs",
    name: "Call Logs List",
    route: "/leads/call-logs",
    icon: "call",
    module: "Leads"
  },
  {
    key: "support.news",
    name: "News List",
    route: "/support/news",
    icon: "news",
    module: "Support"
  },
  {
    key: "support.faq",
    name: "FAQ List",
    route: "/support/faq",
    icon: "faq",
    module: "Support"
  },
  {
    key: "tool.areaConverter",
    name: "Area Converter",
    route: "/tool/areaConverter",
    icon: "areaConverter",
    module: "Tool"
  },
  {
    key: "tool.calculator",
    name: "Calculator",
    route: "/tool/calculator",
    icon: "calculator",
    module: "Tool"
  },
  {
    key: "tool.emiCalculator",
    name: "EMI Calculator",
    route: "/tool/emi-calculator",
    icon: "emiCalculator",
    module: "Tool"
  },
]

export const salesMenuConfig: SuperAdminMenuItem[] = [
  {
    key: "analytics",
    name: "Analytics",
    route: "/analytics",
    icon: "analytics",
    module: "Analytics"
  },
  {
    key: "leads.contacts",
    name: "Contacts List",
    route: "/leads/contacts",
    icon: "contact",
    module: "Leads"
  },
  {
    key: "leads.tasks",
    name: "Tasks List",
    route: "/leads/tasks",
    icon: "tasks",
    module: "Leads"
  },
  {
    key: "leads.callLogs",
    name: "Call Logs List",
    route: "/leads/call-logs",
    icon: "call",
    module: "Leads"
  },
  {
    key: "support.news",
    name: "News List",
    route: "/support/news",
    icon: "news",
    module: "Support"
  },
  {
    key: "support.faq",
    name: "FAQ List",
    route: "/support/faq",
    icon: "faq",
    module: "Support"
  },
  {
    key: "tool.areaConverter",
    name: "Area Converter",
    route: "/tool/areaConverter",
    icon: "areaConverter",
    module: "Tool"
  },
  {
    key: "tool.calculator",
    name: "Calculator",
    route: "/tool/calculator",
    icon: "calculator",
    module: "Tool"
  },
  {
    key: "tool.emiCalculator",
    name: "EMI Calculator",
    route: "/tool/emi-calculator",
    icon: "emiCalculator",
    module: "Tool"
  },
]
export function getMenuConfigForRole(role?: UserRole): MenuSection[] | SuperAdminMenuItem[] {
  switch (role) {
    case 'admin':
      return adminMenuConfig
    case 'leadManager':
      return leadManagerMenuConfig
    case 'teamLead':
      return teamLeadMenuConfig
    case 'sales':
      return salesMenuConfig
    default:
      return adminMenuConfig
  }
}