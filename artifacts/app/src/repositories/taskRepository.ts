import { apiClient } from '../api/apiClient';

export const taskRepository = {
  async fetchRawTasks(qs?: string) {
    const res = await apiClient.get(`/tasks${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async createRawTask(payload: any) {
    const res = await apiClient.post('/tasks', payload);
    return res.data;
  },

  async updateRawTask(id: string, payload: any) {
    const res = await apiClient.put(`/tasks/${id}`, payload);
    return res.data;
  },
};
