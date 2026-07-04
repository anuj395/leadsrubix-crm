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

export async function listContacts(): Promise<Contact[]> {
  const res = await api.get('contacts')
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
