import { api } from './api'

export interface Stage {
  stageId?: string
  stage_id?: string
  name: string
  probability: number
  color: string
  order: number
  isWon?: boolean
  is_won?: boolean
  isLost?: boolean
  is_lost?: boolean
}

export interface Pipeline {
  _id: string
  id?: string
  name: string
  isDefault?: boolean
  is_default?: boolean
  stages: Stage[]
  organizationId?: string
  workspaceId?: string
  industryId?: string
}

export interface Deal {
  _id: string
  id?: string
  title?: string
  name?: string
  amount?: number
  currency?: string
  pipelineId?: string
  pipeline_id?: string
  stageId?: string
  stage_id?: string
  stage?: string
  probability?: number
  expectedCloseDate?: string
  expected_close_date?: string
  closeDate?: string
  close_date?: string
  accountId?: string
  account_id?: string
  accountName?: string
  account_name?: string
  contactId?: string
  contact_id?: string
  contactName?: string
  contact_name?: string
  contactPhone?: string
  contact_phone?: string
  contactEmail?: string
  contact_email?: string
  ownerId?: string
  owner_id?: string
  ownerName?: string
  owner_name?: string
  ownerEmail?: string
  owner_email?: string
  lostReason?: string
  lost_reason?: string
  notes?: string
  organizationId?: string
  organization_id?: string
  createdAt?: string
  updatedAt?: string
  [k: string]: unknown
}

export async function listPipelines(params?: { organizationId?: string; industryId?: string }): Promise<Pipeline[]> {
  const res = await api.get('deals/pipelines', { params })
  return (res.data?.items ?? []) as Pipeline[]
}

export async function createPipeline(payload: Record<string, unknown>): Promise<Pipeline> {
  const res = await api.post('deals/pipelines', payload)
  return res.data as Pipeline
}

export async function listDeals(params?: { 
  pipelineId?: string; 
  contactId?: string; 
  accountId?: string; 
  stage?: string; 
  organizationId?: string; 
  industryId?: string 
}): Promise<Deal[]> {
  const res = await api.get('deals', { params })
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

export async function updateDealStage(
  id: string, 
  data: { stage: string; stageId?: string; probability?: number; lostReason?: string }
): Promise<Deal> {
  const res = await api.put(`deals/${id}/stage`, data)
  return res.data as Deal
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`deals/${id}`)
}
