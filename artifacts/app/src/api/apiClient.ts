import axios from 'axios';
import { safeStorage } from '../utils/safeStorage';

// ADB reverse tcp:8080 tcp:8080 maps localhost:8080 directly over USB cable.
// 192.168.29.77 is fallback for local Wi-Fi.
const LOCAL_ADB_URL = 'http://localhost:8080/api';
const HOST_WIFI_URL = 'http://192.168.29.77:8080/api';

export const apiClient = axios.create({
  baseURL: LOCAL_ADB_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await safeStorage.getItem('@auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to read auth token from storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If request failed due to network error on localhost, retry with Wi-Fi fallback URL
    if (error.code === 'ERR_NETWORK' && error.config && !error.config._retryWithWifi) {
      error.config._retryWithWifi = true;
      error.config.baseURL = HOST_WIFI_URL;
      return apiClient.request(error.config);
    }

    if (error.response?.status === 401) {
      await safeStorage.removeItem('@auth_token');
      await safeStorage.removeItem('@user_data');
    }
    return Promise.reject(error);
  }
);
