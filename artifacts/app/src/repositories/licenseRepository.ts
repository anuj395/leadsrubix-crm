import { apiClient } from '../api/apiClient';

export const licenseRepository = {
  async fetchRawLicenseDetails() {
    const res = await apiClient.get('/organizations/my-subscription');
    return res.data;
  },

  async requestLicenseUpgrade(payload: any) {
    const res = await apiClient.post('/organizations/my-subscription/upgrade', payload);
    return res.data;
  },
};
