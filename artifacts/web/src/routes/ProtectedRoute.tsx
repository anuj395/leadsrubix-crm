import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import { selectAuth } from '@/features/auth'
import { useAppSelector } from '@/store/hooks'
import { api } from '@/services/api'

import { paths } from './paths'

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAppSelector(selectAuth)
  const location = useLocation()
  const [loadingOrg, setLoadingOrg] = useState(true)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user || user.role === 'superAdmin') {
      setLoadingOrg(false)
      return
    }

    void (async () => {
      try {
        const res = await api.get(`/organizations?industryId=${user.industryId}`)
        const orgs = res.data?.items ?? []
        const org = orgs[0]
        if (org) {
          let expired = false
          const now = Date.now()
          const createdAt = org.createdAt ? new Date(org.createdAt).getTime() : now

          if (org.trialPeriod === true || org.trialPeriod === 'true') {
            const trialDays = typeof org.trialPeriodDays === 'number' ? org.trialPeriodDays : 7
            const trialExpiry = createdAt + trialDays * 24 * 60 * 60 * 1000
            if (now > trialExpiry) {
              expired = true
            }
          } else {
            const validTill = org.validTill ? new Date(org.validTill).getTime() : now
            const graceDays = typeof org.gracePeriodDays === 'number' ? org.gracePeriodDays : 7
            const graceExpiry = validTill + graceDays * 24 * 60 * 60 * 1000
            if (now > graceExpiry) {
              expired = true
            }
          }

          if (org.paymentStatus === false || org.paymentStatus === 'false') {
            expired = true
          }

          setIsExpired(expired)
        }
      } catch (err) {
        console.error('Failed to load organization subscription state', err)
      } finally {
        setLoadingOrg(false)
      }
    })()
  }, [isAuthenticated, user])

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to={paths.login} />
  }

  if ((user?.needsPasswordChange || user?.needs_password_change) && location.pathname !== '/change-password') {
    return <Navigate replace to="/change-password" />
  }

  if (!(user?.needsPasswordChange || user?.needs_password_change) && location.pathname === '/change-password') {
    return <Navigate replace to="/analytics" />
  }

  if (loadingOrg) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isExpired && location.pathname !== '/account/subscription-details') {
    return <Navigate replace to="/account/subscription-details" />
  }

  return <Outlet />
}