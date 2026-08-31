const { Organization } = require('../models/organizationModel');

exports.resolveDomain = async (req, res, next) => {
  try {
    if (req.tenantWorkspace) {
      return res.json({ resolved: true, workspace: req.tenantWorkspace });
    }

    const rawHost = req.query.host || req.headers['x-tenant-host'] || req.headers['x-forwarded-host'] || req.headers.host || '';
    const host = String(rawHost).split(':')[0].toLowerCase().trim();

    let org = await Organization.findOne({ custom_domain: host, is_active: true }).exec();

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
      const workspace = {
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
      return res.json({ resolved: true, workspace });
    }

    return res.json({
      resolved: false,
      workspace: {
        organizationId: null,
        industryId: 'temp0001',
        subdomain: '',
        customDomain: '',
        organizationName: 'Leads Rubix CRM',
        branding: {
          logoUrl: '',
          primaryColor: '#1976d2',
          appName: 'Leads Rubix CRM',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
