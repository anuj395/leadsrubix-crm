import { apiClient } from '../api/apiClient';

export const analyticsRepository = {
  async fetchRawAnalyticsOverview() {
    const res = await apiClient.get('/analytics/overview');
    return res.data;
  },
};
