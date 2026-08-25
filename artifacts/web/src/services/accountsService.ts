import { api } from './api'

export interface Account {
  _id: string
  name: string
  industry?: string
  website?: string
  phone?: string
  billingAddress?: Record<string, unknown>
  organizationId: string
  [k: string]: unknown
}

export async function listAccounts(): Promise<Account[]> {
  const res = await api.get('accounts')
  return (res.data?.items ?? []) as Account[]
}

export async function createAccount(payload: Record<string, unknown>): Promise<Account> {
  const res = await api.post('accounts', payload)
  return res.data as Account
}

export async function updateAccount(id: string, payload: Record<string, unknown>): Promise<Account> {
  const res = await api.put(`accounts/${id}`, payload)
  return res.data as Account
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`accounts/${id}`)
}
