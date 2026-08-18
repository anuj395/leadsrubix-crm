import { apiClient } from '../api/apiClient';

export interface PermissionDefinition {
  key: string;
  category: 'Leads' | 'Deals & CPQ' | 'Telephony' | 'Analytics' | 'Settings';
  label: string;
  description: string;
}

export interface UserRoleDefinition {
  roleKey: string;
  roleName: string;
  isSystemPreset: boolean;
  grantedPermissions: string[];
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { key: 'leads.view_all', category: 'Leads', label: 'View All Workspace Leads', description: 'Allows viewing leads across all reps in the organization.' },
  { key: 'leads.view_own', category: 'Leads', label: 'View Assigned Leads Only', description: 'Restricts lead visibility to assigned buyer prospects.' },
  { key: 'leads.create', category: 'Leads', label: 'Create New Lead', description: 'Permission to add new prospective buyer leads.' },
  { key: 'leads.edit', category: 'Leads', label: 'Edit Lead Attributes', description: 'Permission to update lead fields and budget criteria.' },
  { key: 'leads.delete', category: 'Leads', label: 'Delete Lead Records', description: 'High privilege permission to purge lead records.' },
  { key: 'leads.rollback_stage', category: 'Leads', label: 'Rollback Stage Lifecycle', description: 'Permission to perform backward stage transitions with reason logging.' },
  { key: 'quotes.generate_cpq', category: 'Deals & CPQ', label: 'Generate CPQ Quotations', description: 'Permission to compute CPQ quotes and share PDF offer letters.' },
  { key: 'quotes.approve_discount', category: 'Deals & CPQ', label: 'Approve Deal Discounts', description: 'Deal desk authorization to sign off on discounts > 2.5%.' },
  { key: 'call_logs.view_all', category: 'Telephony', label: 'View Team Call Activity', description: 'Access call logs and recordings across all sales advisors.' },
  { key: 'analytics.view_revenue', category: 'Analytics', label: 'View Revenue & BI Funnel', description: 'Access executive financial analytics and velocity metrics.' },
  { key: 'settings.manage_workspace', category: 'Settings', label: 'Manage Workspace & Custom Fields', description: 'Full Client Admin privileges to manage forms and team roles.' },
];

export const DEFAULT_PRESET_ROLES: UserRoleDefinition[] = [
  {
    roleKey: 'admin',
    roleName: 'Workspace Administrator',
    isSystemPreset: true,
    grantedPermissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    roleKey: 'sales_manager',
    roleName: 'Sales Manager / Team Lead',
    isSystemPreset: true,
    grantedPermissions: [
      'leads.view_all',
      'leads.create',
      'leads.edit',
      'leads.rollback_stage',
      'quotes.generate_cpq',
      'quotes.approve_discount',
      'call_logs.view_all',
      'analytics.view_revenue',
    ],
  },
  {
    roleKey: 'sales_agent',
    roleName: 'Sales Advisor / Agent',
    isSystemPreset: true,
    grantedPermissions: ['leads.view_own', 'leads.create', 'leads.edit', 'quotes.generate_cpq'],
  },
];

export const permissionService = {
  async getRoles(): Promise<UserRoleDefinition[]> {
    try {
      const res = await apiClient.get('/roles');
      const items = res.data?.items || res.data || [];
      return items.length > 0 ? items : DEFAULT_PRESET_ROLES;
    } catch (err) {
      console.warn('[permissionService] Server roles endpoint unavailable, returning presets:', err);
      return DEFAULT_PRESET_ROLES;
    }
  },

  async hasPermission(userRoleKey: string, permissionKey: string): Promise<boolean> {
    const roles = await this.getRoles();
    const role = roles.find((r) => r.roleKey === userRoleKey);
    if (!role) return false;
    return role.grantedPermissions.includes(permissionKey);
  },
};
