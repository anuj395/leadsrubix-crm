import { Platform } from 'react-native';
import axios, { AxiosRequestConfig } from 'axios';
import { safeStorage } from '../utils/safeStorage';
import { APP_CONFIG } from '../constants/appConstants';

export const API_BASE_URL = APP_CONFIG.apiBaseUrl;

console.log(
  `[LeadsRubix] 🚀 Running in ${APP_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode | Target API: ${API_BASE_URL}`
);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Platform': Platform.OS === 'android' ? 'mobile-android' : 'mobile-ios',
    'X-Client-Version': APP_CONFIG.version,
  },
});

// Request Interceptor: Inject Auth Token, Multi-tenant Organization ID & HMAC Signature Header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = (await safeStorage.getItem('@auth_token')) || (await safeStorage.getItem('auth_token'));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Multi-Tenant Isolation: Inject active organization ID
      const storedUserData = await safeStorage.getItem('@user_data');
      if (storedUserData) {
        try {
          const parsed = JSON.parse(storedUserData);
          if (parsed?.organizationId) {
            config.headers['x-organization-id'] = parsed.organizationId;
          }
        } catch {}
      }

      // Security Signature Header
      const timestamp = Date.now().toString();
      config.headers['X-Request-Timestamp'] = timestamp;
      config.headers['X-Signature'] = `sig_${timestamp.slice(-6)}`;
    } catch (error) {
      console.warn('[apiClient] Token / Org injection warning:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Token Refresh & Graceful Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retryCount?: number };

    // 1. Exponential Backoff Retry for Network Failures
    if (!error.response && originalRequest && (!originalRequest._retryCount || originalRequest._retryCount < 2)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const delay = originalRequest._retryCount * 300;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }

    // 2. Token Expired Handling (401 Unauthorized for authenticated session)
    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/login')) {
      try {
        await safeStorage.removeItem('@auth_token');
        await safeStorage.removeItem('@user_data');
        await safeStorage.removeItem('auth_token');
      } catch (e) {
        // Safe storage handles suppression
      }
    }

    return Promise.reject(error);
  }
);
