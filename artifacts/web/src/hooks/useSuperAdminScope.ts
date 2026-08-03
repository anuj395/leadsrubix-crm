import { useState, useEffect, useMemo } from 'react'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import axiosInstance from '@/services/axiosInstance'

export interface ScopeOrg {
  code: string
  name: string
  industryId: string
}

export function useSuperAdminScope(isSuperAdmin: boolean) {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [organizations, setOrganizations] = useState<ScopeOrg[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [loadingScope, setLoadingScope] = useState(false)

  useEffect(() => {
    if (!isSuperAdmin) return
    getIndustries(true)
      .then((list) => {
        setIndustries(list)
        if (list.length > 0) {
          setSelectedIndustry(list[0].code || '')
        }
      })
      .catch((err) => console.error('Failed to fetch industries', err))
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    setLoadingScope(true)
    axiosInstance.get('/analytics/dashboard?groupBy=team')
      .then((res) => {
        const list = res.data?.organizationsList || []
        setOrganizations(list)
      })
      .catch((err) => console.error('Failed to fetch organizations list', err))
      .finally(() => setLoadingScope(false))
  }, [isSuperAdmin])

  const filteredOrgs = useMemo(() => {
    if (!selectedIndustry) return organizations
    return organizations.filter((org) => {
      const orgIndId = String(org.industryId || '').toLowerCase()
      const selIndId = String(selectedIndustry).toLowerCase()
      return orgIndId === selIndId
    })
  }, [organizations, selectedIndustry])

  useEffect(() => {
    if (filteredOrgs.length > 0) {
      const isValid = filteredOrgs.some((org) => org.code === selectedOrg)
      if (!isValid || !selectedOrg) {
        setSelectedOrg(filteredOrgs[0].code)
      }
    } else {
      setSelectedOrg('')
    }
  }, [filteredOrgs, selectedOrg])

  return {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    organizations,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
    loadingScope
  }
}
