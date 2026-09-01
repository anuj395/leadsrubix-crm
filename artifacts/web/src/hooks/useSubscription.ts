import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'

export interface SubscriptionState {
  status: string
  isExpired: boolean
  isTrial: boolean
  isGracePeriod: boolean
  paymentStatus: boolean
  daysRemaining: number
  expiryDate: string | null
  reason: string
  organizationName?: string
  planName?: string
  numEmployees?: number
  costPerLicense?: number
  activeUsersCount?: number
  registeredMethod?: string
  validFrom?: string
  validTill?: string
  cardDetails?: {
    cardholderName: string
    last4: string
    brand: string
    expiry: string
  }
  billingDetails?: {
    legalName: string
    billingEmail: string
    billingPhone: string
    billingAddress: string
    gstin: string
    pan?: string
  }
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchSubscription = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    try {
      const res = await api.get('/organizations/my-subscription')
      setSubscription(res.data)
    } catch (err: any) {
      console.error('[useSubscription] Failed to load subscription state:', err)
      const role = user.role || (user as any).roleKey || (user as any).role_key
      if (role === 'superAdmin') {
        setSubscription({
          status: 'SUPER_ADMIN',
          isExpired: false,
          isTrial: false,
          isGracePeriod: false,
          paymentStatus: true,
          daysRemaining: 9999,
          expiryDate: null,
          reason: 'Super Admin access',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSubscription()
  }, [isAuthenticated, user])

  return {
    subscription,
    loading,
    refetch: fetchSubscription,
    isExpired: subscription?.isExpired ?? false,
    isTrial: subscription?.isTrial ?? false,
    isGracePeriod: subscription?.isGracePeriod ?? false,
    daysRemaining: subscription?.daysRemaining ?? 0,
    status: subscription?.status ?? 'UNKNOWN',
  }
}
