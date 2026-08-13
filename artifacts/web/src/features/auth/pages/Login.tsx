import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { clearAuthError, selectAuth } from '@/features/auth'
import { paths } from '@/routes/paths'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

import { LoginForm } from '../components/LoginForm'
import { login } from '../store/authSlice'
import type { LoginCredentials } from '../types/auth'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { error, status } = useAppSelector(selectAuth)

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const redirectTo =
    typeof (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ===
    'string'
      ? (location.state as { from?: { pathname?: string } }).from?.pathname ?? paths.analytics
      : paths.analytics

  const handleSubmit = async (credentials: LoginCredentials) => {
    try {
      await dispatch(login(credentials)).unwrap()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      // login rejected — auth slice already sets `error`.
      // keep the user on the login page and show the error message.
      return
    }
  }

  return (
    <LoginForm error={error} isSubmitting={status === 'loading'} onSubmit={handleSubmit} />
  )
}