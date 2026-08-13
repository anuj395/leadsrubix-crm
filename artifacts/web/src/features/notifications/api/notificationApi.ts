import axiosInstance from '@/services/axiosInstance'
import type { NotificationItem } from '../types/notification.types'

export async function fetchNotifications(limit = 20): Promise<NotificationItem[]> {
  const response = await axiosInstance.get<NotificationItem[]>('/notifications', {
    params: { limit }
  })
  return response.data ?? []
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await axiosInstance.get<{ count: number }>('/notifications/unread-count')
  return response.data?.count ?? 0
}

export async function markAsRead(id: string): Promise<NotificationItem> {
  const response = await axiosInstance.put<NotificationItem>(`/notifications/${id}/read`)
  return response.data
}

export async function markAllAsRead(): Promise<void> {
  await axiosInstance.put('/notifications/mark-all-read')
}

export interface NotificationSettingsResponse {
  industrySettings: Array<{ notification_type: string; is_enabled: boolean }>
  orgSettings: Array<{ notification_type: string; is_enabled: boolean }>
  userSettings: Array<{ notification_type: string; is_enabled: boolean }>
}

export async function fetchNotificationSettings(industryId?: string): Promise<NotificationSettingsResponse> {
  const response = await axiosInstance.get<NotificationSettingsResponse>('/notifications/settings', {
    params: { industryId }
  })
  return response.data
}

export async function updateNotificationSetting(payload: {
  level: 'industry' | 'org' | 'user'
  notificationType: string
  isEnabled: boolean
  industryId?: string
}): Promise<void> {
  await axiosInstance.put('/notifications/settings', payload)
}
