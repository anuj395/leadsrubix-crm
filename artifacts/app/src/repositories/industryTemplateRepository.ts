import { apiClient } from '../api/apiClient';

export const industryTemplateRepository = {
  async fetchRawIndustryTemplates() {
    const res = await apiClient.get('/industry-templates');
    return res.data;
  },
};
