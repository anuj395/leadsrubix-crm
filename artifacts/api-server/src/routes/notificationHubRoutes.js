const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { permitAtLeast, permit } = require('../middlewares/rbac');
const { getVisibleUserIds } = require('../services/userHierarchyService');
const {
  STANDARD_EVENTS,
  DEFAULT_MATRIX_RULES,
  MERGE_TAGS,
  getIndustryTemplates
} = require('../services/notificationDefaults');
const {
  getRoutingMatrix,
  dispatchCrmEvent
} = require('../services/notificationDispatcherService');

const router = express.Router();

function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// In-memory rate limiting store for universal gateway test dispatches (Anti-Abuse Shield)
// Key: organizationId -> Array of timestamps within the past 60 minutes
const universalTestRateLimits = new Map();
const MAX_UNIVERSAL_TESTS_PER_HOUR = 5;

/**
 * Helper to resolve effective organizationId from user context or SuperAdmin query
 */
function resolveOrgId(req) {
  if (req.user?.role === 'superAdmin' && (req.query.organizationId || req.body?.organizationId || req.headers['x-organization-id'])) {
    const raw = req.query.organizationId || req.body?.organizationId || req.headers['x-organization-id'];
    return raw === 'all' || raw === 'universal' || raw === 'global' ? null : raw;
  }
  return req.user?.organization_id || req.user?.organizationId || null;
}

/**
 * GET /api/notifications/matrix
 * Returns current event routing matrix rules for the workspace
 */
