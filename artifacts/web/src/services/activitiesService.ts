import { api } from './api'

export interface ActivityItem {
  _id: string
  type: 'Task' | 'CallLog'
  subject: string
  description: string
  status?: string
  createdAt: string
  duration?: number
  assignedTo?: string
}

export async function fetchActivityTimeline(type: string, id: string): Promise<ActivityItem[]> {
  const res = await api.get(`activities/timeline?type=${type}&id=${id}`)
  return (res.data?.items ?? []) as ActivityItem[]
}
