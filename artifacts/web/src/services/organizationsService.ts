import { api } from './api'

export interface Organization {
  _id: string
  organizationId?: string
  industryId?: string | null
  isActive: boolean
  createdBy?: string | null
  createdAt?: string
  updatedAt?: string
  // Dynamic fields are merged at the document root (strict:false on the model),
  // so callers index by `field_key` directly.
  [key: string]: unknown
}

export interface PagedOrganizations {
  items: Organization[]
  total: number
}

export interface ListOrgsArgs {
  industryId?: string
  page: number
  pageSize: number
  q?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export async function listOrganizationsPaged(args: ListOrgsArgs): Promise<PagedOrganizations> {
  const params = new URLSearchParams()
  if (args.industryId) params.set('industryId', args.industryId)
  params.set('page', String(args.page))
  params.set('pageSize', String(args.pageSize))
  if (args.q) params.set('q', args.q)
  if (args.sortField) params.set('sortField', args.sortField)
  if (args.sortDir) params.set('sortDir', args.sortDir)
  const res = await api.get(`organizations?${params.toString()}`)
  const data = res.data ?? {}
  return {
    items: (data.items ?? []) as Organization[],
    total: typeof data.total === 'number' ? data.total : (data.items?.length ?? 0),
  }
}

export interface CreateOrgInput {
  industryId?: string
  isActive?: boolean
  fields?: Record<string, unknown>
}

export interface UpdateOrgInput {
  industryId?: string
  isActive?: boolean
  fields?: Record<string, unknown>
}

export async function createOrganization(data: CreateOrgInput): Promise<Organization> {
  const res = await api.post('organizations', data)
  return res.data as Organization
}

export async function updateOrganization(id: string, data: UpdateOrgInput): Promise<Organization> {
  const res = await api.put(`organizations/${id}`, data)
  return res.data as Organization
}

export async function deleteOrganization(id: string): Promise<void> {
  await api.delete(`organizations/${id}`)
}
