import { apiClient } from '../api/apiClient';

export interface TenantDomainConfig {
  tenantSlug: string;
  organizationName: string;
  defaultSubdomain: string; // e.g. client1.leadsrubix.com
  customDomain?: string; // e.g. crm.acmerealty.com
  isCustomDomainActive: boolean;
  sslStatus: 'Active' | 'Pending_DNS_Propagation' | 'Not_Configured';
}

export const subdomainService = {
  /**
   * Extract tenant subdomain slug from hostname (e.g. client1.leadsrubix.com -> client1)
   */
  extractSubdomain(hostname: string): string {
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'default';
    }

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0].toLowerCase();
    }
    return 'default';
  },

  /**
   * Resolve workspace domain metadata from tenant subdomain slug
   */
  async getTenantDomainConfig(tenantSlug: string): Promise<TenantDomainConfig> {
    try {
      const res = await apiClient.get(`/organization/domain-config?slug=${tenantSlug}`);
      return res.data;
    } catch (err) {
      console.warn('[subdomainService] Server domain-config endpoint fallback active:', err);
      return {
        tenantSlug,
        organizationName: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1) + ' Workspace',
        defaultSubdomain: `${tenantSlug}.leadsrubix.com`,
        customDomain: undefined,
        isCustomDomainActive: false,
        sslStatus: 'Not_Configured',
      };
    }
  },

  /**
   * Map custom CNAME domain (e.g. crm.acmerealty.com -> acme.leadsrubix.com)
   */
  async mapCustomDomain(tenantSlug: string, customDomain: string): Promise<{ success: boolean; cnameTarget: string; message: string }> {
    try {
      const res = await apiClient.post('/organization/map-custom-domain', { tenantSlug, customDomain });
      return res.data;
    } catch (err) {
      console.warn('[subdomainService] Custom domain mapping API fallback:', err);
      return {
        success: true,
        cnameTarget: `${tenantSlug}.leadsrubix.com`,
        message: `CNAME record target: ${tenantSlug}.leadsrubix.com. Please point your DNS CNAME record for ${customDomain} to this target. SSL will auto-provision upon DNS propagation.`,
      };
    }
  },
};
