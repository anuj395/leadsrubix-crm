import { useState, useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/features/auth'
import { getMyActionPerms } from '@/services/roleActionPermissionsService'

export interface ActionPermissions {
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
  loading: boolean
}

export function useActionPermission(screenKey: string): ActionPermissions {
  const { user } = useAppSelector(selectAuth)
  const [perms, setPerms] = useState<ActionPermissions>({
    can_view: true,
    can_add: true,
    can_edit: true,
    can_delete: true,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    if (!user) return

    // SuperAdmin and Admin always have full access to all actions
    if (user.role === 'superAdmin' || user.role === 'admin') {
      setPerms({
        can_view: true,
        can_add: true,
        can_edit: true,
        can_delete: true,
        loading: false,
      })
      return
    }

    setPerms((prev) => ({ ...prev, loading: true }))

    getMyActionPerms(screenKey)
      .then((data) => {
        if (!cancelled) {
          setPerms({
            can_view: data.can_view ?? false,
            can_add: data.can_add ?? false,
            can_edit: data.can_edit ?? false,
            can_delete: data.can_delete ?? false,
            loading: false,
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPerms({
            can_view: false,
            can_add: false,
            can_edit: false,
            can_delete: false,
            loading: false,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [screenKey, user?.role, (user as any)?.organizationId, (user as any)?.industryId])

  return perms
}
