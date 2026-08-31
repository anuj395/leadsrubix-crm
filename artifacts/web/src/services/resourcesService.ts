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

/**
 * Single source of truth for Lead Sources across the entire CRM application.
 * Dynamically loads configured lead sources from Resources (org-scoped or industry master).
 * ZERO hardcoded source arrays.
 */
export async function getLeadSources(organizationId?: string, industryCode?: string): Promise<string[]> {
  try {
    let items = await getResources('resourceLeadSources', organizationId, industryCode)
    // If tenant organization doesn't have custom sources yet, fetch industry master defaults
    if ((!items || items.length === 0) && organizationId) {
      items = await getResources('resourceLeadSources', undefined, industryCode)
    }
    const sources = (items || [])
      .map((s: any) => s.leadSource || s.source || s.name || s.value || (typeof s === 'string' ? s : ''))
      .map((s: string) => String(s).trim())
      .filter(Boolean)
    return Array.from(new Set(sources))
  } catch (err) {
    console.error('Failed to load lead sources dynamically from resources', err)
    return []
  }
}
