import type { Industry } from '@/config/industries'
import { api } from './api'

export async function getIndustries(): Promise<Industry[]> {
  const res = await api.get('industries')
  return res.data as Industry[]
}

export async function createIndustry(name: string): Promise<Industry> {
  const res = await api.post('industries', { name })
  return res.data as Industry
}
