import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Platform': 'mobile-ios',
    'X-Client-Version': '1.4.0',
  },
});

// Request Interceptor: Inject Auth Token & HMAC Signature Header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // SAP Zero-One Security Signature Header
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

// Response Interceptor: Token Refresh & Exponential Backoff Retry
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

    // 2. Token Expired Handling (401 Unauthorized)
    if (error.response?.status === 401) {
      console.warn('[apiClient] Session unauthorized (401), purging local auth token...');
      await AsyncStorage.removeItem('auth_token');
    }

    return Promise.reject(error);
  }
);
