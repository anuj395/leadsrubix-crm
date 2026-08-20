import { api } from './api'

export interface Deal {
  _id: string
  name: string
  amount?: number
  stage?: string
  probability?: number
  closeDate?: string
  accountId: string
  contactId?: string
  organizationId: string
  [k: string]: unknown
}

export async function listDeals(): Promise<Deal[]> {
  const res = await api.get('deals')
  return (res.data?.items ?? []) as Deal[]
}

export async function createDeal(payload: Record<string, unknown>): Promise<Deal> {
  const res = await api.post('deals', payload)
  return res.data as Deal
}

export async function updateDeal(id: string, payload: Record<string, unknown>): Promise<Deal> {
  const res = await api.put(`deals/${id}`, payload)
  return res.data as Deal
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`deals/${id}`)
}
