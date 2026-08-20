import { api } from './api'

export interface Lead {
  _id: string
  firstName: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  leadStatus?: string
  leadSource?: string
  organizationId: string
  [k: string]: unknown
}

export async function listLeads(): Promise<Lead[]> {
  const res = await api.get('leads')
  return (res.data?.items ?? []) as Lead[]
}

export async function createLead(payload: Record<string, unknown>): Promise<Lead> {
  const res = await api.post('leads', payload)
  return res.data as Lead
}

export async function updateLead(id: string, payload: Record<string, unknown>): Promise<Lead> {
  const res = await api.put(`leads/${id}`, payload)
  return res.data as Lead
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`leads/${id}`)
}

export async function convertLead(payload: { leadId: string }): Promise<any> {
  const res = await api.post('leads/convert', payload)
  return res.data
}
