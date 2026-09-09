import { useState, useEffect, useMemo } from 'react'
import { getIndustries, type Industry } from '@/services/sidebarAdminService'
import axiosInstance from '@/services/axiosInstance'
import { useAuth } from './useAuth'

export interface ScopeOrg {
  code: string
  name: string
  industryId: string
}

interface ScopeOptions {
  allowGlobal?: boolean
}

export function useSuperAdminScope(isSuperAdmin: boolean, options?: ScopeOptions) {
  const { user } = useAuth()
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [organizations, setOrganizations] = useState<ScopeOrg[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [loadingScope, setLoadingScope] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Helper to read initial industryId and organizationId from URL query string
  const getUrlScope = () => {
    if (typeof window === 'undefined') return { ind: '', org: '' }
    const params = new URLSearchParams(window.location.search)
    const ind = params.get('industryId') || params.get('industry_id') || ''
    const org = params.get('organizationId') || params.get('organization_id') || ''
    return { ind, org }
  }

  // 1. Fetch industries for all users (both superAdmin and admin)
  useEffect(() => {
    let cancelled = false
    getIndustries(true)
      .then((list) => {
        if (cancelled) return
        setIndustries(list)

        const urlScope = getUrlScope()

        if (!isSuperAdmin) {
          const userInd =
            (user as any)?.industryId ||
            (user as any)?.industry_id ||
            (user as any)?.industryCode ||
            (list[0]?.code ?? 'temp0001')
          setSelectedIndustry(userInd)
        } else if (urlScope.ind) {
          const matched = list.find(i => i.code === urlScope.ind || i._id === urlScope.ind)
          setSelectedIndustry(matched ? matched.code : urlScope.ind)
        } else if (list.length > 0 && !selectedIndustry) {
          setSelectedIndustry(list[0].code || '')
        }
      })
      .catch((err) => console.error('Failed to fetch industries', err))
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin, user])

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

        const urlScope = getUrlScope()
        if (list.length > 0) {
          setOrganizations(list)
          if (urlScope.org) {
            const matchedOrg = list.find(o => o.code === urlScope.org)
            if (matchedOrg) {
              setSelectedOrg(matchedOrg.code)
              if (matchedOrg.industryId && !urlScope.ind) {
                setSelectedIndustry(matchedOrg.industryId)
              }
            }
          }
        } else {
          // Fallback to analytics if items empty
          axiosInstance
            .get('/analytics/dashboard?groupBy=team')
            .then((dashRes) => {
              if (cancelled) return
              const fallbackList = dashRes.data?.organizationsList || []
              setOrganizations(fallbackList)
              if (urlScope.org && fallbackList.some((o: any) => o.code === urlScope.org)) {
                setSelectedOrg(urlScope.org)
              }
            })
            .catch(() => {})
        }
        setIsInitialized(true)
      })
      .catch((err) => {
        console.error('Failed to fetch organizations list', err)
        axiosInstance
          .get('/analytics/dashboard?groupBy=team')
          .then((dashRes) => {
            if (cancelled) return
            const fallbackList = dashRes.data?.organizationsList || []
            setOrganizations(fallbackList)
            setIsInitialized(true)
          })
          .catch(() => {
            setIsInitialized(true)
          })
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
    if (!isSuperAdmin || !isInitialized) return
    if (options?.allowGlobal && selectedOrg === '') {
      // Intentionally selecting Global Baseline Template
      return
    }
    if (filteredOrgs.length > 0) {
      const isValid = filteredOrgs.some((org) => org.code === selectedOrg)
      if (!isValid) {
        const urlScope = getUrlScope()
        if (urlScope.org && filteredOrgs.some(o => o.code === urlScope.org)) {
          setSelectedOrg(urlScope.org)
        } else if (!options?.allowGlobal) {
          setSelectedOrg(filteredOrgs[0].code)
        }
      }
    } else if (!options?.allowGlobal) {
      setSelectedOrg('')
    }
  }, [isSuperAdmin, isInitialized, filteredOrgs, selectedOrg, options?.allowGlobal])

  // Synchronize state with URL search params for instant shareability and bookmarking
  useEffect(() => {
    if (!isSuperAdmin || typeof window === 'undefined' || !isInitialized) return
    const url = new URL(window.location.href)
    let changed = false

    if (selectedIndustry && url.searchParams.get('industryId') !== selectedIndustry) {
      url.searchParams.set('industryId', selectedIndustry)
      changed = true
    }
    if (selectedOrg && url.searchParams.get('organizationId') !== selectedOrg) {
      url.searchParams.set('organizationId', selectedOrg)
      changed = true
    } else if (!selectedOrg && url.searchParams.has('organizationId')) {
      url.searchParams.delete('organizationId')
      changed = true
    }

    if (changed) {
      window.history.replaceState(null, '', url.pathname + url.search)
    }
  }, [isSuperAdmin, isInitialized, selectedIndustry, selectedOrg])

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
