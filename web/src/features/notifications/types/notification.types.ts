export interface NotificationItem {
  id: string
  _id: string
  title: string
  message: string
  type: 'LEAD_ASSIGNED' | 'TASK_ASSIGNED' | 'LEAD_TRANSFERRED' | 'SYSTEM'
  is_read: boolean
  related_id?: string
  created_at: string
  createdAt: string
}
