import { api } from './api'

export interface RoleActionPermission {
  _id: string
  roleId: string
  industryId: string
  screen_id: string
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface MyActionPerms {
  screen_key: string
  role?: string
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
}

export async function listRoleActionPermissions(params: {
  roleId?: string
  industryId?: string
  screen_id?: string
} = {}): Promise<RoleActionPermission[]> {
  const search = new URLSearchParams()
  if (params.roleId)     search.set('roleId', params.roleId)
  if (params.industryId) search.set('industryId', params.industryId)
  if (params.screen_id)   search.set('screen_id', params.screen_id)
  const qs = search.toString()
  const res = await api.get(qs ? `role-action-permissions?${qs}` : 'role-action-permissions')
  return (res.data?.items ?? []) as RoleActionPermission[]
}

export async function upsertRoleActionPermission(input: {
  roleId: string
  industryId: string
  screen_id: string
  can_view?: boolean
  can_add?: boolean
  can_edit?: boolean
  can_delete?: boolean
}): Promise<RoleActionPermission> {
  const res = await api.post('role-action-permissions', input)
  return res.data as RoleActionPermission
}

export async function getMyActionPerms(screen_key: string): Promise<MyActionPerms> {
  const res = await api.get(
    `role-action-permissions/me?screen_key=${encodeURIComponent(screen_key)}`,
  )
  return res.data as MyActionPerms
}
