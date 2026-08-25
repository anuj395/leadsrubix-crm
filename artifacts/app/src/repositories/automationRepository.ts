import { apiClient } from '../api/apiClient';

export const automationRepository = {
  async fetchRawAutomations() {
    const res = await apiClient.get('/automations');
    return res.data;
  },

  async createRawAutomation(payload: any) {
    const res = await apiClient.post('/automations', payload);
    return res.data;
  },

  async updateRawAutomation(id: string, payload: any) {
    const res = await apiClient.put(`/automations/${id}`, payload);
    return res.data;
  },
};
