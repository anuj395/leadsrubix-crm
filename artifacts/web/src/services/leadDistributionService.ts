import { api } from './api'

export interface LeadDistributionUser {
  uid: string
  user_email: string
}

export interface LeadDistributionRule {
  _id: string
  source: string
  project: string[]
  location: string[]
  budget: string[]
  propertyType: string[]
  users: LeadDistributionUser[]
  usersQueue: string[]
  leadManagerUsers: LeadDistributionUser[]
  distributionType: 'Normal' | 'Roundrobin'
  userIndex: number
  leadDistId: string
  createdAt?: string
  updatedAt?: string
}

export interface LeadRotationRule {
  _id: string
  source: string
  project: string[]
  rotationTime: number
  users: LeadDistributionUser[]
  usersQueue: string[]
  leadManagerUsers: LeadDistributionUser[]
  userIndex: number
  relocId: string
  createdAt?: string
  updatedAt?: string
}

export interface LeadDistributionLogic {
  _id: string
  autoAssign: boolean
  logicType: 'round-robin' | 'weighted' | 'performance' | 'manual'
  inactiveTimeLimitHours: number
  reassignAuto: boolean
}

export interface LeadReassignmentHistory {
  _id: string
  contactId: string
  contactName: string
  originalOwnerId: string | null
  originalOwnerName: string
  newOwnerId: string
  newOwnerName: string
  reason: string
  reassignedAt: string
}

export interface Team {
  _id: string
  name: string
}

export interface Branch {
  _id: string
  name: string
}

export async function getDistributionRules(orgId?: string): Promise<LeadDistributionRule[]> {
  const params = orgId && orgId !== 'all' ? { organizationId: orgId } : undefined
  const res = await api.get('lead-distribution/rules', { params })
  return res.data || []
}

export async function getDistributionRuleById(id: string): Promise<LeadDistributionRule> {
  const res = await api.get(`lead-distribution/rules/${id}`)
  return res.data
}

export async function createDistributionRule(rule: Partial<LeadDistributionRule>): Promise<LeadDistributionRule> {
  const res = await api.post('lead-distribution/rules', rule)
  return res.data
}

export async function updateDistributionRule(id: string, rule: Partial<LeadDistributionRule>): Promise<LeadDistributionRule> {
  const res = await api.put(`lead-distribution/rules/${id}`, rule)
  return res.data
}

export async function deleteDistributionRule(id: string): Promise<void> {
  await api.delete(`lead-distribution/rules/${id}`)
}

export async function getRotationRules(): Promise<LeadRotationRule[]> {
  const res = await api.get('lead-distribution/rotation-rules')
  return res.data || []
}

export async function createRotationRule(rule: Partial<LeadRotationRule>): Promise<LeadRotationRule> {
  const res = await api.post('lead-distribution/rotation-rules', rule)
  return res.data
}

export async function deleteRotationRule(id: string): Promise<void> {
  await api.delete(`lead-distribution/rotation-rules/${id}`)
}

export async function getDistributionLogic(): Promise<LeadDistributionLogic> {
  const res = await api.get('lead-distribution/logic')
  return res.data
}

export async function updateDistributionLogic(logic: Partial<LeadDistributionLogic>): Promise<LeadDistributionLogic> {
  const res = await api.put('lead-distribution/logic', logic)
  return res.data
}

export async function getReassignHistory(): Promise<LeadReassignmentHistory[]> {
  const res = await api.get('lead-distribution/reassign-history')
  return res.data || []
}

export async function createReassignHistory(entry: Partial<LeadReassignmentHistory>): Promise<LeadReassignmentHistory> {
  const res = await api.post('lead-distribution/reassign-history', entry)
  return res.data
}

export async function getTeams(): Promise<Team[]> {
  const res = await api.get('teams')
  return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
}

export async function getBranches(): Promise<Branch[]> {
  const res = await api.get('branches')
  return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
}
