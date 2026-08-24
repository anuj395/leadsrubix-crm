import { useState, useEffect, useMemo } from 'react'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import axiosInstance from '@/services/axiosInstance'
import { useAuth } from './useAuth'

export interface ScopeOrg {
  code: string
  name: string
  industryId: string
}

export function useSuperAdminScope(isSuperAdmin: boolean) {
  const { user } = useAuth()
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [organizations, setOrganizations] = useState<ScopeOrg[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [loadingScope, setLoadingScope] = useState(false)

  // 1. Fetch industries for all users (both superAdmin and admin)
  useEffect(() => {
    let cancelled = false
    getIndustries(true)
      .then((list) => {
        if (cancelled) return
        setIndustries(list)

        if (!isSuperAdmin) {
          const userInd =
            (user as any)?.industryId ||
            (user as any)?.industry_id ||
            (user as any)?.industryCode ||
            (list[0]?.code ?? 'temp0001')
          setSelectedIndustry(userInd)
        } else if (list.length > 0 && !selectedIndustry) {
          setSelectedIndustry(list[0].code || '')
        }
      })
      .catch((err) => console.error('Failed to fetch industries', err))
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin, user, selectedIndustry])

  // 2. Resolve selectedOrg
  useEffect(() => {
    let cancelled = false
    if (!isSuperAdmin) {
      const userOrg = (user as any)?.organizationId || (user as any)?.organization_id || ''
      if (userOrg) {
        setSelectedOrg(userOrg)
      } else {
        axiosInstance
          .get('/organizations/my-subscription')
          .then((res) => {
            if (cancelled) return
            if (res.data?.organizationId) {
              setSelectedOrg(res.data.organizationId)
            }
          })
          .catch(() => {})
      }
      return
    }

    setLoadingScope(true)
    axiosInstance
      .get('/organizations?pageSize=1000')
      .then((res) => {
        if (cancelled) return
        const rawList = res.data?.items || res.data || []
        const list: ScopeOrg[] = rawList.map((org: any) => ({
          code: org.organization_id || org.organizationId || org._id,
          name: org.organization_name || org.organizationName || org.name || 'Organization',
          industryId: org.industry_id || org.industryId || org.industryCode || org.industry_code || '',
        }))
        if (list.length > 0) {
          setOrganizations(list)
        } else {
          // Fallback to analytics if items empty
          axiosInstance
            .get('/analytics/dashboard?groupBy=team')
            .then((dashRes) => {
              if (cancelled) return
              const fallbackList = dashRes.data?.organizationsList || []
              setOrganizations(fallbackList)
            })
            .catch(() => {})
        }
      })
      .catch((err) => {
        console.error('Failed to fetch organizations list', err)
        axiosInstance
          .get('/analytics/dashboard?groupBy=team')
          .then((dashRes) => {
            if (cancelled) return
            const fallbackList = dashRes.data?.organizationsList || []
            setOrganizations(fallbackList)
          })
          .catch(() => {})
      })
      .finally(() => {
        if (!cancelled) setLoadingScope(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin, user])

  const filteredOrgs = useMemo(() => {
    if (!isSuperAdmin) {
      return selectedOrg
        ? [
            {
              code: selectedOrg,
              name: (user as any)?.organizationName || 'Current Organization',
              industryId: selectedIndustry,
            },
          ]
        : []
    }
    if (!selectedIndustry) return organizations
    const selIndDoc = industries.find(i => i.code === selectedIndustry || i._id === selectedIndustry)
    const selIndIdStr = selIndDoc ? String(selIndDoc._id).toLowerCase() : String(selectedIndustry).toLowerCase()
    const selIndCode = selIndDoc ? String(selIndDoc.code).toLowerCase() : String(selectedIndustry).toLowerCase()

    return organizations.filter((org) => {
      const orgIndId = String(org.industryId || '').toLowerCase()
      return orgIndId === selIndIdStr || orgIndId === selIndCode
    })
  }, [isSuperAdmin, organizations, selectedIndustry, selectedOrg, user, industries])

  useEffect(() => {
    if (!isSuperAdmin) return
    if (filteredOrgs.length > 0) {
      const isValid = filteredOrgs.some((org) => org.code === selectedOrg)
      if (!isValid || !selectedOrg) {
        setSelectedOrg(filteredOrgs[0].code)
      }
    } else {
      setSelectedOrg('')
    }
  }, [isSuperAdmin, filteredOrgs, selectedOrg])

  return {
    industries,
    selectedIndustry,
    setSelectedIndustry,
    organizations,
    filteredOrgs,
    selectedOrg,
    setSelectedOrg,
    loadingScope,
  }
}
