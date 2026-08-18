import { apiClient } from '../api/apiClient';

export const permissionRepository = {
  async fetchRawRoles() {
    const res = await apiClient.get('/roles');
    return res.data;
  },
};