router.get('/matrix', authenticate, async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    const matrix = await getRoutingMatrix(orgId);
    return res.json({
      success: true,
      organizationId: orgId,
      events: STANDARD_EVENTS.map(ev => ({
        ...ev,
        key: ev.event_key,
        name: ev.event_label
      })),
      mergeTags: MERGE_TAGS,
      matrix
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in GET /matrix:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/matrix
 * Saves or updates matrix rules for an organization
 */
router.post('/matrix', authenticate, permitAtLeast('admin'), async (req, res) => {
  try {
    const NotificationMatrixRule = mongoose.model('NotificationMatrixRule');
    const orgId = resolveOrgId(req);
    const { rules, rule } = req.body;

    const rulesToProcess = Array.isArray(rules) ? rules : (rule ? [rule] : []);
    if (rulesToProcess.length === 0) {
      return res.status(400).json({ success: false, message: 'No rules provided to save.' });
    }

    const updated = [];
    for (const r of rulesToProcess) {
      const eventKey = r.eventKey || r.event_key;
      if (!eventKey) continue;

      const filter = {
        organization_id: orgId,
        event_key: eventKey
      };

      const updateData = {
        event_label: r.eventLabel || r.event_label || '',
        is_enabled: r.isEnabled !== undefined ? Boolean(r.isEnabled) : (r.is_enabled !== undefined ? Boolean(r.is_enabled) : true),
        routing: r.routing || {}
      };

      const saved = await NotificationMatrixRule.findOneAndUpdate(
        filter,
        { $set: updateData },
        { upsert: true, new: true }
      ).lean();

      updated.push(saved);
    }

    return res.json({
      success: true,
      message: 'Notification routing matrix updated successfully.',
      totalUpdated: updated.length
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in POST /matrix:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/notifications/templates
 * Fetches notification templates merged with industry defaults
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const NotificationTemplate = mongoose.model('NotificationTemplate');
    const Organization = mongoose.model('Organization');
    const orgId = resolveOrgId(req);
    const channelFilter = req.query.channel;
    const eventFilter = req.query.eventKey || req.query.event_key;

    // Resolve workspace industryId (support explicit query override)
    let industryId = req.query.industryId || req.query.industry_id;
    if (!industryId && orgId) {
      const org = await Organization.findOne({
        $or: [{ organization_id: orgId }, { organizationId: orgId }]
      }).lean().exec();
      if (org) industryId = org.industry_id || org.industryId || 'temp0001';
    }
    industryId = industryId || 'temp0001';

    const industryDefaults = getIndustryTemplates(industryId);
    const customTemplates = await NotificationTemplate.find({
      $or: [{ organization_id: orgId }, { organization_id: null }]
    }).lean().exec();

    // Map all standard templates with overrides
    const result = [];
    for (const def of industryDefaults) {
      if (channelFilter && def.channel !== channelFilter) continue;
      if (eventFilter && def.event_key !== eventFilter) continue;

      const tenantCustom = customTemplates.find(t => t.organization_id === orgId && t.event_key === def.event_key && t.channel === def.channel && (!t.industry_id || t.industry_id === industryId));
      const platformCustom = customTemplates.find(t => !t.organization_id && t.event_key === def.event_key && t.channel === def.channel && (!t.industry_id || t.industry_id === industryId));

      const effective = tenantCustom || platformCustom || def;

      const sub = effective.subject_template || effective.subjectTemplate || def.subject_template || '';
      const bod = effective.body_template || effective.bodyTemplate || def.body_template || '';

      result.push({
        _id: effective._id || null,
        organizationId: tenantCustom ? orgId : null,
        isCustomized: Boolean(tenantCustom),
        industryId,
        eventKey: def.event_key,
        channel: def.channel,
        name: effective.name || def.name,
        subjectTemplate: sub,
        bodyTemplate: bod,
        subject: sub,
        body: bod,
        ctaLabel: effective.cta_label || effective.ctaLabel || def.cta_label || '',
        ctaUrlTemplate: effective.cta_url_template || effective.ctaUrlTemplate || def.cta_url_template || '',
        isActive: effective.is_active !== undefined ? effective.is_active : true
      });
    }

    return res.json({
      success: true,
      organizationId: orgId,
      industryId,
      templates: result
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in GET /templates:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/templates
 * Saves or updates a customized template for the organization
 */
router.post('/templates', authenticate, permitAtLeast('admin'), async (req, res) => {
  try {
    const NotificationTemplate = mongoose.model('NotificationTemplate');
    const orgId = resolveOrgId(req);
    const eventKey = req.body.eventKey || req.body.event_key;
    const channel = req.body.channel;
    const name = req.body.name || '';
    const subjectTemplate = req.body.subjectTemplate || req.body.subject || '';
    const bodyTemplate = req.body.bodyTemplate || req.body.body;
    const ctaLabel = req.body.ctaLabel || req.body.cta_label || '';
    const ctaUrlTemplate = req.body.ctaUrlTemplate || req.body.cta_url_template || '';
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : (req.body.is_active !== undefined ? Boolean(req.body.is_active) : true);
    const industryId = req.body.industryId || req.body.industry_id || 'temp0001';

    if (!eventKey || !channel || !bodyTemplate) {
      return res.status(400).json({
        success: false,
        message: 'eventKey, channel, and bodyTemplate are required.'
      });
    }

    // Role-based isolation: client admin can only save for their own workspace
    const targetOrgId = req.user.role === 'superAdmin'
      ? (req.body.isPlatformDefault || req.body.organizationId === null ? null : (req.body.organizationId || orgId))
      : orgId;

    const filter = {
      organization_id: targetOrgId,
      event_key: eventKey,
      channel
    };

    const update = {
      industry_id: industryId,
      name,
      subject_template: subjectTemplate,
      body_template: bodyTemplate,
      cta_label: ctaLabel,
      cta_url_template: ctaUrlTemplate,
      is_active: isActive
    };

    const saved = await NotificationTemplate.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return res.json({
      success: true,
      message: `Template for ${eventKey} (${channel}) saved successfully for workspace.`,
      template: saved
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in POST /templates:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/templates/reset
 * Resets an event template to the industry vertical default standard
 */
router.post('/templates/reset', authenticate, permitAtLeast('admin'), async (req, res) => {
  try {
    const NotificationTemplate = mongoose.model('NotificationTemplate');
    const Organization = mongoose.model('Organization');
    const orgId = resolveOrgId(req);
    const eventKey = req.body.eventKey || req.body.event_key;
    const channel = req.body.channel;

    let industryId = req.body.industryId || req.body.industry_id;
    if (!industryId && orgId) {
      const org = await Organization.findOne({
        $or: [{ organization_id: orgId }, { organizationId: orgId }]
      }).lean().exec();
      if (org) industryId = org.industry_id || org.industryId;
    }
    industryId = industryId || 'temp0001';

    // Role-based isolation: Client admin resets their tenant override
    const targetOrgId = req.user.role === 'superAdmin'
      ? (req.body.isPlatformDefault || req.body.organizationId === null ? null : (req.body.organizationId || orgId))
      : orgId;

    const deleteFilter = { organization_id: targetOrgId };
    if (eventKey) deleteFilter.event_key = eventKey;
    if (channel) deleteFilter.channel = channel;

    await NotificationTemplate.deleteMany(deleteFilter);

    const industryDefaults = getIndustryTemplates(industryId);
    const restored = industryDefaults.filter(t => (!eventKey || t.event_key === eventKey) && (!channel || t.channel === channel));

    return res.json({
      success: true,
      message: 'Templates reset to industry vertical standard successfully.',
      industryId,
      templates: restored
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in POST /templates/reset:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Helper to fetch or initialize System-Wide Master Controls (Global Kill Switch)
 */
async function getSystemMasterGatewayControls() {
  try {
    const SystemGatewayControl = mongoose.model('SystemGatewayControl');
    let controls = await SystemGatewayControl.findOne({ key: 'global_master_controls' }).lean().exec();
    if (!controls) {
      controls = await SystemGatewayControl.create({
        key: 'global_master_controls',
        whatsapp_enabled: true,
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true
      });
    }
    return {
      whatsapp: controls.whatsapp_enabled !== false && controls.whatsappEnabled !== false,
      email: controls.email_enabled !== false && controls.emailEnabled !== false,
      push: controls.push_enabled !== false && controls.pushEnabled !== false,
      in_app: controls.in_app_enabled !== false && controls.inAppEnabled !== false
    };
  } catch (err) {
    console.warn('[getSystemMasterGatewayControls] Fallback:', err.message);
    return { whatsapp: true, email: true, push: true, in_app: true };
  }
}

/**
 * GET /api/notifications/gateways/status
 * Returns 2-tier gateway status:
 * - masterControls: System-wide master kill switches (all workspaces)
 * - workspaceControls: Current workspace gateway enablement
 * - isSuperAdmin: boolean
 */
router.get('/gateways/status', authenticate, async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    const isSuperAdmin = req.user?.role === 'superAdmin';
    const Organization = mongoose.model('Organization');
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');

    const masterControls = await getSystemMasterGatewayControls();

    let orgDoc = null;
    let waDoc = null;

    if (orgId) {
      orgDoc = await Organization.findOne({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId },
          ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
        ]
      }).lean().exec();

      const targetOrgIds = [orgId, orgDoc?._id ? String(orgDoc._id) : null, orgDoc?.organization_id, orgDoc?.organizationId].filter(Boolean);

      if (targetOrgIds.length > 0) {
        waDoc = await WhatsAppConfig.findOne({
          $or: [
            { organization_id: { $in: targetOrgIds } },
            { organizationId: { $in: targetOrgIds } }
          ]
        }).lean().exec();
      }
    } else if (isSuperAdmin) {
      waDoc = await WhatsAppConfig.findOne({
        $or: [{ organization_id: null }, { organizationId: null }]
      }).lean().exec();
    }

    const hasValidToken = (val) => Boolean(val && String(val).trim().length > 0);
    const hasCustomWaGateway = Boolean(
      (waDoc?.wapi?.active && hasValidToken(waDoc?.wapi?.wapi_token)) ||
      (waDoc?.simply?.active && hasValidToken(waDoc?.simply?.access_token)) ||
      ((waDoc?.chat_simplified?.active || waDoc?.chatSimplified?.active) && hasValidToken(waDoc?.chat_simplified?.api_key || waDoc?.chatSimplified?.apiKey))
    );

    const workspaceControls = {
      whatsapp: Boolean(
        (orgDoc?.whatsapp_enabled !== false && orgDoc?.whatsappEnabled !== false) &&
        (!waDoc || (waDoc.is_active !== false && waDoc.isActive !== false && waDoc.is_enabled !== false))
      ),
      email: Boolean(
        (orgDoc?.email_enabled !== false && orgDoc?.emailEnabled !== false) &&
        (!orgDoc?.smtp_config || orgDoc?.smtp_config?.isActive !== false) &&
        (!orgDoc?.smtpConfig || orgDoc?.smtpConfig?.isActive !== false)
      ),
      push: Boolean(orgDoc?.push_enabled !== false && orgDoc?.pushEnabled !== false),
      in_app: Boolean(orgDoc?.in_app_enabled !== false && orgDoc?.inAppEnabled !== false),
      hasCustomWaGateway
    };

    return res.json({
      success: true,
      isSuperAdmin,
      organizationId: orgId,
      masterControls,
      workspaceControls
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in /gateways/status:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/gateways/master-toggle
 * SuperAdmin-only Master Kill Switch across all workspaces
 */
router.post('/gateways/master-toggle', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'superAdmin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only SuperAdmins can modify System-Wide Master Controls.' });
    }

    const { channel, isEnabled } = req.body;
    if (!channel || typeof isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'channel and isEnabled (boolean) are required.' });
    }

    const channelFieldMap = {
      whatsapp: 'whatsapp_enabled',
      email: 'email_enabled',
      push: 'push_enabled',
      in_app: 'in_app_enabled'
    };

    const fieldName = channelFieldMap[channel];
    if (!fieldName) {
      return res.status(400).json({ success: false, message: `Invalid channel: ${channel}` });
    }

    const SystemGatewayControl = mongoose.model('SystemGatewayControl');
    const updated = await SystemGatewayControl.findOneAndUpdate(
      { key: 'global_master_controls' },
      { $set: { [fieldName]: isEnabled } },
      { upsert: true, new: true }
    ).lean();

    return res.json({
      success: true,
      message: `Global Master Control for ${channel.toUpperCase()} is now ${isEnabled ? 'ACTIVE (All Workspaces)' : 'HALTED (All Workspaces)'}.`,
      masterControls: {
        whatsapp: updated.whatsapp_enabled !== false,
        email: updated.email_enabled !== false,
        push: updated.push_enabled !== false,
        in_app: updated.in_app_enabled !== false
      }
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in /gateways/master-toggle:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/gateways/workspace-toggle
 * Fast atomic toggle for a workspace's gateway (Client Admin & SuperAdmin)
 */
router.post('/gateways/workspace-toggle', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only admins can configure workspace gateways.' });
    }

    const { channel, isEnabled, organizationId: paramOrgId } = req.body;
    if (!channel || typeof isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'channel and isEnabled (boolean) are required.' });
    }

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      orgId = paramOrgId || req.headers['x-organization-id'] || null;
    } else {
      orgId = req.user.organizationId || req.user.organization_id || null;
    }

    const Organization = mongoose.model('Organization');
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');

    const org = orgId ? await Organization.findOne({
      $or: [
        { organization_id: orgId },
        { organizationId: orgId },
        ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
      ]
    }).lean().exec() : null;

    const targetOrgIds = [orgId, org?._id ? String(org._id) : null, org?.organization_id, org?.organizationId].filter(Boolean);

    if (channel === 'whatsapp') {
      if (targetOrgIds.length > 0) {
        await Organization.updateMany(
          {
            $or: [
              { organization_id: { $in: targetOrgIds } },
              { organizationId: { $in: targetOrgIds } },
              ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
            ]
          },
          { $set: { whatsapp_enabled: isEnabled, whatsappEnabled: isEnabled } }
        ).exec();
      }

      let config = null;
      if (targetOrgIds.length > 0) {
        config = await WhatsAppConfig.findOne({
          $or: [
            { organization_id: { $in: targetOrgIds } },
            { organizationId: { $in: targetOrgIds } }
          ]
        }).exec();
      } else {
        config = await WhatsAppConfig.findOne({
          $or: [{ organization_id: null }, { organizationId: null }]
        }).exec();
      }

      if (!config) {
        config = new WhatsAppConfig({
          organization_id: org?.organization_id || orgId || null,
          organizationId: org?.organizationId || orgId || null,
          is_universal: !orgId,
          is_active: isEnabled,
          isActive: isEnabled,
          is_enabled: isEnabled
        });
      } else {
        config.is_active = isEnabled;
        config.isActive = isEnabled;
        config.is_enabled = isEnabled;
      }
      await config.save();
    } else if (channel === 'email') {
      if (targetOrgIds.length > 0) {
        await Organization.updateMany(
          {
            $or: [
              { organization_id: { $in: targetOrgIds } },
              { organizationId: { $in: targetOrgIds } },
              ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
            ]
          },
          { $set: { email_enabled: isEnabled, emailEnabled: isEnabled, 'smtp_config.isActive': isEnabled } }
        ).exec();
      }
    } else if (channel === 'push') {
      if (targetOrgIds.length > 0) {
        await Organization.updateMany(
          {
            $or: [
              { organization_id: { $in: targetOrgIds } },
              { organizationId: { $in: targetOrgIds } },
              ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
            ]
          },
          { $set: { push_enabled: isEnabled, pushEnabled: isEnabled } }
        ).exec();
      }
    } else if (channel === 'in_app') {
      if (targetOrgIds.length > 0) {
        await Organization.updateMany(
          {
            $or: [
              { organization_id: { $in: targetOrgIds } },
              { organizationId: { $in: targetOrgIds } },
              ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
            ]
          },
          { $set: { in_app_enabled: isEnabled, inAppEnabled: isEnabled } }
        ).exec();
      }
    }

    return res.json({
      success: true,
      message: `${channel.toUpperCase()} Gateway is now ${isEnabled ? 'ACTIVE' : 'DISABLED'} for this workspace.`,
      channel,
      isEnabled
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in /gateways/workspace-toggle:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/notifications/logs
 * Unified paginated cross-channel delivery audit logs with role-based scoping:
 * - superAdmin: Global visibility across all workspaces
 * - admin: Workspace-wide visibility
 * - teamLead / leadManager: Supervisory visibility for self + team members
 * - sales: Frontline visibility for personal alerts only
 */
router.get('/logs', authenticate, async (req, res) => {
  try {
    const NotificationLog = mongoose.model('NotificationLog');
    const orgId = resolveOrgId(req);
    const userRole = req.user?.role;
    const userId = req.user?.id ? String(req.user.id) : null;
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;
    const userPhone = req.user?.contactNumber || req.user?.contact_number || req.user?.phone || null;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const andClauses = [];

    // 1. Role-based scoping & multi-tenant isolation
    if (userRole === 'superAdmin') {
      if (orgId) {
        andClauses.push({
          $or: [
            { organization_id: orgId },
            { organizationId: orgId },
            { organization_id: 'default' },
            { organization_id: null }
          ]
        });
      }
      // If superAdmin and no orgId specified, global visibility across all workspaces
    } else if (userRole === 'admin') {
      if (orgId) {
        andClauses.push({
          $or: [
            { organization_id: orgId },
            { organizationId: orgId },
            { organization_id: 'default' },
            { organization_id: null }
          ]
        });
      }
    } else if (userRole === 'teamLead' || userRole === 'leadManager') {
      if (orgId) {
        andClauses.push({
          $or: [
            { organization_id: orgId },
            { organizationId: orgId },
            { organization_id: 'default' },
            { organization_id: null }
          ]
        });
      }
      try {
        const visibleIds = await getVisibleUserIds(req.user);
        const User = mongoose.model('User');
        const teamUsers = await User.find({ _id: { $in: visibleIds } }).select('_id email contactNumber contact_number phone').lean().exec();

        const allowedTargets = [];
        const allowedIds = (visibleIds || []).map(String);
        teamUsers.forEach(u => {
          if (u.email) allowedTargets.push(u.email.toLowerCase().trim());
          const ph = u.contactNumber || u.contact_number || u.phone;
          if (ph) allowedTargets.push(ph);
        });
        if (userEmail) allowedTargets.push(userEmail);
        if (userPhone) allowedTargets.push(userPhone);

        andClauses.push({
          $or: [
            { recipient_id: { $in: allowedIds } },
            { recipient_target: { $in: allowedTargets } },
            { recipient_role: { $in: ['team_lead', 'agent', 'sales', 'telecaller'] } }
          ]
        });
      } catch (hierErr) {
        console.warn('[NotificationHubRoutes] Failed to resolve team hierarchy in logs:', hierErr.message);
      }
    } else {
      // Sales Agent / Telecaller: strictly own alerts
      if (orgId) {
        andClauses.push({
          $or: [
            { organization_id: orgId },
            { organizationId: orgId },
            { organization_id: 'default' },
            { organization_id: null }
          ]
        });
      }
      const selfTargets = [];
      if (userEmail) selfTargets.push(userEmail);
      if (userPhone) selfTargets.push(userPhone);

      andClauses.push({
        $or: [
          ...(userId ? [{ recipient_id: userId }] : []),
          ...(selfTargets.length > 0 ? [{ recipient_target: { $in: selfTargets } }] : []),
          { recipient_target: new RegExp(escapeRegex(userEmail || userId || '___none___'), 'i') }
        ]
      });
    }

    // 2. Query filters
    if (req.query.channel && req.query.channel !== 'all') {
      andClauses.push({ channel: req.query.channel.toLowerCase().trim() });
    }

    if (req.query.status && req.query.status !== 'all') {
      const st = req.query.status.toUpperCase().trim();
      if (st === 'DELIVERED' || st === 'SUCCESS') {
        andClauses.push({ status: { $in: ['SUCCESS', 'DELIVERED', 'SENT'] } });
      } else if (st === 'SENT') {
        andClauses.push({ status: { $in: ['SENT', 'SUCCESS', 'DELIVERED'] } });
      } else if (st === 'FAILED') {
        andClauses.push({ status: 'FAILED' });
      } else if (st === 'SUPPRESSED') {
        andClauses.push({ status: 'SUPPRESSED' });
      } else if (st === 'QUEUED') {
        andClauses.push({ status: 'QUEUED' });
      } else {
        andClauses.push({ status: st });
      }
    }

    if (req.query.eventKey && req.query.eventKey !== 'all') {
      andClauses.push({ event_key: req.query.eventKey.trim() });
    }

    if (req.query.recipientRole && req.query.recipientRole !== 'all') {
      const role = req.query.recipientRole.trim().toLowerCase();
      if (role === 'agent' || role === 'assigned_agent') {
        andClauses.push({ recipient_role: { $in: ['agent', 'assigned_agent'] } });
      } else if (role === 'admin' || role === 'org_admin') {
        andClauses.push({ recipient_role: { $in: ['admin', 'org_admin'] } });
      } else {
        andClauses.push({ recipient_role: role });
      }
    }

    if (req.query.search && String(req.query.search).trim().length > 0) {
      const searchRegex = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      andClauses.push({
        $or: [
          { recipient_name: searchRegex },
          { recipient_target: searchRegex },
          { message_body: searchRegex },
          { title: searchRegex },
          { event_key: searchRegex },
          { channel: searchRegex }
        ]
      });
    }

    const query = andClauses.length > 0 ? { $and: andClauses } : {};

    const [logs, total] = await Promise.all([
      NotificationLog.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      NotificationLog.countDocuments(query).exec()
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      logs: logs.map(l => ({
        id: String(l._id),
        _id: String(l._id),
        organizationId: l.organization_id,
        organization_id: l.organization_id,
        eventKey: l.event_key,
        event_key: l.event_key,
        channel: l.channel,
        recipientRole: l.recipient_role,
        recipient_role: l.recipient_role,
        recipient_type: l.recipient_role,
        recipientType: l.recipient_role,
        recipientName: l.recipient_name,
        recipient_name: l.recipient_name,
        recipientId: l.recipient_id,
        recipient_id: l.recipient_id,
        recipientTarget: l.recipient_target,
        recipient_target: l.recipient_target,
        recipientContact: l.recipient_target,
        recipient_contact: l.recipient_target,
        provider: l.provider,
        isUniversal: l.is_universal,
        is_universal: l.is_universal,
        status: String(l.status || 'queued').toLowerCase(),
        rawStatus: l.status,
        title: l.title,
        messageBody: l.message_body,
        message_body: l.message_body,
        errorMessage: l.error_message,
        error_message: l.error_message,
        latencyMs: l.latency_ms,
        latency_ms: l.latency_ms,
        createdAt: l.created_at || l.createdAt,
        created_at: l.created_at || l.createdAt
      }))
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in GET /logs:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/notifications/my-preferences
 * Returns personal channel preferences for the current logged-in user
 */
router.get('/my-preferences', authenticate, async (req, res) => {
  try {
    const NotificationSetting = mongoose.model('NotificationSetting');
    const orgId = resolveOrgId(req);
    const userId = String(req.user.id || req.user._id);

    const settings = await NotificationSetting.find({
      organization_id: orgId,
      user_id: userId
    }).lean().exec();

    // Default personal preferences
    const defaultPrefs = {
      lead_assigned: {
        whatsapp: true,
        push: true,
        email: true,
        in_app: true,
        label: 'New Lead Assigned to You',
        description: 'Instant notification when an inbound lead or inquiry is assigned to your queue'
      },
      task_due: {
        whatsapp: true,
        push: true,
        email: true,
        in_app: true,
        label: 'Follow-up & Callback Reminders',
        description: 'Timely reminders for scheduled follow-ups, pending tasks, and scheduled callbacks'
      },
      deal_update: {
        whatsapp: false,
        push: true,
        email: true,
        in_app: true,
        label: 'Deal Pipeline Updates',
        description: 'Updates when a deal assigned to you changes stage, is won, or requires review'
      },
      customer_message: {
        whatsapp: true,
        push: true,
        email: false,
        in_app: true,
        label: 'Inbound Customer Responses',
        description: 'Alerts when a prospect replies to your WhatsApp messages or inbound inquiries'
      }
    };

    // Merge saved user overrides
    settings.forEach(s => {
      const parts = (s.notification_type || '').split('_');
      if (parts[0] === 'personal' && parts.length >= 3) {
        const ch = parts[parts.length - 1];
        const category = parts.slice(1, -1).join('_');
        if (defaultPrefs[category] && defaultPrefs[category][ch] !== undefined) {
          defaultPrefs[category][ch] = Boolean(s.is_enabled);
        }
      }
    });

    return res.json({
      success: true,
      user: {
        id: userId,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.contactNumber || req.user.phone || '',
        role: req.user.role
      },
      preferences: defaultPrefs
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in GET /my-preferences:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/my-preferences
 * Updates personal channel preferences for the current logged-in user
 */
router.post('/my-preferences', authenticate, async (req, res) => {
  try {
    const NotificationSetting = mongoose.model('NotificationSetting');
    const orgId = resolveOrgId(req);
    const userId = String(req.user.id || req.user._id);
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid preferences object.' });
    }

    const updates = [];
    for (const [category, channels] of Object.entries(preferences)) {
      if (typeof channels !== 'object' || !channels) continue;
      for (const [ch, isEnabled] of Object.entries(channels)) {
        if (['whatsapp', 'push', 'email', 'in_app'].includes(ch)) {
          const notificationType = `personal_${category}_${ch}`;
          updates.push(
            NotificationSetting.findOneAndUpdate(
              {
                organization_id: orgId,
                user_id: userId,
                notification_type: notificationType
              },
              { $set: { is_enabled: Boolean(isEnabled) } },
              { upsert: true, new: true }
            )
          );
        }
      }
    }

    await Promise.all(updates);

    return res.json({
      success: true,
      message: 'Personal alert preferences saved successfully.'
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in POST /my-preferences:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/my-test-alert
 * Dispatches a quick test notification to the logged-in agent's own phone / email / bell
 */
router.post('/my-test-alert', authenticate, async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    const channel = req.body.channel || 'whatsapp';
    const userId = String(req.user.id || req.user._id);
    const userRole = req.user.role || 'sales';
    const userName = req.user.name || 'Sales Representative';
    const userEmail = req.user.email;
    const rawPhone = req.user.contactNumber || req.user.contact_number || req.user.phone || '';

    const whatsappService = require('../services/whatsappService');
    const mailer = require('../utils/mailer');
    const NotificationLog = mongoose.model('NotificationLog');
    const Notification = mongoose.model('Notification');

    const testMessage = `🎯 Leads Rubix Personal Alert Test: Omnichannel alert channel (${channel.toUpperCase()}) is fully active for ${userName}!`;
    let target = '';
    let status = 'SUCCESS';
    let errorMessage = '';

    if (channel === 'whatsapp') {
      target = whatsappService.normalizePhoneNumber(rawPhone);
      if (!target) {
        return res.status(400).json({
          success: false,
          message: 'No valid phone number found on your user profile. Please update your profile contact number first.'
        });
      }
      const waRes = await whatsappService.sendDirectWhatsAppMessage({
        organizationId: orgId,
        phone: target,
        name: userName,
        role: userRole,
        eventType: 'lead.assigned',
        messageBody: testMessage
      });
      if (!waRes || waRes.success === false) {
        status = 'FAILED';
        errorMessage = waRes?.message || waRes?.error || 'WhatsApp message dispatch failed';
      }
    } else if (channel === 'email') {
      target = userEmail;
      if (!target || !target.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'No valid email address found on your profile.'
        });
      }
      const emailRes = await mailer.sendDynamicEmail({
        toEmail: target,
        subject: '🎯 Leads Rubix Personal Alert Test',
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 16px;"><p>${testMessage}</p></div>`,
        organizationId: orgId
      });
      if (!emailRes || emailRes.success === false) {
        status = 'FAILED';
        errorMessage = emailRes?.error || 'Email dispatch failed';
      }
    } else if (channel === 'in_app') {
      target = userId;
      await Notification.create({
        user_id: userId,
        organization_id: String(orgId),
        title: '🎯 Personal Test Alert',
        message: testMessage,
        type: 'test.personal',
        is_read: false
      });
    }

    await NotificationLog.create({
      organization_id: String(orgId || 'default'),
      event_key: 'test.personal',
      channel,
      recipient_role: userRole,
      recipient_name: userName,
      recipient_id: userId,
      recipient_target: target || userId,
      provider: channel === 'whatsapp' ? 'whatsapp_gateway' : (channel === 'email' ? 'smtp' : 'in_app'),
      is_universal: true,
      status,
      title: 'Personal Test Alert',
      message_body: testMessage,
      error_message: errorMessage,
      latency_ms: 45
    }).catch(() => {});

    if (status === 'FAILED') {
      return res.status(500).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      message: `Test alert dispatched successfully via ${channel.toUpperCase()} to ${target || userName}!`,
      channel,
      target
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in POST /my-test-alert:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/test-dispatch
 * Dispatches a diagnostic test message across a selected channel (Guarded for Admins/SuperAdmins)
 */
router.post('/test-dispatch', authenticate, async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    const { channel, recipientTarget, recipientName, messageContent, eventKey } = req.body;
    const userRole = req.user?.role;
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const userPhone = String(req.user?.contactNumber || req.user?.contact_number || req.user?.phone || '').replace(/[^\d+]/g, '');

    if (!channel || !recipientTarget) {
      return res.status(400).json({ success: false, message: 'channel and recipientTarget are required.' });
    }

    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');
    const User = mongoose.model('User');
    const Contact = mongoose.model('Contact');

    // Determine if organization is using a custom gateway or the shared universal gateway
    let hasCustomGateway = false;
    if (channel === 'whatsapp') {
      const waConfig = await WhatsAppConfig.findOne({
        $or: [{ organization_id: orgId }, { organizationId: orgId }]
      }).lean().exec();
      if (waConfig) {
        const hasValidToken = (val) => Boolean(val && String(val).trim().length > 0 && !String(val).includes('undefined') && !String(val).includes('null'));
        const wapiToken = (waConfig.wapi?.wapi_token || waConfig.wapi?.wapiToken || waConfig.fields?.wapiToken || waConfig.wapiToken || '').trim();
        const simplyToken = (waConfig.simply?.access_token || waConfig.simply?.accessToken || waConfig.fields?.accessToken || waConfig.accessToken || '').trim();
        const csKey = (waConfig.chat_simplified?.api_key || waConfig.chatSimplified?.apiKey || waConfig.chat_simplified?.apiKey || waConfig.chatSimplified?.api_key || waConfig.fields?.apiKey || waConfig.apiKey || '').trim();

        const isWapiActive = waConfig.wapi?.active !== false;
        const isSimplyActive = waConfig.simply?.active !== false;
        const isCsActive = waConfig.chat_simplified?.active !== false && waConfig.chatSimplified?.active !== false;

        hasCustomGateway = Boolean(
          (hasValidToken(wapiToken) && isWapiActive) ||
          (hasValidToken(simplyToken) && isSimplyActive) ||
          (hasValidToken(csKey) && isCsActive)
        );
      }
    } else if (channel === 'email') {
      const org = await Organization.findOne({
        $or: [{ organization_id: orgId }, { organizationId: orgId }]
      }).lean().exec();
      hasCustomGateway = Boolean(org?.smtp_config?.useCustomSmtp && org?.smtp_config?.smtpPass);
    }

    // Anti-Leakage & Quota Shield for Universal Platform Gateway
    if (!hasCustomGateway && userRole !== 'superAdmin') {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const rateLimitKey = String(orgId || req.user?.id || 'default');
      const timestamps = (universalTestRateLimits.get(rateLimitKey) || []).filter(t => t > oneHourAgo);

      if (timestamps.length >= MAX_UNIVERSAL_TESTS_PER_HOUR) {
        return res.status(429).json({
          success: false,
          message: `Hourly platform test limit reached (${MAX_UNIVERSAL_TESTS_PER_HOUR}/hour). To protect shared platform resources, please wait before dispatching more test alerts or connect your custom gateway.`
        });
      }

      // Recipient Whitelisting: Must be self, team member, or existing CRM lead
      const cleanTarget = String(recipientTarget).trim();
      const cleanTargetPhone = cleanTarget.replace(/[^\d+]/g, '');
      const isTargetingSelf =
        (channel === 'email' && cleanTarget.toLowerCase() === userEmail) ||
        (channel === 'whatsapp' && userPhone && (cleanTargetPhone.endsWith(userPhone.slice(-10)) || userPhone.endsWith(cleanTargetPhone.slice(-10))));

      if (!isTargetingSelf) {
        let isAuthorizedRecipient = false;

        // Check if recipient is a team member in this organization
        if (orgId) {
          const teamUser = await User.findOne({
            $or: [{ organization_id: orgId }, { organizationId: orgId }],
            $or: [
              { email: { $regex: new RegExp(`^${escapeRegex(cleanTarget)}$`, 'i') } },
              ...(cleanTargetPhone.length >= 7 ? [
                { contactNumber: { $regex: escapeRegex(cleanTargetPhone.slice(-10)) } },
                { phone: { $regex: escapeRegex(cleanTargetPhone.slice(-10)) } }
              ] : [])
            ]
          }).lean().exec();

          if (teamUser) {
            isAuthorizedRecipient = true;
          } else {
            // Check if recipient is an existing contact/lead in this organization
            const contactLead = await Contact.findOne({
              $or: [{ organization_id: orgId }, { organizationId: orgId }],
              $or: [
                { email: { $regex: new RegExp(`^${escapeRegex(cleanTarget)}$`, 'i') } },
                ...(cleanTargetPhone.length >= 7 ? [
                  { phone: { $regex: escapeRegex(cleanTargetPhone.slice(-10)) } },
                  { contactNumber: { $regex: escapeRegex(cleanTargetPhone.slice(-10)) } }
                ] : [])
              ]
            }).lean().exec();

            if (contactLead) {
              isAuthorizedRecipient = true;
            }
          }
        }

        if (!isAuthorizedRecipient) {
          return res.status(403).json({
            success: false,
            message: 'To protect shared platform quota, test alerts via the universal platform gateway can only be sent to verified workspace team members or leads in your CRM. Connect your custom gateway in the Gateways tab to test arbitrary external numbers.'
          });
        }
      }

      // Record rate limit consumption
      timestamps.push(now);
      universalTestRateLimits.set(rateLimitKey, timestamps);
    }

    const whatsappService = require('../services/whatsappService');
    const mailer = require('../utils/mailer');
    const awsSnsService = require('../services/awsSnsService');
    const NotificationLog = mongoose.model('NotificationLog');

    const testMessage = messageContent || `🚀 Leads Rubix CRM Diagnostic Test: Omnichannel Notification Engine is fully operational for ${channel.toUpperCase()}!`;
    let status = 'SUCCESS';
    let errorMessage = '';
    let providerName = 'system_platform';
    let messageId = '';

    if (channel === 'whatsapp') {
      providerName = 'whatsapp_gateway';
      const waRes = await whatsappService.sendDirectWhatsAppMessage({
        organizationId: orgId,
        phone: recipientTarget,
        name: recipientName || 'Test Recipient',
        role: 'custom',
        eventType: eventKey || 'test.diagnostic',
        messageBody: testMessage
      });
      if (!waRes || waRes.success === false) {
        status = 'FAILED';
        errorMessage = waRes?.errorMessage || waRes?.message || waRes?.error || (typeof waRes?.recipients?.[0]?.error === 'string' ? waRes.recipients[0].error : null) || 'WhatsApp diagnostic failed';
      }
    } else if (channel === 'email') {
      const emailRes = await mailer.sendDynamicEmail({
        toEmail: recipientTarget,
        subject: '🚀 Leads Rubix CRM Omnichannel Diagnostic Test',
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px;"><p>${testMessage}</p></div>`,
        organizationId: orgId
      });
      providerName = emailRes?.provider || 'AWS_SES';
      messageId = emailRes?.messageId || '';
      if (!emailRes || emailRes.success === false) {
        status = 'FAILED';
        errorMessage = emailRes?.error || 'Email diagnostic failed';
      }
    } else if (channel === 'push') {
      const isArn = String(recipientTarget).startsWith('arn:aws:sns:');
      providerName = isArn ? 'AWS_SNS' : 'EXPO_PUSH_RELAY';
      const pushRes = await awsSnsService.sendPushNotification({
        token: isArn ? null : recipientTarget,
        endpointArn: isArn ? recipientTarget : null,
        title: '🎯 Leads Rubix CRM Mobile Alert',
        message: testMessage,
        data: {
          eventKey: eventKey || 'test.diagnostic',
          type: 'diagnostic_test'
        }
      });
      messageId = pushRes?.messageId || pushRes?.expo?.id || `push-${Date.now()}`;
      if (!pushRes || pushRes.success === false) {
        status = 'FAILED';
        errorMessage = pushRes?.error || 'Mobile push diagnostic failed';
      }
    }

    await NotificationLog.create({
      organization_id: String(orgId || 'default'),
      event_key: eventKey || 'test.diagnostic',
      channel,
      recipient_role: 'custom',
      recipient_name: recipientName || 'Diagnostic Tester',
      recipient_id: req.user?.id ? String(req.user.id) : null,
      recipient_target: recipientTarget,
      provider: providerName,
      is_universal: true,
      status,
      title: 'Diagnostic Test',
      message_body: testMessage,
      error_message: errorMessage,
      latency_ms: 50
    }).catch(() => {});

    if (status === 'FAILED') {
      return res.status(500).json({ success: false, message: errorMessage, error: errorMessage, provider: providerName });
    }

    return res.json({
      success: true,
      message: `Diagnostic test message sent successfully via ${channel.toUpperCase()}!`,
      status,
      provider: providerName,
      messageId,
      recipient: recipientTarget
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in /test-dispatch:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/notifications/test-crm-event
 * Simulates and dispatches a full CRM lifecycle event through the complete routing matrix,
 * recipient resolver, and omnichannel dispatchers (Push, In-App Bell, WhatsApp, Email).
 */
router.post('/test-crm-event', authenticate, async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    const { eventKey, entityData = {} } = req.body;
    if (!eventKey) {
      return res.status(400).json({ success: false, message: 'eventKey is required.' });
    }

    const userName = `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() || req.user?.name || 'Tester';
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const userPhone = String(req.user?.contactNumber || req.user?.contact_number || req.user?.phone || '').trim();
    const userId = req.user?.id || req.user?._id;

    const enrichedEntity = {
      _id: entityData._id || entityData.leadId || entityData.dealId || entityData.taskId || new mongoose.Types.ObjectId().toString(),
      name: entityData.name || entityData.leadName || entityData.contactName || userName,
      first_name: entityData.first_name || req.user?.first_name || 'Test',
      last_name: entityData.last_name || req.user?.last_name || 'Customer',
      email: entityData.email || userEmail || '',
      phone: entityData.phone || userPhone || '',
      contactNumber: entityData.contactNumber || entityData.phone || userPhone || '',
      company: entityData.company || '',
      stage: entityData.stage || entityData.leadStage || 'New',
      source: entityData.source || 'Website',
      title: entityData.title || entityData.dealTitle || entityData.taskTitle || 'Test Subject',
      deal_value: entityData.deal_value || entityData.dealValue || entityData.value || '0',
      dealValue: entityData.dealValue || entityData.deal_value || '0',
      due_date: entityData.due_date || entityData.dueDate || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      dueDate: entityData.dueDate || entityData.due_date || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      task_type: entityData.task_type || entityData.taskType || 'Callback',
      taskType: entityData.taskType || entityData.task_type || 'Callback',
      contactOwnerId: entityData.contactOwnerId || entityData.contact_owner_id || userId,
      contact_owner_id: entityData.contact_owner_id || entityData.contactOwnerId || userId,
      contactOwnerEmail: entityData.contactOwnerEmail || entityData.contact_owner_email || userEmail,
      contact_owner_email: entityData.contact_owner_email || entityData.contactOwnerEmail || userEmail,
      assignedTo: entityData.assignedTo || entityData.assigned_to || userName,
      assigned_to: entityData.assigned_to || entityData.assignedTo || userName,
      actorUser: entityData.actorUser || {
        id: userId,
        name: userName,
        email: userEmail
      },
      ...entityData
    };

    const dispatchResult = await dispatchCrmEvent({
      eventKey,
      organizationId: orgId,
      entityData: enrichedEntity,
      actorUser: enrichedEntity.actorUser
    });

    return res.json({
      success: true,
      eventKey,
      organizationId: orgId,
      result: dispatchResult
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in /test-crm-event:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
