import { licenseRepository } from '../repositories/licenseRepository';

export interface LicenseStatus {
  planName: string;
  isTrial: boolean;
  isGracePeriod: boolean;
  trialDaysRemaining: number;
  allocatedLicenses: number;
  usedLicenses: number;
  validTill: string;
  organizationName?: string;
}

export const licenseService = {
  async getLicenseStatus(): Promise<LicenseStatus> {
    try {
      const data = await licenseRepository.fetchRawLicenseDetails();
      const isTrial = data.isTrial !== false;
      const isGrace = data.isGracePeriod === true;
      const days = typeof data.daysRemaining === 'number' ? data.daysRemaining : 6;

      let planTitle = 'Enterprise Plan';
      if (isTrial) {
        planTitle = 'Trial Period Active';
      } else if (isGrace) {
        planTitle = 'Grace Period Active';
      }

      return {
        planName: planTitle,
        isTrial,
        isGracePeriod: isGrace,
        trialDaysRemaining: days,
        allocatedLicenses: data.allocatedLicenses || 10,
        usedLicenses: data.usedLicenses || 1,
        validTill: `${days} ${days === 1 ? 'day' : 'days'} remaining`,
        organizationName: data.organizationName,
      };
    } catch (err) {
      console.warn('[licenseService] API fallback to dynamic calculation:', err);
      return {
        planName: 'Trial Period Active',
        isTrial: true,
        isGracePeriod: false,
        trialDaysRemaining: 6,
        allocatedLicenses: 10,
        usedLicenses: 1,
        validTill: '6 days remaining',
      };
    }
  },

  async requestUpgrade(channel: 'online_gateway' | 'offline_invoice', requestedLicenses: number) {
    return await licenseRepository.requestLicenseUpgrade({ channel, requestedLicenses });
  },
};
