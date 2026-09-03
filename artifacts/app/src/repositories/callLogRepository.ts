import { apiClient } from '../api/apiClient';

export const callLogRepository = {
  async fetchRawCallLogs(userId?: string, role?: string) {
    try {
      const endpoint = role === 'superAdmin' ? '/call-logs/masterSearch' : '/call-logs/search';
      const res = await apiClient.post(endpoint, {
        uid: userId || '',
        filter: {},
        sort: { created_at: -1 },
        page: 1,
        pageSize: 500,
      });
      return res.data;
    } catch (e) {
      console.warn('[callLogRepository] Error loading call logs:', e);
      return [];
    }
  },
  async createCallLog(payload: any) {
    const res = await apiClient.post('/call-logs/create', payload);
    return res.data;
  },
};
