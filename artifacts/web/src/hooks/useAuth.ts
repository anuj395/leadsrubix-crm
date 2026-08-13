import { logout, selectAuth } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export function useAuth() {
  const dispatch = useAppDispatch()
  const authState = useAppSelector(selectAuth)

  return {
    ...authState,
    logout: () => dispatch(logout()),
  }
}