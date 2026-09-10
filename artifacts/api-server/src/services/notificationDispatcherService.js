const mongoose = require('mongoose');
const whatsappService = require('./whatsappService');
const mailer = require('../utils/mailer');
const awsSnsService = require('./awsSnsService');
const {
  STANDARD_EVENTS,
  DEFAULT_MATRIX_RULES,
  MERGE_TAGS,
  getIndustryTemplates
} = require('./notificationDefaults');

/**
 * Escapes regex characters
 */
function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes email address
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Replaces {{placeholder}} tokens with values from dataMap
 */
function replaceMergeTokens(text = '', dataMap = {}) {
  if (!text) return '';
  let output = String(text);
  for (const [key, val] of Object.entries(dataMap)) {
    const rawVal = val !== null && val !== undefined ? String(val) : '';
    // Support {{tag}}, {{ tag }}, and {tag}
    const regex = new RegExp(`(\\{\\{\\s*${key}\\s*\\}\\}|\\{\\s*${key}\\s*\\})`, 'gi');
    output = output.replace(regex, rawVal);
  }
  return output;
}

/**
 * Fetches the active routing matrix for an organization.
 * Merges platform defaults if tenant has not customized a rule.
 */
async function getRoutingMatrix(organizationId) {
  try {
    const NotificationMatrixRule = mongoose.model('NotificationMatrixRule');
    const savedRules = await NotificationMatrixRule.find({
      $or: [{ organization_id: organizationId }, { organization_id: null }]
    }).lean().exec();

    const ruleMap = new Map();
    // First apply null (global defaults)
    for (const r of savedRules.filter(x => !x.organization_id)) {
      ruleMap.set(r.event_key, r);
    }
    // Then override with tenant-specific rules
    for (const r of savedRules.filter(x => x.organization_id === organizationId)) {
      ruleMap.set(r.event_key, r);
    }

    // Merge with STANDARD_EVENTS
    return STANDARD_EVENTS.map(ev => {
      const existing = ruleMap.get(ev.event_key);
      const defaultRule = DEFAULT_MATRIX_RULES.find(d => d.event_key === ev.event_key) || {
        event_key: ev.event_key,
        event_label: ev.event_label,
        is_enabled: true,
        routing: {
          assigned_agent: { enabled: true, channels: { whatsapp: true, email: true, push: true, in_app: true } },
          team_lead: { enabled: false, channels: { whatsapp: false, email: true, push: true, in_app: true } },
          org_admin: { enabled: true, channels: { whatsapp: true, email: true, push: false, in_app: true }, override_phone: '', override_email: '' },
          customer: { enabled: false, channels: { whatsapp: false, email: false } }
        }
      };

      return {
        eventKey: ev.event_key,
        eventLabel: ev.event_label,
        category: ev.category,
        description: ev.description,
        isEnabled: existing ? (existing.is_enabled !== false) : defaultRule.is_enabled,
        routing: existing?.routing || defaultRule.routing
      };
    });
  } catch (err) {
    console.error('[NotificationDispatcher] Error loading routing matrix:', err.message);
    return DEFAULT_MATRIX_RULES.map(r => ({
      eventKey: r.event_key,
      eventLabel: r.event_label,
      isEnabled: r.is_enabled,
      routing: r.routing
    }));
  }
}

/**
 * Resolves all recipients (Agent, Team Lead, Admin, Customer) for a given CRM entity
 */
