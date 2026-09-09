const mongoose = require('mongoose');

function getModel(name, relativePath) {
  try {
    return mongoose.model(name);
  } catch (e) {
    require(relativePath);
    return mongoose.model(name);
  }
}

exports.getLogs = async (req, res, next) => {
  try {
    const PushLog = getModel('PushLog', '../models/pushLogModel');
    const role = req.user.role;
    const orgId = req.user.organization_id || req.user.organizationId;
    const { status, eventType, search, limit = 100, targetOrgId } = req.query;

    const filter = {};
    if (role !== 'superAdmin') {
      filter.organization_id = orgId;
    } else if (targetOrgId && targetOrgId !== 'all') {
      filter.organization_id = targetOrgId;
    }

    if (status && status !== 'all') filter.status = status;
    if (eventType && eventType !== 'all') filter.event_type = eventType;
    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { user_email: regex },
        { user_name: regex },
        { title: regex },
        { body: regex },
        { aws_message_id: regex }
      ];
    }

    const logs = await PushLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean()
      .exec();

    res.json(logs || []);
  } catch (err) {
    console.error('[pushNotificationController.getLogs] error:', err.message || err);
    res.json([]);
  }
};

exports.getTemplates = async (req, res, next) => {
  try {
    const PushTemplate = getModel('PushTemplate', '../models/pushTemplateModel');
    const orgId = req.user?.organization_id || req.user?.organizationId || null;

    let templates = [];
    try {
      templates = await PushTemplate.find({
        $or: [
          { organization_id: orgId },
          { organization_id: null }
        ]
      }).lean().exec();
    } catch (dbErr) {
      console.warn('[pushNotificationController.getTemplates] DB fetch warning:', dbErr.message);
    }

    // Default template fallbacks if none in DB
    const defaultTemplates = [
      {
        event_type: 'LEAD_ASSIGNED',
        title_template: '🎯 New Lead Assigned: {customer_name}',
        body_template: '{customer_name} ({lead_source}) was assigned to you by {assigned_by}.',
        is_active: true
      },
      {
        event_type: 'TASK_DUE',
        title_template: '⏰ Task Due Alert: {customer_name}',
        body_template: 'Follow-up task for {customer_name} is scheduled now.',
        is_active: true
      },
      {
        event_type: 'SYSTEM_ALERT',
        title_template: '🔔 System Alert',
        body_template: '{message}',
        is_active: true
      },
      {
        event_type: 'THIRD_PARTY_LEAD',
        title_template: '📥 New Inbound Lead: {customer_name}',
        body_template: 'New lead received via {lead_source} integration for project {project_name}.',
        is_active: true
      },
      {
        event_type: 'LEAD_TRANSFERRED',
        title_template: '🔄 Lead Transferred: {customer_name}',
        body_template: '{customer_name} was transferred to you by {assigned_by}.',
        is_active: true
      }
    ];

    const merged = defaultTemplates.map(def => {
      const custom = (templates || []).find(t => t.event_type === def.event_type && (t.organization_id === orgId || !t.organization_id));
      return custom ? { ...def, ...custom } : def;
    });

    res.json(merged);
  } catch (err) {
    console.error('[pushNotificationController.getTemplates] error:', err.message || err);
    res.json([
      {
        event_type: 'LEAD_ASSIGNED',
        title_template: '🎯 New Lead Assigned: {customer_name}',
        body_template: '{customer_name} ({lead_source}) was assigned to you by {assigned_by}.',
        is_active: true
      },
      {
        event_type: 'TASK_DUE',
        title_template: '⏰ Task Due Alert: {customer_name}',
        body_template: 'Follow-up task for {customer_name} is scheduled now.',
        is_active: true
      },
      {
        event_type: 'SYSTEM_ALERT',
        title_template: '🔔 System Alert',
        body_template: '{message}',
        is_active: true
      },
      {
        event_type: 'THIRD_PARTY_LEAD',
        title_template: '📥 New Inbound Lead: {customer_name}',
        body_template: 'New lead received via {lead_source} integration for project {project_name}.',
        is_active: true
      },
      {
        event_type: 'LEAD_TRANSFERRED',
        title_template: '🔄 Lead Transferred: {customer_name}',
        body_template: '{customer_name} was transferred to you by {assigned_by}.',
        is_active: true
      }
    ]);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const PushTemplate = getModel('PushTemplate', '../models/pushTemplateModel');
    const orgId = req.user.organization_id || req.user.organizationId;
    const { event_type, title_template, body_template, is_active } = req.body;

    if (!event_type || !title_template || !body_template) {
      const err = new Error('event_type, title_template, and body_template are required');
      err.status = 400;
      throw err;
    }

    const doc = await PushTemplate.findOneAndUpdate(
      { organization_id: orgId, event_type },
      {
        $set: {
          organization_id: orgId,
          event_type,
          title_template,
          body_template,
          is_active: is_active !== false
        }
      },
      { new: true, upsert: true }
    ).exec();

    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.getQuotas = async (req, res, next) => {
  try {
    const PushQuota = getModel('PushQuota', '../models/pushQuotaModel');
    const Organization = getModel('Organization', '../models/organizationModel');
    const role = req.user?.role;
    const currentMonth = new Date().toISOString().substring(0, 7);

    if (role !== 'superAdmin') {
      const orgId = req.user?.organization_id || req.user?.organizationId;
      let quota = await PushQuota.findOne({ organization_id: orgId, billing_month: currentMonth }).lean().exec();
      let orgDoc = null;
      if (orgId && Organization) {
        orgDoc = await Organization.findOne({
          $or: [{ _id: orgId }, { organization_id: orgId }, { organizationId: orgId }]
        }).lean().exec();
      }
      const orgName = orgDoc ? (orgDoc.organization_name || orgDoc.organizationName || orgDoc.name || 'Your Organization') : 'Your Organization';
      if (!quota) {
        quota = { organization_id: orgId || 'default_org', organization_name: orgName, monthly_limit: 10000, used_count: 0, billing_month: currentMonth };
      } else {
        quota.organization_name = orgName;
      }
      return res.json([quota]);
    }

    // Super Admin: Fetch all registered client organizations
    const orgs = Organization ? await Organization.find({}).lean().exec() : [];
    const quotas = await PushQuota.find({ billing_month: currentMonth }).lean().exec();

    let result = (orgs || []).map(org => {
      const oId = String(org._id || org.organization_id || org.organizationId);
      const q = (quotas || []).find(item => item.organization_id === oId || item.organization_id === String(org._id));
      const orgName = org.organization_name || org.organizationName || org.name || (org.first_name ? `${org.first_name} ${org.last_name || ''}`.trim() : '') || org.email_id || org.emailId || 'Organization';
      return {
        organization_id: oId,
        organization_name: orgName,
        monthly_limit: q ? q.monthly_limit : 10000,
        used_count: q ? q.used_count : 0,
        billing_month: currentMonth
      };
    });

    // Fallback: If no orgs returned from Organization collection but quotas exist, return quota entries
    if (result.length === 0 && quotas && quotas.length > 0) {
      result = quotas.map(q => ({
        organization_id: q.organization_id,
        organization_name: q.organization_name || q.organization_id,
        monthly_limit: q.monthly_limit || 10000,
        used_count: q.used_count || 0,
        billing_month: q.billing_month || currentMonth
      }));
    }

    res.json(result);
  } catch (err) {
    console.error('[pushNotificationController.getQuotas] error:', err.message || err);
    res.json([]);
  }
};

exports.updateQuota = async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin') {
      const err = new Error('Only Super Admin can configure organization push quotas');
      err.status = 403;
      throw err;
    }

    const PushQuota = getModel('PushQuota', '../models/pushQuotaModel');
    const { organization_id, monthly_limit } = req.body;
    const currentMonth = new Date().toISOString().substring(0, 7);

    if (!organization_id || monthly_limit === undefined) {
      const err = new Error('organization_id and monthly_limit are required');
      err.status = 400;
      throw err;
    }

    const doc = await PushQuota.findOneAndUpdate(
      { organization_id, billing_month: currentMonth },
      { $set: { monthly_limit: Number(monthly_limit) } },
      { new: true, upsert: true }
    ).exec();

    res.json(doc);
  } catch (err) {
    next(err);
  }
};
