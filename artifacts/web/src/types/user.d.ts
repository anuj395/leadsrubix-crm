export type UserRole = 'admin' | 'leadManager' | 'sales' | 'superAdmin' | 'teamLead'

export interface AuthenticatedUser {
  email: string
  id: string
  firstName?: string
  lastName?: string
  name: string
  role: UserRole
  industryId?: string
  industryId?: string
  needs_password_change?: boolean
  needsPasswordChange?: boolean
}
