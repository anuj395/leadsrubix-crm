import { apiClient } from '../api/apiClient';

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  industryId?: string;
  organizationId?: string;
  workspaceId?: string;
}

export const analyticsRepository = {
  async fetchRawAnalyticsOverview(params?: AnalyticsQueryParams) {
    const res = await apiClient.get('/analytics/dashboard', { params });
    return res.data;
  },

  async fetchDashboardConfig(params?: AnalyticsQueryParams) {
    const res = await apiClient.get('/analytics/dashboard-config', { params });
    return res.data;
  },
};
