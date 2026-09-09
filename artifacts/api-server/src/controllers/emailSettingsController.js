const mongoose = require('mongoose');
const awsSesService = require('../services/awsSesService');
const emailQueueService = require('../services/emailQueueService');

/**
 * Get SES Identity & Verification status for Workspace.
 */
exports.getSesConfig = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const targetOrgId = req.params.id || req.user?.organizationId || req.user?.organization_id;

    let org = null;
    if (targetOrgId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(targetOrgId);
      org = await Organization.findOne(
        isObjectId
          ? { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }, { _id: targetOrgId }] }
          : { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }] }
      ).lean().exec();
    }

    if (!org) {
      org = await Organization.findOne({}).lean().exec();
    }

    const defaultSenderEmail = (awsSesService && awsSesService.DEFAULT_SENDER_EMAIL) || 'noreply@leadsrubix.com';
    const defaultSenderName = (awsSesService && awsSesService.DEFAULT_SENDER_NAME) || 'LeadsRubix';

    const sesConfig = (org && (org.sesConfig || org.ses_config)) || {
      identityDomain: '',
      verificationStatus: 'PENDING',
      verificationToken: '',
      dkimTokens: [],
      fromEmail: '',
      fromName: (org && (org.organization_name || org.name)) || 'Workspace',
      useCustomSes: false
    };

    const quota = (org && (org.emailQuota || org.email_quota)) || {
      dailyLimit: 2000,
      monthlyLimit: 50000,
      rateLimitPerMinute: 300,
      usedToday: 0,
      usedThisMonth: 0
    };

    res.json({
      organizationId: org ? String(org._id) : 'default_org',
      sesConfig,
      quota,
      defaultSender: {
        email: defaultSenderEmail,
        name: defaultSenderName
      }
    });
  } catch (err) {
    console.error('[emailSettingsController.getSesConfig] error:', err.message || err);
    res.json({
      organizationId: 'default_org',
      sesConfig: {
        identityDomain: '',
        verificationStatus: 'PENDING',
        verificationToken: '',
        dkimTokens: [],
        fromEmail: 'noreply@leadsrubix.com',
        fromName: 'LeadsRubix Workspace',
        useCustomSes: false
      },
      quota: {
        dailyLimit: 2000,
        monthlyLimit: 50000,
        rateLimitPerMinute: 300,
        usedToday: 0,
        usedThisMonth: 0
      },
      defaultSender: {
        email: 'noreply@leadsrubix.com',
        name: 'LeadsRubix'
      }
    });
  }
};

/**
 * Request AWS SES Domain Verification tokens & DNS records.
 */
