import { apiClient } from '../api/apiClient';

export const notificationRepository = {
  async fetchRawNotifications() {
    const res = await apiClient.get('/notifications');
    return res.data;
  },
};
