export type UserRole = 'admin' | 'leadManager' | 'sales' | 'superAdmin' | 'teamLead'

export interface AuthenticatedUser {
  email: string
  id: string
  firstName?: string
  lastName?: string
  name: string
  role: UserRole
  industryId?: string
  organizationId?: string
  organizationName?: string
  organization_name?: string
  needsPasswordChange?: boolean
}
