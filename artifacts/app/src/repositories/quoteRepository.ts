import { apiClient } from '../api/apiClient';

export const quoteRepository = {
  async generateRawQuotePdf(payload: any) {
    const res = await apiClient.post('/quotes/generate-pdf', payload);
    return res.data;
  },

  async saveRawQuote(payload: any) {
    const res = await apiClient.post('/quotes/save', payload);
    return res.data;
  },
};
