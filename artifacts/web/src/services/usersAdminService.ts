import { api } from './api'

export interface AdminUser {
  _id: string
  id?: string
  name?: string
  email: string
  role: string
  industryId?: string
  isActive: boolean
  reporting_to?: string
  fields: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface CreateUserInput {
  email: string
  password: string
  name?: string
  role: string
  industryId?: string
  isActive?: boolean
  reporting_to?: string
  fields?: Record<string, unknown>
}

export interface UpdateUserInput {
  name?: string
  role?: string
  industryId?: string
  isActive?: boolean
  password?: string
  reporting_to?: string
  fields?: Record<string, unknown>
}

export interface ManagerCandidate {
  _id: string
  id: string
  name: string
  email: string
  role: string
}

/**
 * Fetches the list of users that may be selected as the manager for a user
 * with the given role. Drives the "Reports To" dropdown in the user form.
 * Tenant-scoped server-side: non-superAdmin callers always get their own org.
 */
export async function listManagerCandidates(
  profile: string,
  industryId?: string,
): Promise<ManagerCandidate[]> {
  const params = new URLSearchParams({ profile })
  if (industryId) params.set('industryId', industryId)
  const res = await api.get(`users/managers?${params.toString()}`)
  return (res.data?.items ?? []) as ManagerCandidate[]
}

async function safeList(path: string): Promise<AdminUser[]> {
  const res = await api.get(path)
  // Tolerant of both the new `{items:[]}` envelope and the legacy bare array.
  if (Array.isArray(res.data)) return res.data as AdminUser[]
  return (res.data?.items ?? []) as AdminUser[]
}

export async function listUsers(industryId?: string): Promise<AdminUser[]> {
  const qs = industryId ? `?industryId=${encodeURIComponent(industryId)}` : ''
  return safeList(`users${qs}`)
}

export interface PagedUsers {
  items: AdminUser[]
  total: number
}

export interface ListUsersPagedArgs {
  industryId?: string
  page: number
  pageSize: number
  q?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

/**
 * Server-paginated user list. Mirrors `/api/users?page=&pageSize=&q=&sortField=&sortDir=`
 * and feeds the AppDataGrid in `paginationMode="server"`.
 */
export async function listUsersPaged(args: ListUsersPagedArgs): Promise<PagedUsers> {
  const params = new URLSearchParams()
  if (args.industryId) params.set('industryId', args.industryId)
  params.set('page', String(args.page))
  params.set('pageSize', String(args.pageSize))
  if (args.q) params.set('q', args.q)
  if (args.sortField) params.set('sortField', args.sortField)
  if (args.sortDir) params.set('sortDir', args.sortDir)
  const res = await api.get(`users?${params.toString()}`)
  const data = res.data ?? {}
  return {
    items: (data.items ?? []) as AdminUser[],
    total: typeof data.total === 'number' ? data.total : (data.items?.length ?? 0),
  }
}

export async function createUser(data: CreateUserInput): Promise<AdminUser> {
  const res = await api.post('users', data)
  return res.data as AdminUser
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<AdminUser> {
  const res = await api.put(`users/${id}`, data)
  return res.data as AdminUser
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`users/${id}`)
}
