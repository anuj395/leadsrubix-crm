import axiosInstance from '@/services/axiosInstance'

export interface PushLogItem {
  _id: string
  organization_id: string
  organization_name?: string
  user_id: string
  user_email: string
  user_name?: string
  event_type: string
  title: string
  body: string
  status: 'DELIVERED' | 'FAILED' | 'SUPPRESSED_INACTIVE' | 'SUPPRESSED_QUOTA'
  aws_message_id?: string
  error_message?: string
  createdAt: string
}

export interface PushTemplateItem {
  _id?: string
  organization_id?: string
  event_type: 'LEAD_ASSIGNED' | 'TASK_DUE' | 'SYSTEM_ALERT' | 'THIRD_PARTY_LEAD' | 'LEAD_TRANSFERRED'
  title_template: string
  body_template: string
  is_active: boolean
}

export interface PushQuotaItem {
  _id?: string
  organization_id: string
  organization_name?: string
  monthly_limit: number
  used_count: number
  billing_month: string
}

export async function fetchPushLogs(params?: {
  status?: string
  eventType?: string
  search?: string
  targetOrgId?: string
  limit?: number
}): Promise<PushLogItem[]> {
  try {
    const response = await axiosInstance.get<any>('/push-notifications/logs', { params })
    const data = response.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.data)) return data.data
    return []
  } catch (err) {
    console.error('fetchPushLogs error:', err)
    return []
  }
}

export async function fetchPushTemplates(): Promise<PushTemplateItem[]> {
  try {
    const response = await axiosInstance.get<any>('/push-notifications/templates')
    const data = response.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.data)) return data.data
    return []
  } catch (err) {
    console.error('fetchPushTemplates error:', err)
    return []
  }
}

export async function updatePushTemplate(payload: {
  event_type: string
  title_template: string
  body_template: string
  is_active?: boolean
}): Promise<PushTemplateItem> {
  const response = await axiosInstance.post<PushTemplateItem>('/push-notifications/templates', payload)
  return response.data
}

export async function fetchPushQuotas(): Promise<PushQuotaItem[]> {
  try {
    const response = await axiosInstance.get<any>('/push-notifications/quotas')
    const data = response.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.data)) return data.data
    return []
  } catch (err) {
    console.error('fetchPushQuotas error:', err)
    return []
  }
}

export async function updatePushQuota(payload: {
  organization_id: string
  monthly_limit: number
}): Promise<PushQuotaItem> {
  const response = await axiosInstance.post<PushQuotaItem>('/push-notifications/quotas', payload)
  return response.data
}
