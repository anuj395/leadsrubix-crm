import { api } from './api'

export interface ApiTokenConfig {
  id: string
  apiKey: string
  organizationId?: string
  organizationName?: string
  industryId?: string
  workspaceId?: string
  source: string
  leadSourceId?: string
  countryCode: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt?: string
  updatedAt?: string
}

export type CreateApiTokenInput = Omit<ApiTokenConfig, 'id' | 'apiKey'> & {
  apiKey?: string
}

export async function getApiTokens(params?: { industryId?: string; organizationId?: string; workspaceId?: string }): Promise<ApiTokenConfig[]> {
  const query = new URLSearchParams()
  if (params?.industryId) query.set('industryId', params.industryId)
  if (params?.organizationId) query.set('organizationId', params.organizationId)
  if (params?.workspaceId) query.set('workspaceId', params.workspaceId)
  const res = await api.get(`api-tokens?${query.toString()}`)
  return (res.data ?? []) as ApiTokenConfig[]
}

export async function createApiToken(data: CreateApiTokenInput): Promise<ApiTokenConfig> {
  const res = await api.post('api-tokens', data)
  return res.data as ApiTokenConfig
}

export async function updateApiToken(id: string, data: Partial<CreateApiTokenInput>): Promise<ApiTokenConfig> {
  const res = await api.put(`api-tokens/${id}`, data)
  return res.data as ApiTokenConfig
}

export async function deleteApiToken(id: string): Promise<void> {
  await api.delete(`api-tokens/${id}`)
}
