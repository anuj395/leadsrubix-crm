import type {
  AuthSession,
  ForgotPasswordRequest,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth'
import { api } from '@/services/api'

// Auth service: rely on backend responses. Network or backend errors are thrown
// so the UI can display proper error messages; no demo fallback performed.

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const email = credentials.email.trim().toLowerCase()
    const password = credentials.password.trim()

    if (!email || password.length < 4) {
      throw new Error('Use a valid email and a password with at least 4 characters.')
    }

    try {
      const response = await api.post('auth/login', { email, password })
      const data = response.data as AuthSession
      return data
    } catch (err: any) {
      if (err?.response) {
        const msg = err.response?.data?.message || 'Authentication failed.'
        throw new Error(msg)
      }

      // Network error / backend unreachable
      throw new Error('Unable to reach authentication server.')
    }
  },

  async register(payload: any): Promise<AuthSession> {
    try {
      const response = await api.post('auth/signup', payload)
      const data = response.data as AuthSession
      return data
    } catch (err: any) {
      if (err?.response) {
        const msg = err.response?.data?.message || 'Unable to create account.'
        throw new Error(msg)
      }

      // Network error / backend unreachable
      throw new Error('Unable to reach authentication server.')
    }
  },

  async requestPasswordReset(request: ForgotPasswordRequest): Promise<{ message: string }> {
    const email = request.email.trim().toLowerCase()

    if (!email) {
      throw new Error('Enter the work email linked to your account.')
    }

    // Try backend endpoints for password reset and surface backend/network errors
    try {
      const endpoints = ['auth/forgot-password', 'auth/forgot', 'auth/request-password-reset']

      for (const ep of endpoints) {
        try {
          const response = await api.post(ep, { email })
          return response.data
        } catch (err: any) {
          if (err?.response) {
            // backend responded with an error -> stop trying other endpoints
            const msg = err.response?.data?.message || 'Unable to send password reset.'
            throw new Error(msg)
          }
          // network error -> try next endpoint
        }
      }

      throw new Error('Unable to send password reset.')
    } catch (err: any) {
      // if backend responded with an error, rethrow
      if (err instanceof Error && err.message !== 'Unable to send password reset.') {
        throw err
      }

      // Network error / backend unreachable
      throw new Error('Unable to reach authentication server.')
    }
  },
}