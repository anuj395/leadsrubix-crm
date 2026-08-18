import { apiClient } from '../api/apiClient';

export const optionRepository = {
  async fetchRawOptions(fieldKey: string, category?: string) {
    const search = new URLSearchParams();
    search.set('fieldKey', fieldKey);
    if (category) search.set('category', category);

    const res = await apiClient.get(`/options?${search.toString()}`);
    return res.data;
  },
};
