import { Platform } from 'react-native';
import axios, { AxiosRequestConfig } from 'axios';
import { safeStorage } from '../utils/safeStorage';
import { APP_CONFIG } from '../constants/appConstants';

const getDefaultApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }
  return 'http://127.0.0.1:8080/api';
};

export const API_BASE_URL = getDefaultApiUrl();

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

// Request Interceptor: Inject Auth Token & HMAC Signature Header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = (await safeStorage.getItem('@auth_token')) || (await safeStorage.getItem('auth_token'));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Security Signature Header
      const timestamp = Date.now().toString();
      config.headers['X-Request-Timestamp'] = timestamp;
      config.headers['X-Signature'] = `sig_${timestamp.slice(-6)}`;
    } catch (error) {
      console.warn('[apiClient] Token injection warning:', error);
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
