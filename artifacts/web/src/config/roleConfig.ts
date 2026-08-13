import type { UserRole } from '@/types/user'

export const roleConfig: Record<UserRole, { description: string; label: string }> = {
  admin: {
    label: 'Admin',
    description: 'Manages workspace settings and day-to-day operations',
  },
  leadManager: {
    label: 'Lead Manager',
    description: 'Oversees lead intake, distribution, and pipeline health',
  },
  sales: {
    label: 'Sales',
    description: 'Works assigned leads and updates customer progress',
  },
  superAdmin: {
    label: 'Super Admin',
    description: 'Owns platform-wide administration and global settings',
  },
  teamLead: {
    label: 'Team Lead',
    description: 'Monitors team execution and daily performance',
  },
}