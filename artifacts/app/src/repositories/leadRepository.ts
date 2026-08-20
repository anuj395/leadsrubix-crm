import { apiClient } from '../api/apiClient';

export const leadRepository = {
  async fetchRawLeads(qs?: string) {
    const res = await apiClient.get(`/leads${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async createRawLead(payload: any) {
    const res = await apiClient.post('/leads', payload);
    return res.data;
  },

  async updateRawLead(id: string, payload: any) {
    const res = await apiClient.put(`/leads/${id}`, payload);
    return res.data;
  },

  async transitionRawLeadStage(id: string, payload: any, headers?: any) {
    const res = await apiClient.post(`/leads/${id}/transition`, payload, { headers });
    return res.data;
  },
};
