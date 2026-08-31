const { Organization } = require('../models/organizationModel');

/**
 * Tenant Domain & Subdomain Resolver Middleware
 * Evaluates incoming request Host header to dynamically resolve tenant workspace context.
 */
module.exports = async function tenantResolver(req, res, next) {
  try {
    const rawHost = req.query.host || req.headers['x-tenant-host'] || req.headers['x-forwarded-host'] || req.headers.host || '';
    const host = String(rawHost).split(':')[0].toLowerCase().trim();
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);

    if (!host || host === 'localhost' || host === '127.0.0.1' || isIp) {
      return next();
    }

    // 1. Check exact custom domain match (e.g. crm.acmecorp.com)
    let org = await Organization.findOne({ custom_domain: host, is_active: true }).exec();

    // 2. If not matched, check subdomain (e.g. acme.leadsrubix.com -> subdomain 'acme')
    if (!org && host.includes('.')) {
      const parts = host.split('.');
      if (parts.length >= 3) {
        const sub = parts[0];
        if (sub && sub !== 'www' && sub !== 'api' && sub !== 'app') {
          org = await Organization.findOne({ subdomain: sub, is_active: true }).exec();
        }
      }
    }

    if (org) {
      req.tenantWorkspace = {
        organizationId: org.organization_id || String(org._id),
        industryId: org.industry_id,
        subdomain: org.subdomain || '',
        customDomain: org.custom_domain || '',
        organizationName: org.organization_name || '',
        branding: {
          logoUrl: org.logo_url || '',
          primaryColor: org.primary_color || '#1976d2',
          appName: org.app_name || 'Leads Rubix CRM',
        },
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};
