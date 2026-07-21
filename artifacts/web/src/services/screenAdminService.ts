import { api } from './api'

// ── Types ────────────────────────────────────────────────────────────────────
export interface Screen {
  _id: string
  key: string
  name: string
  description?: string
  order?: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ScreenInput {
  key: string
  name: string
  description?: string
  order?: number
  isActive?: boolean
}

export type ScreenFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'date'
  | 'email'
  | 'textarea'
  | 'checkbox'
  | 'badge'
  | 'avatar'
  | 'phone'
  | 'image'

export const SCREEN_FIELD_TYPES: ScreenFieldType[] = [
  'text', 'number', 'select', 'date', 'email', 'textarea', 'checkbox', 'badge', 'avatar', 'phone', 'image',
]

export type DropdownSource = 'none' | 'static' | 'api'
export const DROPDOWN_SOURCES: DropdownSource[] = ['none', 'static', 'api']

export interface ScreenField {
  _id: string
  screenId: string
  screen_id: string
  fieldKey: string
  field_key: string
  label: string
  type: ScreenFieldType
  options: string[]
  dropdownSource: DropdownSource
  dropdown_source: DropdownSource
  dropdownApi: string
  dropdown_api: string
  isTableVisible: boolean
  is_table_visible: boolean
  isFormVisible: boolean
  is_form_visible: boolean
  isRequired: boolean
  is_required: boolean
  sortable: boolean
  order: number
  isActive: boolean
}

export interface ScreenFieldInput {
  screenId?: string
  screen_id?: string
  fieldKey?: string
  field_key?: string
  label: string
  type?: ScreenFieldType
  options?: string[]
  dropdownSource?: DropdownSource
  dropdown_source?: DropdownSource
  dropdownApi?: string
  dropdown_api?: string
  isTableVisible?: boolean
  is_table_visible?: boolean
  isFormVisible?: boolean
  is_form_visible?: boolean
  isRequired?: boolean
  is_required?: boolean
  sortable?: boolean
  order?: number
  isActive?: boolean
}

export interface ScreenPermission {
  _id: string
  screenId: string
  screen_id: string
  roleId: string
  industryId: string
  fieldId: string
  field_id: string
  isEnabled: boolean
  is_enabled: boolean
}

export interface ResolvedTableHeader {
  key: string
  label: string
  type: ScreenFieldType
  sortable: boolean
  order: number
  options: string[]
  visible: boolean
}

export interface ResolvedFormField {
  key: string
  label: string
  type: ScreenFieldType
  required: boolean
  options: string[]
  dropdownSource: DropdownSource
  dropdown_source: DropdownSource
  dropdownApi: string
  dropdown_api: string
  order: number
}

export interface ResolvedScreen {
  screen: { _id: string; key: string; name: string }
  industryId: string
  roleId: string
  tableHeaders: ResolvedTableHeader[]
  table_headers: ResolvedTableHeader[]
  formFields: ResolvedFormField[]
  form_fields: ResolvedFormField[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function safeList<T>(path: string): Promise<T[]> {
  const res = await api.get(path)
  return (res.data?.items ?? []) as T[]
}

// ── Screens CRUD ─────────────────────────────────────────────────────────────
export async function getScreens(): Promise<Screen[]> {
  return safeList<Screen>('screens')
}
export async function createScreen(data: ScreenInput): Promise<Screen> {
  const res = await api.post('screens', data)
  return res.data as Screen
}
export async function updateScreen(id: string, data: Partial<ScreenInput>): Promise<Screen> {
  const res = await api.put(`screens/${id}`, data)
  return res.data as Screen
}
export async function deleteScreen(id: string): Promise<void> {
  await api.delete(`screens/${id}`)
}

// ── Fields CRUD ──────────────────────────────────────────────────────────────
export async function getScreenFields(screenId?: string): Promise<ScreenField[]> {
  const qs = screenId ? `?screenId=${encodeURIComponent(screenId)}` : ''
  return safeList<ScreenField>(`screen-fields${qs}`)
}
export async function createScreenField(data: ScreenFieldInput): Promise<ScreenField> {
  const res = await api.post('screen-fields', data)
  return res.data as ScreenField
}
export async function updateScreenField(
  id: string,
  data: Partial<ScreenFieldInput>,
): Promise<ScreenField> {
  const res = await api.put(`screen-fields/${id}`, data)
  return res.data as ScreenField
}
export async function deleteScreenField(id: string): Promise<void> {
  await api.delete(`screen-fields/${id}`)
}

// ── Permissions ──────────────────────────────────────────────────────────────
export async function getScreenPermissions(params: {
  screenId?: string
  screen_id?: string
  roleId?: string
  industryId?: string
  enabledOnly?: boolean
} = {}): Promise<ScreenPermission[]> {
  const search = new URLSearchParams()
  const sId = params.screenId || params.screen_id
  if (sId) search.set('screenId', sId)
  if (params.roleId) search.set('roleId', params.roleId)
  if (params.industryId) search.set('industryId', params.industryId)
  if (params.enabledOnly) search.set('enabled', 'true')
  const qs = search.toString()
  return safeList<ScreenPermission>(qs ? `screen-permissions?${qs}` : 'screen-permissions')
}

export async function bulkSetScreenPermissions(input: {
  screenId?: string
  screen_id?: string
  roleId: string
  industryId: string
  fieldIds?: string[]
  field_ids?: string[]
}): Promise<ScreenPermission[]> {
  const payload = {
    screenId: input.screenId || input.screen_id,
    roleId: input.roleId,
    industryId: input.industryId,
    fieldIds: input.fieldIds || input.field_ids,
  }
  const res = await api.post('screen-permissions/bulk', payload)
  return (res.data?.items ?? []) as ScreenPermission[]
}

// ── Resolve (used by client pages to get their dynamic columns/forms) ────────
export async function resolveScreen(input: {
  screenKey?: string
  industryCode?: string
  roleKey?: string
  screen_key?: string
  industry_code?: string
  role_key?: string
}): Promise<ResolvedScreen> {
  const payload = {
    screenKey: input.screenKey || input.screen_key,
    industryCode: input.industryCode || input.industry_code,
    roleKey: input.roleKey || input.role_key,
  }
  const res = await api.post('screens/resolve', payload)
  return res.data as ResolvedScreen
}
