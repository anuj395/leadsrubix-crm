import type { AuthenticatedUser } from '@/types/user'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  name: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface AuthSession {
  token: string
  user: AuthenticatedUser
}

export interface AuthState {
  error: string | null
  isAuthenticated: boolean
  status: 'authenticated' | 'idle' | 'loading'
  token: string | null
  user: AuthenticatedUser | null
}