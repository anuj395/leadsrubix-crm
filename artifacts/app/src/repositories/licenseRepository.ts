import { apiClient } from '../api/apiClient';

export const licenseRepository = {
  async fetchRawLicenseDetails() {
    const res = await apiClient.get('/organization/license-details');
    return res.data;
  },

  async requestLicenseUpgrade(payload: any) {
    const res = await apiClient.post('/organization/request-license-upgrade', payload);
    return res.data;
  },
};
