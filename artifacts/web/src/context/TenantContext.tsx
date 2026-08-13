import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/services/api'

export interface TenantBranding {
  logoUrl: string
  primaryColor: string
  appName: string
}

export interface TenantWorkspace {
  organizationId: string | null
  industryId: string
  subdomain: string
  customDomain: string
  organizationName: string
  branding: TenantBranding
}

interface TenantContextType {
  workspace: TenantWorkspace | null
  loading: boolean
  resolved: boolean
}

const defaultWorkspace: TenantWorkspace = {
  organizationId: null,
  industryId: 'temp0001',
  subdomain: '',
  customDomain: '',
  organizationName: 'Leads Rubix CRM',
  branding: {
    logoUrl: '',
    primaryColor: '#1976d2',
    appName: 'Leads Rubix CRM',
  },
}

const TenantContext = createContext<TenantContextType>({
  workspace: defaultWorkspace,
  loading: true,
  resolved: false,
})

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<TenantWorkspace | null>(defaultWorkspace)
  const [loading, setLoading] = useState(true)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let active = true
    const resolveTenant = async () => {
      try {
        const res = await api.get('/workspace/resolve-domain')
        if (active && res.data?.workspace) {
          setWorkspace(res.data.workspace)
          setResolved(res.data.resolved ?? false)
        }
      } catch (err) {
        // Fall back gracefully to default workspace context
      } finally {
        if (active) setLoading(false)
      }
    }
    void resolveTenant()
    return () => {
      active = false
    }
  }, [])

  return (
    <TenantContext.Provider value={{ workspace, loading, resolved }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenantWorkspace = () => useContext(TenantContext)
