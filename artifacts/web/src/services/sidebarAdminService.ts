import { api } from './api'

// ── Industry ─────────────────────────────────────────────────────────────────
export interface Industry {
  _id: string
  code: string
  name: string
  description?: string
  isActive: boolean
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface IndustryInput {
  code: string
  name: string
  description?: string
  isActive?: boolean
  status?: string
}

// Helper for endpoints that wrap responses as `{ items: [...] }`.
async function safeList<T>(path: string): Promise<T[]> {
  const res = await api.get(path)
  return (res.data?.items ?? []) as T[]
}

export async function getIndustries(activeOnly = false): Promise<Industry[]> {
  const path = activeOnly ? 'industries?active=true' : 'industries'
  return safeList<Industry>(path)
}

export async function createIndustryRecord(data: IndustryInput): Promise<Industry> {
  const res = await api.post('industries', data)
  return res.data as Industry
}

export async function updateIndustryRecord(id: string, data: Partial<IndustryInput>): Promise<Industry> {
  const res = await api.put(`industries/${id}`, data)
  return res.data as Industry
}

export async function deleteIndustryRecord(id: string): Promise<void> {
  await api.delete(`industries/${id}`)
}

// ── Role ─────────────────────────────────────────────────────────────────────
export interface AdminRole {
  _id: string
  industryId: string
  key: string
  name: string
  description?: string
  isActive: boolean
}

export interface RoleInput {
  industryId: string
  key: string
  name: string
  description?: string
  isActive?: boolean
}

export async function getRoles(industryId?: string): Promise<AdminRole[]> {
  const path = industryId ? `roles?industryId=${industryId}` : 'roles'
  return safeList<AdminRole>(path)
}

export async function createRoleRecord(data: RoleInput): Promise<AdminRole> {
  const res = await api.post('roles', data)
  return res.data as AdminRole
}

export async function updateRoleRecord(id: string, data: Partial<RoleInput>): Promise<AdminRole> {
  const res = await api.put(`roles/${id}`, data)
  return res.data as AdminRole
}

export async function deleteRoleRecord(id: string): Promise<void> {
  await api.delete(`roles/${id}`)
}

// ── Sidebar Menu (master catalog) ────────────────────────────────────────────
export interface SidebarMenuRecord {
  _id: string
  key: string
  name: string
  icon?: string
  route?: string
  parentId: string | null
  parent_id: string | null
  order: number
  module?: string
  isActive: boolean
}

export interface SidebarMenuInput {
  key: string
  name: string
  icon?: string
  route?: string
  parentId?: string | null
  parent_id?: string | null
  order?: number
  module?: string
  isActive?: boolean
}

export async function getMenus(): Promise<SidebarMenuRecord[]> {
  return safeList<SidebarMenuRecord>('sidebar-menus')
}

export async function createMenuRecord(data: SidebarMenuInput): Promise<SidebarMenuRecord> {
  const payload = {
    ...data,
    parentId: data.parentId || data.parent_id,
    parent_id: data.parentId || data.parent_id,
  }
  const res = await api.post('sidebar-menus', payload)
  return res.data as SidebarMenuRecord
}

export async function updateMenuRecord(id: string, data: Partial<SidebarMenuInput>): Promise<SidebarMenuRecord> {
  const payload = {
    ...data,
    parentId: data.parentId || data.parent_id,
    parent_id: data.parentId || data.parent_id,
  }
  const res = await api.put(`sidebar-menus/${id}`, payload)
  return res.data as SidebarMenuRecord
}

export async function deleteMenuRecord(id: string): Promise<void> {
  await api.delete(`sidebar-menus/${id}`)
}

// ── Sidebar Permission ───────────────────────────────────────────────────────
export interface SidebarPermissionRecord {
  _id: string
  roleId: string
  industryId: string
  menuId: string
  menu_id: string
  isVisible: boolean
  is_visible: boolean
  orderOverride: number | null
  order_override: number | null
}

export async function getPermissions(params: {
  roleId?: string
  industryId?: string
  menuId?: string
  menu_id?: string
  visibleOnly?: boolean
} = {}): Promise<SidebarPermissionRecord[]> {
  const search = new URLSearchParams()
  const mId = params.menuId || params.menu_id
  if (params.roleId) search.set('roleId', params.roleId)
  if (params.industryId) search.set('industryId', params.industryId)
  if (mId) search.set('menuId', mId)
  if (params.visibleOnly) search.set('visible', 'true')
  const qs = search.toString()
  return safeList<SidebarPermissionRecord>(qs ? `sidebar-permissions?${qs}` : 'sidebar-permissions')
}

export async function bulkSetPermissions(input: {
  roleId: string
  industryId: string
  menuIds?: string[]
  menu_ids?: string[]
}): Promise<SidebarPermissionRecord[]> {
  const payload = {
    roleId: input.roleId,
    industryId: input.industryId,
    menuIds: input.menuIds || input.menu_ids,
  }
  const res = await api.post('sidebar-permissions/bulk', payload)
  return (res.data?.items ?? []) as SidebarPermissionRecord[]
}
