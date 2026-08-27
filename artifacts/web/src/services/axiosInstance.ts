import axios from 'axios'

import { env } from '@/config/env'

import { storage } from './storage'

function joinApiBase(base: string) {
  const cleaned = base.replace(/\/+$/g, '')
  if (!cleaned) return '/api'
  if (cleaned.endsWith('/api')) return cleaned
  return `${cleaned}/api`
}

const axiosInstance = axios.create({
  baseURL: joinApiBase(env.apiBaseUrl),
  timeout: 15000,
})

axiosInstance.interceptors.request.use((config) => {
  const token = storage.getAuthSession()?.token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      storage.clearAuthSession()
      const path = window.location.pathname
      if (path !== '/login' && path !== '/signup' && path !== '/forgot-password') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
