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

      const tenantCustom = customTemplates.find(t => t.organization_id === orgId && t.event_key === def.event_key && t.channel === def.channel);
      const platformCustom = customTemplates.find(t => !t.organization_id && t.event_key === def.event_key && t.channel === def.channel);

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

    if (!eventKey || !channel || !bodyTemplate) {
      return res.status(400).json({
        success: false,
        message: 'eventKey, channel, and bodyTemplate are required.'
      });
    }

    const filter = {
      organization_id: orgId,
      event_key: eventKey,
      channel
    };

    const update = {
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
      message: `Template for ${eventKey} (${channel}) saved successfully.`,
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

    const deleteFilter = { organization_id: orgId };
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

    const query = {};

    // 1. Role-based scoping
    if (userRole === 'superAdmin') {
      if (orgId) {
        query.organization_id = orgId;
      }
    } else if (userRole === 'admin') {
      if (orgId) {
        query.organization_id = orgId;
      }
    } else if (userRole === 'teamLead' || userRole === 'leadManager') {
      if (orgId) {
        query.organization_id = orgId;
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

        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { recipient_id: { $in: allowedIds } },
            { recipient_target: { $in: allowedTargets } },
            { recipient_role: { $in: ['team_lead', 'agent'] } }
          ]
        });
      } catch (hierErr) {
        console.warn('[NotificationHubRoutes] Failed to resolve team hierarchy in logs:', hierErr.message);
      }
    } else {
      // Sales Agent: strictly own alerts
      if (orgId) {
        query.organization_id = orgId;
      }
      const selfTargets = [];
      if (userEmail) selfTargets.push(userEmail);
      if (userPhone) selfTargets.push(userPhone);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          ...(userId ? [{ recipient_id: userId }] : []),
          ...(selfTargets.length > 0 ? [{ recipient_target: { $in: selfTargets } }] : []),
          { recipient_target: new RegExp(escapeRegex(userEmail || userId || '___none___'), 'i') }
        ]
      });
    }

    // 2. Query filters
    if (req.query.channel && req.query.channel !== 'all') {
      query.channel = req.query.channel;
    }
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.eventKey && req.query.eventKey !== 'all') {
      query.event_key = req.query.eventKey;
    }
    if (req.query.recipientRole && req.query.recipientRole !== 'all') {
      query.recipient_role = req.query.recipientRole;
    }
    if (req.query.search && String(req.query.search).trim().length > 0) {
      const searchRegex = new RegExp(String(req.query.search).trim(), 'i');
      const searchCond = {
        $or: [
          { recipient_name: searchRegex },
          { recipient_target: searchRegex },
          { message_body: searchRegex },
          { title: searchRegex }
        ]
      };
      query.$and = query.$and || [];
      query.$and.push(searchCond);
    }

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
        organizationId: l.organization_id,
        eventKey: l.event_key,
        channel: l.channel,
        recipientRole: l.recipient_role,
        recipientName: l.recipient_name,
        recipientId: l.recipient_id,
        recipientTarget: l.recipient_target,
        provider: l.provider,
        isUniversal: l.is_universal,
        status: l.status,
        title: l.title,
        messageBody: l.message_body,
        errorMessage: l.error_message,
        latencyMs: l.latency_ms,
        createdAt: l.created_at || l.createdAt
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
    const userEmail = req.user?.email;
    const userPhone = req.user?.contactNumber || req.user?.contact_number || req.user?.phone;

    if (!channel || !recipientTarget) {
      return res.status(400).json({ success: false, message: 'channel and recipientTarget are required.' });
    }

    // Role-based security check for test dispatch
    if (userRole !== 'admin' && userRole !== 'superAdmin') {
      const isTargetingSelf =
        recipientTarget === userEmail ||
        recipientTarget === userPhone ||
        recipientTarget === String(req.user?.id);

      if (!isTargetingSelf) {
        return res.status(403).json({
          success: false,
          message: 'Non-admin users may only dispatch test notifications to their own verified email or phone number.'
        });
      }
    }

    const whatsappService = require('../services/whatsappService');
    const mailer = require('../utils/mailer');
    const NotificationLog = mongoose.model('NotificationLog');

    const testMessage = messageContent || `🚀 Leads Rubix CRM Diagnostic Test: Omnichannel Notification Engine is fully operational for ${channel.toUpperCase()}!`;
    let status = 'SUCCESS';
    let errorMessage = '';

    if (channel === 'whatsapp') {
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
        errorMessage = waRes?.message || waRes?.error || 'WhatsApp diagnostic failed';
      }
    } else if (channel === 'email') {
      const emailRes = await mailer.sendDynamicEmail({
        toEmail: recipientTarget,
        subject: '🚀 Leads Rubix CRM Omnichannel Diagnostic Test',
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px;"><p>${testMessage}</p></div>`,
        organizationId: orgId
      });
      if (!emailRes || emailRes.success === false) {
        status = 'FAILED';
        errorMessage = emailRes?.error || 'Email diagnostic failed';
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
      provider: channel === 'whatsapp' ? 'whatsapp_gateway' : 'smtp',
      is_universal: true,
      status,
      title: 'Diagnostic Test',
      message_body: testMessage,
      error_message: errorMessage,
      latency_ms: 50
    }).catch(() => {});

    if (status === 'FAILED') {
      return res.status(500).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      message: `Diagnostic test message sent successfully via ${channel.toUpperCase()}!`,
      status,
      recipient: recipientTarget
    });
  } catch (err) {
    console.error('[NotificationHubRoutes] Error in /test-dispatch:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
