import { Navigate, Outlet, useLocation } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import { selectAuth } from '@/features/auth'
import { useAppSelector } from '@/store/hooks'
import { useSubscription } from '@/hooks/useSubscription'

import { paths } from './paths'

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAppSelector(selectAuth)
  const location = useLocation()
  const { isExpired, loading: loadingOrg } = useSubscription()

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to={paths.login} />
  }

  if (user?.needsPasswordChange && location.pathname !== '/change-password') {
    return <Navigate replace to="/change-password" />
  }

  if (!user?.needsPasswordChange && location.pathname === '/change-password') {
    return <Navigate replace to="/analytics" />
  }

  if (loadingOrg) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (location.pathname === '/settings' && !(user?.role === 'superAdmin' || user?.role === 'admin')) {
    return <Navigate replace to="/analytics" />
  }

  const isSubscriptionRoute =
    location.pathname === '/account/subscription-details' ||
    location.pathname === '/account/payment-invoices' ||
    location.pathname === '/account/receipts-history'

  if (isExpired && !isSubscriptionRoute) {
    return <Navigate replace to="/account/subscription-details" />
  }

  return <Outlet />
}