exports.requestDomainVerification = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const targetOrgId = req.params.id || req.user?.organizationId || req.user?.organization_id;
    const { domain, fromEmail, fromName, useCustomSes } = req.body || {};

    if (!domain) return res.status(400).json({ message: 'Domain name is required (e.g. mail.clinic.com).' });

    let org = null;
    if (targetOrgId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(targetOrgId);
      org = await Organization.findOne(
        isObjectId
          ? { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }, { _id: targetOrgId }] }
          : { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }] }
      ).exec();
    }

    if (!org) {
      org = await Organization.findOne({}).exec();
    }

    if (!org) return res.status(400).json({ message: 'No organization found in system.' });

    // Call AWS SES API to generate tokens
    const sesRes = await awsSesService.verifyDomainIdentity({ domain });

    const updatedSesConfig = {
      identityDomain: sesRes.domain,
      verificationStatus: 'PENDING',
      verificationToken: sesRes.verificationToken,
      dkimTokens: sesRes.dkimTokens,
      dnsRecords: sesRes.dnsRecords,
      fromEmail: fromEmail || `notifications@${sesRes.domain}`,
      fromName: fromName || org.organization_name || 'Workspace',
      useCustomSes: useCustomSes !== undefined ? useCustomSes : true
    };

    org.ses_config = updatedSesConfig;
    org.sesConfig = updatedSesConfig;
    await org.save();

    res.json({
      success: true,
      message: `AWS SES domain identity verification initiated for ${sesRes.domain}. Please add the DNS records to your DNS provider.`,
      sesConfig: updatedSesConfig
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Poll AWS SES for domain verification status update.
 */
exports.checkDomainStatus = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const targetOrgId = req.params.id || req.user?.organizationId || req.user?.organization_id;

    const isObjectId = mongoose.Types.ObjectId.isValid(targetOrgId);
    const org = await Organization.findOne(
      isObjectId
        ? { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }, { _id: targetOrgId }] }
        : { $or: [{ organization_id: targetOrgId }, { organizationId: targetOrgId }] }
    ).exec();

    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const sesConfig = org.sesConfig || org.ses_config;
    if (!sesConfig || !sesConfig.identityDomain) {
      return res.status(400).json({ message: 'No domain identity configured for this workspace.' });
    }

    const statusRes = await awsSesService.checkIdentityStatus({ domain: sesConfig.identityDomain });

    const newStatus = statusRes.isVerified ? 'VERIFIED' : (statusRes.status || 'PENDING');
    sesConfig.verificationStatus = newStatus;
    org.ses_config = sesConfig;
    org.sesConfig = sesConfig;
    await org.save();

    res.json({
      success: true,
      domain: sesConfig.identityDomain,
      verificationStatus: newStatus,
      isVerified: statusRes.isVerified
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Multi-Tier Workspace Email Delivery Logs.
 */
exports.getEmailLogs = async (req, res, next) => {
  try {
    const EmailLog = mongoose.model('EmailLog');
    const targetOrgId = req.user?.organizationId || req.user?.organization_id || req.query.organizationId;
    const page = Math.max(Number(req.query.page) || 0, 0);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 100);
    const skip = page * pageSize;

    const isSuperAdmin = req.user?.role === 'superAdmin' || req.user?.roleKey === 'superAdmin';
    const query = {};
    if (!isSuperAdmin && targetOrgId) {
      query.organization_id = targetOrgId;
    } else if (req.query.organizationId && req.query.organizationId !== 'all') {
      query.organization_id = req.query.organizationId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      EmailLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean().exec(),
      EmailLog.countDocuments(query).exec()
    ]);

    const Organization = mongoose.model('Organization');
    const orgs = await Organization.find({}).lean().exec();
    const orgMap = {};
    orgs.forEach(o => {
      const name = o.organization_name || o.organizationName || o.name || 'Workspace';
      orgMap[String(o._id)] = name;
      if (o.organization_id || o.organizationId) {
        orgMap[String(o.organization_id || o.organizationId)] = name;
      }
    });

    const enrichedItems = items.map(item => ({
      ...item,
      organizationName: orgMap[String(item.organization_id || item.organizationId)] || item.organization_id || 'Global System'
    }));

    const systemStats = emailQueueService.getSystemStats();

    res.json({
      items: enrichedItems,
      total,
      page,
      pageSize,
      systemStats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Enqueue a test email into the high-throughput queue.
 */
exports.enqueueTestEmail = async (req, res, next) => {
  try {
    const targetOrgId = req.user?.organizationId || req.user?.organization_id;
    const { recipient, subject, bodyHtml } = req.body || {};

    const testRecipient = recipient || req.user?.email || req.user?.email_id || req.user?.username;

    const result = await emailQueueService.enqueueEmail({
      organizationId: targetOrgId,
      recipient: testRecipient,
      subject: subject || 'Test High-Throughput Queue Dispatch',
      htmlContent: bodyHtml || '<p>This email was enqueued into the high-throughput AWS SES Queue Engine.</p>',
      triggerAction: 'manual_test'
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin Quota Management.
 */
exports.getAdminQuotas = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const orgs = await Organization.find().lean().exec();

    const items = orgs.map(org => ({
      organizationId: String(org._id),
      organizationName: org.organization_name || org.organizationName,
      emailQuota: org.emailQuota || org.email_quota || { dailyLimit: 2000, monthlyLimit: 50000, rateLimitPerMinute: 300, usedToday: 0 }
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.updateAdminQuota = async (req, res, next) => {
  try {
    const Organization = mongoose.model('Organization');
    const { orgId } = req.params;
    const { dailyLimit, monthlyLimit, rateLimitPerMinute } = req.body || {};

    const isObjectId = mongoose.Types.ObjectId.isValid(orgId);
    const org = await Organization.findOne(
      isObjectId
        ? { $or: [{ organization_id: orgId }, { organizationId: orgId }, { _id: orgId }] }
        : { $or: [{ organization_id: orgId }, { organizationId: orgId }] }
    ).exec();

    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const quota = org.emailQuota || org.email_quota || {};
    if (dailyLimit !== undefined) quota.dailyLimit = Number(dailyLimit);
    if (monthlyLimit !== undefined) quota.monthlyLimit = Number(monthlyLimit);
    if (rateLimitPerMinute !== undefined) quota.rateLimitPerMinute = Number(rateLimitPerMinute);

    org.email_quota = quota;
    org.emailQuota = quota;
    await org.save();

    res.json({
      success: true,
      message: 'Workspace email quota updated successfully',
      organizationId: String(org._id),
      emailQuota: quota
    });
  } catch (err) {
    next(err);
  }
};
