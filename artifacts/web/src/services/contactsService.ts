import { api } from './api'

export interface Contact {
  _id: string
  industryId?: string | null
  roleId?: string | null
  createdBy?: string | null
  createdAt?: string
  updatedAt?: string
  // dynamic fields live alongside these — keys depend on the screen config
  [k: string]: unknown
}

export async function listContacts(params?: { industryId?: string; organizationId?: string }): Promise<Contact[]> {
  const query = new URLSearchParams()
  if (params?.industryId) query.set('industryId', params.industryId)
  if (params?.organizationId) query.set('organizationId', params.organizationId)
  const res = await api.get(`contacts?${query.toString()}`)
  return (res.data?.items ?? []) as Contact[]
}

export async function createContact(payload: Record<string, unknown>): Promise<Contact> {
  const res = await api.post('contacts', payload)
  return res.data as Contact
}

export async function updateContact(id: string, payload: Record<string, unknown>): Promise<Contact> {
  const res = await api.put(`contacts/${id}`, payload)
  return res.data as Contact
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`contacts/${id}`)
}


export async function bulkReassignContacts(ids: string[], contactOwnerEmail: string, uid?: string): Promise<any> {
  const res = await api.post('contacts/bulkReassign', { ids, contactOwnerEmail, uid })
  return res.data
}

export async function bulkImportContacts(contacts: any[]): Promise<{ imported: number; errors: any[]; requestId?: string }> {
  const res = await api.post('contacts/bulkImport', { contacts })
  return res.data
}

export async function fetchImportHistory(): Promise<any[]> {
  const res = await api.get('contacts/importHistory')
  return res.data ?? []
}

export async function transferContacts(payload: {
  ids: string[]
  owner: { email: string; uid?: string; id?: string }
  reason: string
  leadType: string
  options?: { fresh?: boolean; notes?: boolean; attachments?: boolean; task?: boolean; contactDetails?: boolean }
}): Promise<any> {
  const res = await api.post('contacts/transfer', payload)
  return res.data
}
