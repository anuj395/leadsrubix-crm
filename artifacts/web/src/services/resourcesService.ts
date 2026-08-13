import { api } from './api'

export async function getResources(resourceKey: string, organizationId?: string, industryCode?: string): Promise<any[]> {
  const params = new URLSearchParams()
  if (organizationId) params.append('organizationId', organizationId)
  if (industryCode) params.append('industry_code', industryCode)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await api.get(`resources/${resourceKey}${qs}`)
  return (res.data ?? []) as any[]
}

export async function createResource(resourceKey: string, data: any, organizationId?: string, industryCode?: string): Promise<any> {
  const payload = {
    ...data,
    ...(organizationId ? { organizationId: organizationId } : {}),
  }
  const qs = industryCode ? `?industry_code=${encodeURIComponent(industryCode)}` : ''
  const res = await api.post(`resources/${resourceKey}${qs}`, payload)
  return res.data
}

export async function updateResource(resourceKey: string, id: string, data: any, industryCode?: string): Promise<any> {
  const qs = industryCode ? `?industry_code=${encodeURIComponent(industryCode)}` : ''
  const res = await api.put(`resources/${resourceKey}/${id}${qs}`, data)
  return res.data
}

export async function deleteResource(resourceKey: string, id: string, industryCode?: string): Promise<void> {
  const qs = industryCode ? `?industry_code=${encodeURIComponent(industryCode)}` : ''
  await api.delete(`resources/${resourceKey}/${id}${qs}`)
}