async function resolveCrmRecipients({ organizationId, entityData = {}, matrixRule = {} }) {
  const User = mongoose.model('User');
  const Organization = mongoose.model('Organization');

  const recipients = {
    agent: null,
    teamLead: null,
    admin: null,
    customer: null
  };

  // 1. Resolve Assigned Agent
  const ownerEmail = entityData.contactOwnerEmail || entityData.contact_owner_email || entityData.assignedTo || entityData.assigned_to || entityData.ownerEmail || entityData.owner_email || entityData.agentEmail || '';
  const ownerId = entityData.contactOwnerId || entityData.contact_owner_id || entityData.assigned_user_id || entityData.ownerId || entityData.owner_id || entityData.uid || '';

  let agentUser = null;
  if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
    agentUser = await User.findById(ownerId).lean().exec();
  }
  if (!agentUser && ownerId) {
    agentUser = await User.findOne({ uid: String(ownerId) }).lean().exec();
  }
  if (!agentUser && ownerEmail && ownerEmail.includes('@')) {
    agentUser = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(ownerEmail)}$`, 'i') } }).lean().exec();
  } else if (!agentUser && ownerEmail && ownerEmail !== 'Unassigned') {
    agentUser = await User.findOne({ name: { $regex: new RegExp(`^${escapeRegex(ownerEmail)}$`, 'i') } }).lean().exec();
  }

  if (agentUser) {
    const rawPhone = agentUser.contactNumber || agentUser.contact_number || agentUser.phone || agentUser.mobile || agentUser.fields?.phone || agentUser.fields?.contactNumber || '';
    const normPhone = whatsappService.normalizePhoneNumber(rawPhone);
    recipients.agent = {
      id: String(agentUser._id),
      name: agentUser.name || `${agentUser.firstName || ''} ${agentUser.lastName || ''}`.trim() || agentUser.email,
      phone: normPhone,
      email: agentUser.email,
      pushTokens: Array.isArray(agentUser.aws_push_tokens) && agentUser.aws_push_tokens.length > 0
        ? agentUser.aws_push_tokens
        : (agentUser.device_id ? [{ token: agentUser.device_id, endpointArn: agentUser.sns_endpoint_arn || null }] : [])
    };
  }

  // 2. Resolve Team Lead / Reporting Manager
  if (agentUser?.team_id || agentUser?.teamId) {
    try {
      const Team = mongoose.model('Team');
      const teamId = agentUser.team_id || agentUser.teamId;
      const teamDoc = await Team.findById(teamId).lean().exec();
      const leadId = teamDoc?.team_lead_id || teamDoc?.teamLeadId;
      if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
        const leadUser = await User.findById(leadId).lean().exec();
        if (leadUser && String(leadUser._id) !== String(agentUser._id)) {
          const leadRawPhone = leadUser.contactNumber || leadUser.contact_number || leadUser.phone || leadUser.mobile || '';
          recipients.teamLead = {
            id: String(leadUser._id),
            name: leadUser.name || `${leadUser.firstName || ''} ${leadUser.lastName || ''}`.trim() || leadUser.email,
            phone: whatsappService.normalizePhoneNumber(leadRawPhone),
            email: leadUser.email,
            pushTokens: Array.isArray(leadUser.aws_push_tokens) ? leadUser.aws_push_tokens : []
          };
        }
      }
    } catch (e) {
      // safe fallback
    }
  }

  // 3. Resolve Organization Admin
  const adminOverridePhone = matrixRule?.routing?.org_admin?.override_phone || '';
  const adminOverrideEmail = matrixRule?.routing?.org_admin?.override_email || '';

  const adminQuery = {
    role: 'admin',
    $or: [
      { organization_id: organizationId },
      { organizationId: organizationId }
    ]
  };
  const adminUser = await User.findOne(adminQuery).lean().exec();
  const adminRawPhone = adminOverridePhone || adminUser?.contactNumber || adminUser?.contact_number || adminUser?.phone || adminUser?.mobile || '';
  const adminEmail = adminOverrideEmail || adminUser?.email || '';

  recipients.admin = {
    id: adminUser ? String(adminUser._id) : 'admin_default',
    name: adminUser?.name || `${adminUser?.firstName || ''} ${adminUser?.lastName || ''}`.trim() || 'Organization Administrator',
    phone: whatsappService.normalizePhoneNumber(adminRawPhone),
    email: adminEmail,
    pushTokens: Array.isArray(adminUser?.aws_push_tokens) ? adminUser.aws_push_tokens : []
  };

  // 4. Resolve Customer
  const custName = entityData.customerName || entityData.customer_name || entityData.name || entityData.fullName || 'Customer';
  const custPhone = entityData.contactNumber || entityData.contact_no || entityData.phone || entityData.mobile || entityData.fields?.phone || '';
  const custEmail = entityData.email || entityData.email_id || entityData.emailAddress || '';

  recipients.customer = {
    name: custName,
    phone: whatsappService.normalizePhoneNumber(custPhone),
    email: custEmail
  };

  return recipients;
}

/**
 * Master Dispatcher Function: dispatches any CRM lifecycle event across all configured channels
 */
async function dispatchCrmEvent({
  eventKey,
  organizationId,
  entityType = 'contact',
  entityData = {},
  actorUser = null,
  metadata = {}
}) {
  const startTime = Date.now();
  console.log(`[NotificationDispatcher] Starting dispatch for event="${eventKey}" org="${organizationId}" entityType="${entityType}"`);

  try {
    const Organization = mongoose.model('Organization');
    const NotificationMatrixRule = mongoose.model('NotificationMatrixRule');
    const NotificationTemplate = mongoose.model('NotificationTemplate');
    const NotificationLog = mongoose.model('NotificationLog');
    const Notification = mongoose.model('Notification');

    // 1. Resolve Organization & Industry Details
    let orgDoc = null;
    if (organizationId) {
      const filterOr = [{ organization_id: organizationId }, { organizationId: organizationId }];
      if (mongoose.Types.ObjectId.isValid(organizationId)) {
        filterOr.push({ _id: organizationId });
      }
      orgDoc = await Organization.findOne({ $or: filterOr }).lean().exec();
    }
    const orgName = orgDoc?.name || orgDoc?.organization_name || orgDoc?.organizationName || 'Leads Rubix CRM';
    const industryId = orgDoc?.industry_id || orgDoc?.industryId || 'temp0001';

    // 2. Resolve Matrix Rule for this Event
    let matrixRule = await NotificationMatrixRule.findOne({
      organization_id: organizationId,
      event_key: eventKey
    }).lean().exec();

    if (!matrixRule) {
      matrixRule = await NotificationMatrixRule.findOne({
        organization_id: null,
        event_key: eventKey
      }).lean().exec();
    }

    if (!matrixRule) {
      matrixRule = DEFAULT_MATRIX_RULES.find(r => r.event_key === eventKey) || {
        event_key: eventKey,
        is_enabled: true,
        routing: {
          assigned_agent: { enabled: true, channels: { whatsapp: true, email: true, push: true, in_app: true } },
          team_lead: { enabled: false, channels: { whatsapp: false, email: true, push: true, in_app: true } },
          org_admin: { enabled: true, channels: { whatsapp: true, email: true, push: false, in_app: true } },
          customer: { enabled: false, channels: { whatsapp: false, email: false } }
        }
      };
    }

    if (matrixRule.is_enabled === false) {
      console.log(`[NotificationDispatcher] Event "${eventKey}" is disabled in matrix rules for org "${organizationId}". Suppressing.`);
      return { success: true, suppressed: true, reason: 'Disabled in matrix rules' };
    }

    // 3. Resolve Recipients
    const recipients = await resolveCrmRecipients({ organizationId, entityData, matrixRule });

    // 4. Construct Universal Merge Token Map
    const frontendBase = (process.env.FRONTEND_URL || 'http://3.110.156.220').replace(/\/+$/, '');
    const entityId = entityData._id || entityData.id || '';
    const directLeadUrl = entityType === 'deal'
      ? `${frontendBase}/leads/deals-list`
      : (entityId ? `${frontendBase}/leads/contacts` : `${frontendBase}/leads/contacts`);

    const mergeMap = {
      customer_name: recipients.customer?.name || 'Customer',
      customer_phone: recipients.customer?.phone || '',
      customer_email: recipients.customer?.email || '',
      alternate_phone: entityData.alternateNumber || entityData.alternate_no || '',
      lead_source: entityData.source || entityData.leadSource || entityData.lead_source || 'Direct',
      lead_type: entityData.leadType || entityData.lead_type || 'Leads',
      assigned_agent_name: recipients.agent?.name || 'Assigned Representative',
      assigned_agent_phone: recipients.agent?.phone || '',
      assigned_agent_email: recipients.agent?.email || '',
      previous_agent_name: metadata.previousAgentName || entityData.previousOwner || entityData.previous_owner || 'Previous Representative',
      team_lead_name: recipients.teamLead?.name || 'Team Lead',
      organization_name: orgName,
      deal_title: entityData.dealTitle || entityData.deal_title || entityData.title || 'Opportunity',
      deal_amount: entityData.dealValue || entityData.deal_value || entityData.amount || '0',
      deal_stage: entityData.stage || entityData.stageName || 'Pipeline',
      task_title: entityData.taskTitle || entityData.title || entityData.task_title || entityData.nextFollowUpType || 'Scheduled Follow-up',
      task_due: entityData.dueDate || entityData.due_date || entityData.nextFollowUp || entityData.scheduled_at || new Date().toLocaleString('en-IN'),
      crm_lead_url: directLeadUrl,
      // Industry fields
      budget: entityData.budget || '',
      location: entityData.location || entityData.city || '',
      project_name: entityData.projectName || entityData.project_name || entityData.project || '',
      property_type: entityData.propertyType || entityData.property_type || '',
      unit_number: entityData.unitNumber || entityData.unit_number || ''
    };

    // 5. Load Active Templates for all 4 channels
    const defaultTemplates = getIndustryTemplates(industryId);
    const customTemplates = await NotificationTemplate.find({
      $or: [{ organization_id: organizationId }, { organization_id: null }],
      event_key: eventKey,
      is_active: true
    }).lean().exec();

    const templateByChannel = {};
    for (const ch of ['whatsapp', 'email', 'push', 'in_app']) {
      // Prioritize tenant custom template -> then platform template -> then industry default
      const tenantTpl = customTemplates.find(t => t.organization_id === organizationId && t.channel === ch);
      const platformTpl = customTemplates.find(t => !t.organization_id && t.channel === ch);
      const defaultTpl = defaultTemplates.find(t => t.event_key === eventKey && t.channel === ch);
      templateByChannel[ch] = tenantTpl || platformTpl || defaultTpl || null;
    }

    // 6. Build Dispatch Queue
    const dispatchTasks = [];

    // Helper: Queue dispatch task
    const enqueueDispatch = ({ recipientRole, recipientObj, channel }) => {
      if (!recipientObj) return;
      const tpl = templateByChannel[channel];
      if (!tpl && channel !== 'in_app') return;

      const renderedSubject = tpl?.subject_template ? replaceMergeTokens(tpl.subject_template, mergeMap) : `CRM Alert: ${eventKey}`;
      const renderedBody = tpl?.body_template ? replaceMergeTokens(tpl.body_template, mergeMap) : `Notification for ${mergeMap.customer_name}`;

      dispatchTasks.push(async () => {
        const itemStartTime = Date.now();
        let status = 'SUCCESS';
        let errorMessage = '';
        let provider = 'system';
        let target = '';

        try {
          if (channel === 'whatsapp') {
            target = recipientObj.phone;
            provider = 'whatsapp_gateway';
            if (!target) throw new Error('No verified recipient phone number available');

            const waRes = await whatsappService.sendDirectWhatsAppMessage({
              organizationId,
              phone: target,
              name: recipientObj.name,
              role: recipientRole,
              eventType: eventKey,
              messageBody: renderedBody
            });

            if (!waRes || waRes.success === false) {
              throw new Error(waRes?.message || waRes?.error || 'WhatsApp dispatch error');
            }
          } else if (channel === 'email') {
            target = recipientObj.email;
            provider = 'smtp';
            if (!target || !target.includes('@')) throw new Error('No valid recipient email available');

            const emailRes = await mailer.sendDynamicEmail({
              toEmail: target,
              subject: renderedSubject,
              htmlContent: renderedBody,
              organizationId
            });

            if (!emailRes || emailRes.success === false) {
              throw new Error(emailRes?.error || 'Email dispatch error');
            }
          } else if (channel === 'push') {
            target = recipientObj.id || recipientObj.name;
            provider = 'aws_sns';
            const tokens = recipientObj.pushTokens || [];

            if (tokens.length === 0) {
              status = 'SUPPRESSED';
              errorMessage = 'No mobile push device tokens registered for user';
            } else {
              for (const t of tokens) {
                await awsSnsService.sendPushNotification({
                  endpointArn: t.endpointArn || null,
                  token: t.token,
                  title: renderedSubject,
                  message: renderedBody,
                  data: {
                    type: eventKey,
                    entityId: String(entityId),
                    url: directLeadUrl
                  }
                });
              }
            }
          } else if (channel === 'in_app') {
            target = recipientObj.id;
            provider = 'in_app';
            if (target && recipientObj.id !== 'admin_default') {
              await Notification.create({
                user_id: String(recipientObj.id),
                organization_id: String(organizationId),
                title: renderedSubject,
                message: renderedBody,
                type: eventKey,
                is_read: false,
                related_id: entityId ? String(entityId) : null
              });
            }
          }
        } catch (dispatchErr) {
          status = 'FAILED';
          errorMessage = dispatchErr.message || String(dispatchErr);
          console.error(`[NotificationDispatcher] Failed ${channel} to ${recipientRole} (${target}):`, errorMessage);
        }

        // Record in unified notification_logs
        const latency = Date.now() - itemStartTime;
        await NotificationLog.create({
          organization_id: String(organizationId || 'default'),
          event_key: eventKey,
          channel,
          recipient_role: recipientRole,
          recipient_name: recipientObj.name || recipientRole,
          recipient_id: recipientObj.id ? String(recipientObj.id) : null,
          recipient_target: target || 'N/A',
          provider,
          is_universal: true,
          status,
          title: renderedSubject,
          message_body: renderedBody,
          error_message: errorMessage,
          latency_ms: latency
        }).catch(e => console.warn('[NotificationLog] Failed to log:', e.message));

        return { channel, recipientRole, status, errorMessage };
      });
    };

    // Evaluate Matrix for each Recipient & Channel
    const routing = matrixRule.routing || {};

    // 1. Agent
    if (routing.assigned_agent?.enabled && recipients.agent) {
      for (const [ch, isEnabled] of Object.entries(routing.assigned_agent.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'agent', recipientObj: recipients.agent, channel: ch });
      }
    }

    // 2. Team Lead
    if (routing.team_lead?.enabled && recipients.teamLead) {
      for (const [ch, isEnabled] of Object.entries(routing.team_lead.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'team_lead', recipientObj: recipients.teamLead, channel: ch });
      }
    }

    // 3. Org Admin
    if (routing.org_admin?.enabled && recipients.admin) {
      for (const [ch, isEnabled] of Object.entries(routing.org_admin.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'admin', recipientObj: recipients.admin, channel: ch });
      }
    }

    // 4. Customer
    if (routing.customer?.enabled && recipients.customer) {
      for (const [ch, isEnabled] of Object.entries(routing.customer.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'customer', recipientObj: recipients.customer, channel: ch });
      }
    }

    // 7. Execute all dispatches concurrently
    const outcomes = await Promise.allSettled(dispatchTasks.map(t => t()));
    const totalDispatched = outcomes.filter(o => o.status === 'fulfilled' && o.value.status === 'SUCCESS').length;

    console.log(`[NotificationDispatcher] Finished event="${eventKey}" totalSuccessful=${totalDispatched}/${dispatchTasks.length} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      eventKey,
      totalDispatched,
      totalAttempted: dispatchTasks.length,
      outcomes: outcomes.map(o => o.status === 'fulfilled' ? o.value : { status: 'FAILED', errorMessage: o.reason?.message })
    };
  } catch (fatalErr) {
    console.error(`[NotificationDispatcher] Fatal error dispatching event="${eventKey}":`, fatalErr.stack || fatalErr.message);
    return { success: false, error: fatalErr.message };
  }
}

module.exports = {
  getRoutingMatrix,
  resolveCrmRecipients,
  dispatchCrmEvent
};
