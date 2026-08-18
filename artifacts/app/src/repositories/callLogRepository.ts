import { apiClient } from '../api/apiClient';

export const callLogRepository = {
  async fetchRawCallLogs() {
    const res = await apiClient.get('/call-logs');
    return res.data;
  },
};
