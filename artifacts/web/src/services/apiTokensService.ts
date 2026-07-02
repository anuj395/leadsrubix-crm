import { api } from './api'

export interface ApiTokenConfig {
  id: string
  _id?: string
  api_key: string
  organizationId?: string
  organization_id: string
  organizationName?: string
  organization_name?: string
  source: string
  leadSourceId?: string
  countryCode: string
  country_code?: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at?: string
  updated_at?: string
}

export type CreateApiTokenInput = Omit<ApiTokenConfig, 'id' | 'api_key'> & {
  api_key?: string
}

export async function getApiTokens(): Promise<ApiTokenConfig[]> {
  const res = await api.get('api-tokens')
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
