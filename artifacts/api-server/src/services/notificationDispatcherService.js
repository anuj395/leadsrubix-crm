const mongoose = require('mongoose');
const whatsappService = require('./whatsappService');
const mailer = require('../utils/mailer');
const awsSnsService = require('./awsSnsService');
const firebaseNotificationService = require('./firebaseNotificationService');
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
/**
 * Universal CRM Recipient Resolver
 * Standardizes recipient extraction across multi-tenant contacts, tasks, and deals.
 * Adheres to NAMING_CONVENTIONS.md: dual-case support (snake_case + camelCase).
 */
async function resolveCrmRecipients({ organizationId, entityData = {}, matrixRule = {}, actorUser = null }) {
  const User = mongoose.model('User');
  const Organization = mongoose.model('Organization');

  const recipients = {
    agent: null,
    teamLead: null,
    admin: null,
    customer: null
  };

  // 1. Extract All Possible Owner Identifiers (Dual-Case & Multi-Format)
  const rawOwnerEmail = entityData.contactOwnerEmail ||
    entityData.contact_owner_email ||
    entityData.assignedTo ||
    entityData.assigned_to ||
    entityData.ownerEmail ||
    entityData.owner_email ||
    entityData.agentEmail ||
    entityData.toUser ||
    entityData.to_user ||
    entityData.recipient_email ||
    '';
  const ownerEmail = String(rawOwnerEmail).trim();

  const rawOwnerId = entityData.contactOwnerId ||
    entityData.contact_owner_id ||
    entityData.assigned_user_id ||
    entityData.ownerId ||
    entityData.owner_id ||
    entityData.uid ||
    entityData.userId ||
    entityData.user_id ||
    '';
  const ownerId = String(rawOwnerId).trim();

  let agentUser = null;

  // Tier 1: Lookup by database ID (_id) if valid ObjectId
  if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
    agentUser = await User.findById(ownerId).lean().exec();
  }

  // Tier 2: Lookup by CRM alphanumeric UID (e.g. 28-char generated uid)
  if (!agentUser && ownerId) {
    agentUser = await User.findOne({ uid: String(ownerId) }).lean().exec();
  }

  // Tier 3: Lookup by Email (case-insensitive, trimmed)
  if (!agentUser && ownerEmail && ownerEmail.includes('@')) {
    const cleanEmail = ownerEmail.toLowerCase();
    agentUser = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') }
    }).lean().exec();
  }

  // Tier 4: Lookup by Name (Checking name, first_name, and firstName)
  if (!agentUser && ownerEmail && ownerEmail !== 'Unassigned' && ownerEmail !== 'SYSTEM') {
    const cleanName = ownerEmail;
    agentUser = await User.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') } },
        { first_name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') } },
        { firstName: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') } }
      ]
    }).lean().exec();
  }

  // Tier 5: Fallback via parent Contact if entity is a Task or Deal
  if (!agentUser && (entityData.contact_id || entityData.contactId)) {
    try {
      const Contact = mongoose.model('Contact');
      const parentContact = await Contact.findById(entityData.contact_id || entityData.contactId).lean().exec();
      if (parentContact) {
        const parentOwnerEmail = String(parentContact.contactOwnerEmail || parentContact.contact_owner_email || parentContact.assignedTo || parentContact.assigned_to || '').trim();
        const parentOwnerId = String(parentContact.contactOwnerId || parentContact.contact_owner_id || parentContact.uid || '').trim();
        if (parentOwnerId && mongoose.Types.ObjectId.isValid(parentOwnerId)) {
          agentUser = await User.findById(parentOwnerId).lean().exec();
        }
        if (!agentUser && parentOwnerId) {
          agentUser = await User.findOne({ uid: parentOwnerId }).lean().exec();
        }
        if (!agentUser && parentOwnerEmail && parentOwnerEmail.includes('@')) {
          agentUser = await User.findOne({
            email: { $regex: new RegExp(`^${escapeRegex(parentOwnerEmail.toLowerCase())}$`, 'i') }
          }).lean().exec();
        }
      }
    } catch (e) {
      // non-fatal
    }
  }

  // Tier 6: Fallback to actorUser or created_by
  if (!agentUser && (actorUser?.id || actorUser?._id || entityData.created_by || entityData.createdBy)) {
    const fallbackId = String(actorUser?.id || actorUser?._id || entityData.created_by || entityData.createdBy).trim();
    if (fallbackId && mongoose.Types.ObjectId.isValid(fallbackId)) {
      agentUser = await User.findById(fallbackId).lean().exec();
    } else if (fallbackId && fallbackId.includes('@')) {
      agentUser = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(fallbackId.toLowerCase())}$`, 'i') } }).lean().exec();
    }
  }

  // Helper to normalize push tokens array (handles string tokens, object tokens, and device_id fallback)
  const extractNormalizedTokens = (userDoc) => {
    if (!userDoc) return [];
    const rawTokens = Array.isArray(userDoc.aws_push_tokens) && userDoc.aws_push_tokens.length > 0
      ? userDoc.aws_push_tokens
      : (userDoc.device_id ? [{ token: userDoc.device_id, endpointArn: userDoc.sns_endpoint_arn || null }] : []);

    return rawTokens.map(t => {
      if (typeof t === 'string' && t.trim().length > 0) {
        return { token: t.trim(), endpointArn: null, platform: 'android' };
      }
      if (t && typeof t === 'object' && t.token && String(t.token).trim().length > 0) {
        return {
          token: String(t.token).trim(),
          endpointArn: t.endpointArn || null,
          platform: t.platform || 'android'
        };
      }
      return null;
    }).filter(t => t && t.token && !t.token.startsWith('sim_device_'));
  };

  if (agentUser) {
    const rawPhone = agentUser.contactNumber || agentUser.contact_number || agentUser.phone || agentUser.mobile || agentUser.fields?.phone || agentUser.fields?.contactNumber || '';
    const normPhone = whatsappService.normalizePhoneNumber(rawPhone);
    recipients.agent = {
      id: String(agentUser._id),
      name: agentUser.name || `${agentUser.firstName || agentUser.first_name || ''} ${agentUser.lastName || agentUser.last_name || ''}`.trim() || agentUser.email,
      phone: normPhone,
      email: agentUser.email,
      pushTokens: extractNormalizedTokens(agentUser)
    };
  }

  // 2. Resolve Team Lead / Reporting Manager
  if (agentUser) {
    try {
      let leadUser = null;
      const reportingTo = String(agentUser.reporting_to || agentUser.reportingTo || '').trim();
      if (reportingTo) {
        if (mongoose.Types.ObjectId.isValid(reportingTo)) {
          leadUser = await User.findById(reportingTo).lean().exec();
        }
        if (!leadUser && reportingTo.includes('@')) {
          leadUser = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(reportingTo.toLowerCase())}$`, 'i') } }).lean().exec();
        }
        if (!leadUser) {
          leadUser = await User.findOne({ uid: reportingTo }).lean().exec();
        }
      }

      if (!leadUser && (agentUser.team_id || agentUser.teamId)) {
        const Team = mongoose.model('Team');
        const teamId = agentUser.team_id || agentUser.teamId;
        const teamDoc = await Team.findById(teamId).lean().exec();
        const leadId = teamDoc?.team_lead_id || teamDoc?.teamLeadId;
        if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
          leadUser = await User.findById(leadId).lean().exec();
        }
      }

      if (leadUser && String(leadUser._id) !== String(agentUser._id)) {
        const leadRawPhone = leadUser.contactNumber || leadUser.contact_number || leadUser.phone || leadUser.mobile || '';
        recipients.teamLead = {
          id: String(leadUser._id),
          name: leadUser.name || `${leadUser.firstName || leadUser.first_name || ''} ${leadUser.lastName || leadUser.last_name || ''}`.trim() || leadUser.email,
          phone: whatsappService.normalizePhoneNumber(leadRawPhone),
          email: leadUser.email,
          pushTokens: extractNormalizedTokens(leadUser)
        };
      }
    } catch (e) {
      // safe fallback
    }
  }

  // 3. Resolve Organization Admin
  const adminOverridePhone = matrixRule?.routing?.org_admin?.override_phone || '';
  const adminOverrideEmail = matrixRule?.routing?.org_admin?.override_email || '';

  const adminQuery = {
    role: { $in: ['admin', 'superAdmin'] },
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
    name: adminUser?.name || `${adminUser?.firstName || adminUser?.first_name || ''} ${adminUser?.lastName || adminUser?.last_name || ''}`.trim() || 'Organization Administrator',
    phone: whatsappService.normalizePhoneNumber(adminRawPhone),
    email: adminEmail,
    pushTokens: extractNormalizedTokens(adminUser)
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

    // 2. Resolve Matrix Rule for this Event (Dual-Case & Multi-Tenant Aware)
    const orgIdStr = organizationId ? String(organizationId) : null;
    let matrixRule = null;
    if (orgIdStr) {
      matrixRule = await NotificationMatrixRule.findOne({
        $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }],
        event_key: eventKey
      }).lean().exec();
    }

    if (!matrixRule) {
      matrixRule = await NotificationMatrixRule.findOne({
        $or: [{ organization_id: null }, { organization_id: { $exists: false } }],
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
    const recipients = await resolveCrmRecipients({ organizationId, entityData, matrixRule, actorUser });

    // 4. Construct Universal Merge Token Map
    const frontendBase = (process.env.FRONTEND_URL || 'http://3.110.156.220').replace(/\/+$/, '');
    const entityId = entityData._id || entityData.id || '';
    const directLeadUrl = entityType === 'deal'
      ? `${frontendBase}/leads/deals-list`
      : (entityId ? `${frontendBase}/leads/contacts` : `${frontendBase}/leads/contacts`);

    const defaultOrgPhone = orgDoc?.phone || orgDoc?.contact_number || orgDoc?.contactNumber || orgDoc?.mobile || '';
    const assignedAgentName = recipients.agent?.name || 'Representative';
    const assignedAgentPhone = recipients.agent?.phone || defaultOrgPhone || '';

    const mergeMap = {
      customer_name: recipients.customer?.name || 'Customer',
      customer_phone: recipients.customer?.phone || '',
      customer_email: recipients.customer?.email || '',
      alternate_phone: entityData.alternateNumber || entityData.alternate_no || '',
      lead_source: entityData.source || entityData.leadSource || entityData.lead_source || 'Direct',
      lead_type: entityData.leadType || entityData.lead_type || 'Leads',
      assigned_agent_name: assignedAgentName,
      assigned_agent_phone: assignedAgentPhone,
      assigned_agent_email: recipients.agent?.email || '',
      previous_agent_name: metadata.previousAgentName || entityData.previousOwner || entityData.previous_owner || '',
      team_lead_name: recipients.teamLead?.name || '',
      organization_name: orgName,
      deal_title: entityData.dealTitle || entityData.deal_title || entityData.title || '',
      deal_amount: entityData.dealValue || entityData.deal_value || entityData.amount || '0',
      deal_stage: entityData.stage || entityData.stageName || 'Pipeline',
      task_title: entityData.taskTitle || entityData.title || entityData.task_type || entityData.taskType || entityData.type || entityData.nextFollowUpType || 'Scheduled Follow-up',
      task_due: entityData.dueDate || entityData.due_date || entityData.nextFollowUp || entityData.scheduled_at || new Date().toLocaleString(),
      crm_lead_url: directLeadUrl,
      // Industry fields
      budget: entityData.budget || '',
      location: entityData.location || entityData.city || '',
      project_name: entityData.projectName || entityData.project_name || entityData.project || '',
      property_type: entityData.propertyType || entityData.property_type || '',
      unit_number: entityData.unitNumber || entityData.unit_number || ''
    };

    // 5. Load Active Templates for all channels (including customer.welcome for customer recipients)
    const defaultTemplates = getIndustryTemplates(industryId);
    const customTemplates = await NotificationTemplate.find({
      $or: [{ organization_id: organizationId }, { organization_id: null }],
      event_key: { $in: [eventKey, 'customer.welcome'] },
      is_active: true
    }).lean().exec();

    const templateByChannel = {};
    for (const ch of ['whatsapp', 'email', 'push', 'in_app']) {
      // Prioritize tenant custom template -> then platform template -> then industry default
      const tenantTpl = customTemplates.find(t => t.organization_id === organizationId && t.event_key === eventKey && t.channel === ch);
      const platformTpl = customTemplates.find(t => !t.organization_id && t.event_key === eventKey && t.channel === ch);
      const defaultTpl = defaultTemplates.find(t => t.event_key === eventKey && t.channel === ch);
      // Fallback to lead.created template for the same channel if available
      const fallbackTpl = defaultTemplates.find(t => t.event_key === 'lead.created' && t.channel === ch);
      templateByChannel[ch] = tenantTpl || platformTpl || defaultTpl || fallbackTpl || null;
    }

    // Customer Welcome Template Resolution (WhatsApp & Email)
    const customerWelcomeByChannel = {};
    for (const ch of ['whatsapp', 'email']) {
      const tenantCustTpl = customTemplates.find(t => t.organization_id === organizationId && t.event_key === 'customer.welcome' && t.channel === ch);
      const platformCustTpl = customTemplates.find(t => !t.organization_id && t.event_key === 'customer.welcome' && t.channel === ch);
      const defaultCustTpl = defaultTemplates.find(t => t.event_key === 'customer.welcome' && t.channel === ch);
      customerWelcomeByChannel[ch] = tenantCustTpl || platformCustTpl || defaultCustTpl || null;
    }

    // Helper: Dynamic fallback content generator if no template exists
    const getDynamicFallbackContent = (channel) => {
      const eventLabel = STANDARD_EVENTS.find(e => e.event_key === eventKey)?.event_label || eventKey;
      if (channel === 'whatsapp') {
        return {
          subject: `CRM Alert: ${eventLabel}`,
          body: `*CRM Notification: ${eventLabel}*\n\n*Customer:* {{customer_name}}\n*Phone:* {{customer_phone}}\n*Source:* {{lead_source}}\n*Assigned Rep:* {{assigned_agent_name}}\n*Workspace:* {{organization_name}}\n\n_Please check your CRM pipeline for details._`
        };
      }
      if (channel === 'email') {
        return {
          subject: `CRM Alert: ${eventLabel} - {{customer_name}}`,
          body: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;"><h2>CRM Alert: ${eventLabel}</h2><p>Customer: <strong>{{customer_name}}</strong> ({{customer_phone}})</p><p>Representative: <strong>{{assigned_agent_name}}</strong></p><p><a href="{{crm_lead_url}}" style="display:inline-block;padding:10px 20px;background:#272944;color:#fff;text-decoration:none;border-radius:4px;">Open in CRM</a></p></div>`
        };
      }
      return {
        subject: `${eventLabel}: {{customer_name}}`,
        body: `${eventLabel} notification for {{customer_name}} ({{lead_source}}).`
      };
    };

    // 6. Build Dispatch Queue
    const dispatchTasks = [];
    const dispatchedRecipients = new Set();

    // Helper: Queue dispatch task
    const enqueueDispatch = ({ recipientRole, recipientObj, channel }) => {
      if (!recipientObj) return;

      // Deduplication: Avoid duplicate notifications if the same person has multiple roles (e.g. Agent AND Admin)
      const recipientKey = recipientObj.id || recipientObj.email || recipientObj.phone;
      if (recipientKey) {
        const dedupeKey = `${channel}:${recipientKey}`;
        if (dispatchedRecipients.has(dedupeKey)) {
          return; // Skip duplicate dispatch to same user for this event
        }
        dispatchedRecipients.add(dedupeKey);
      }

      // Resolve appropriate template based on recipient role
      let tpl = null;
      let dynamicFallback = null;

      if (recipientRole === 'customer') {
        // Customers for inbound leads MUST receive customer-facing welcome/greeting copy, NEVER internal sales rep alerts
        if (eventKey === 'lead.created' || eventKey === 'customer.welcome') {
          tpl = customerWelcomeByChannel[channel] || (eventKey === 'customer.welcome' ? templateByChannel[channel] : null);
          if (!tpl) {
            dynamicFallback = {
              subject: `Welcome to ${orgName || 'our community'}`,
              body: `Hello {{customer_name}}, 👋\n\nThank you for reaching out to *${orgName || 'us'}*. Your dedicated advisor {{assigned_agent_name}} will connect with you shortly.\n\n*Your Executive:* {{assigned_agent_name}}\n*Direct Phone:* {{assigned_agent_phone}}\n\nPlease feel free to reply directly to this chat for any questions. We are glad to assist you!\n\nBest regards,\n*${orgName || 'Our Team'}*`
            };
          }
        } else {
          // For other events (e.g. deal.won, deal.lost), use the event's customer template
          tpl = templateByChannel[channel];
          dynamicFallback = !tpl ? getDynamicFallbackContent(channel) : null;
        }
      } else {
        tpl = templateByChannel[channel];
        dynamicFallback = !tpl ? getDynamicFallbackContent(channel) : null;
      }

      const subjectTpl = tpl?.subject_template || dynamicFallback?.subject || `CRM Alert: ${eventKey}`;
      const bodyTpl = tpl?.body_template || dynamicFallback?.body || `Notification for ${mergeMap.customer_name}`;

      const renderedSubject = replaceMergeTokens(subjectTpl, mergeMap);
      const renderedBody = replaceMergeTokens(bodyTpl, mergeMap);

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
              const errText = waRes?.errorMessage || waRes?.message || waRes?.error || (typeof waRes?.recipients?.[0]?.error === 'string' ? waRes.recipients[0].error : null) || 'WhatsApp dispatch error';
              throw new Error(errText);
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
            provider = 'firebase_fcm_v1';
            const rawTokens = recipientObj.pushTokens || [];
            const validTokens = rawTokens.map(t => {
              if (typeof t === 'string' && t.trim().length > 0) return { token: t.trim(), endpointArn: null };
              if (t && typeof t === 'object' && t.token && String(t.token).trim().length > 0) {
                return { token: String(t.token).trim(), endpointArn: t.endpointArn || null };
              }
              return null;
            }).filter(t => t && t.token && !t.token.startsWith('sim_device_'));

            if (validTokens.length === 0) {
              status = 'SUPPRESSED';
              errorMessage = 'No active mobile push device tokens registered for user';
            } else {
              const isTaskEvent = eventKey.startsWith('task.') || entityType === 'task';
              const isDealEvent = eventKey.startsWith('deal.') || entityType === 'deal';
              const targetScreen = isDealEvent ? 'Deals' : (isTaskEvent ? 'Tasks' : 'LeadDetails');

              const targetLeadId = String(entityData?.contact_id || entityData?.contactId || entityData?.leadId || (!isDealEvent && !isTaskEvent ? entityId : '') || '');
              const targetDealId = String(isDealEvent ? (entityData?.deal_id || entityData?.dealId || entityId) : (entityData?.deal_id || entityData?.dealId || ''));
              const targetTaskId = String(isTaskEvent ? (entityData?.task_id || entityData?.taskId || entityId) : (entityData?.task_id || entityData?.taskId || ''));

              const pushPayloadData = {
                type: eventKey,
                eventKey,
                entityId: String(entityId),
                leadId: targetLeadId,
                contactId: targetLeadId,
                dealId: targetDealId,
                taskId: targetTaskId,
                screen: targetScreen,
                url: directLeadUrl
              };

              let dispatchedCount = 0;
              let lastError = '';

              for (const t of validTokens) {
                // 1. Direct Firebase FCM HTTP v1 Delivery
                if (firebaseNotificationService.isConfigured()) {
                  provider = 'firebase_fcm_v1';
                  const fbRes = await firebaseNotificationService.sendDirectPushNotification({
                    token: t.token,
                    title: renderedSubject,
                    message: renderedBody,
                    data: pushPayloadData
                  });

                  if (fbRes.success) {
                    dispatchedCount++;
                    continue;
                  } else {
                    lastError = fbRes.error || 'Firebase FCM dispatch failed';
                    // Auto-prune unregistered / stale tokens from DB
                    if (fbRes.isUnregistered && recipientObj.id) {
                      try {
                        const User = mongoose.model('User');
                        await User.updateOne(
                          { _id: recipientObj.id },
                          { $pull: { aws_push_tokens: { token: t.token } } }
                        );
                        console.log(`[NotificationDispatcher] Pruned expired push token for user ${recipientObj.id}`);
                      } catch (pruneErr) {
                        // ignore prune failure
                      }
                    }
                  }
                }

                // 2. Fallback to AWS SNS / Expo Push
                provider = 'aws_sns';
                const snsRes = await awsSnsService.sendPushNotification({
                  endpointArn: t.endpointArn || null,
                  token: t.token,
                  title: renderedSubject,
                  message: renderedBody,
                  data: pushPayloadData
                });

                if (snsRes.success) {
                  dispatchedCount++;
                } else {
                  lastError = snsRes.error || lastError || 'AWS SNS delivery failed';
                }
              }

              if (dispatchedCount > 0) {
                status = 'SUCCESS';
                errorMessage = '';
              } else {
                status = 'FAILED';
                errorMessage = lastError || 'Push dispatch failed for all tokens';
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

    const isRoleEligible = (roleConfig) => {
      if (!roleConfig) return false;
      if (roleConfig.enabled === false) return false;
      return Object.values(roleConfig.channels || {}).some(Boolean);
    };

    // 1. Agent
    if (isRoleEligible(routing.assigned_agent) && recipients.agent) {
      for (const [ch, isEnabled] of Object.entries(routing.assigned_agent.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'agent', recipientObj: recipients.agent, channel: ch });
      }
    }

    // 2. Team Lead
    if (isRoleEligible(routing.team_lead) && recipients.teamLead) {
      for (const [ch, isEnabled] of Object.entries(routing.team_lead.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'team_lead', recipientObj: recipients.teamLead, channel: ch });
      }
    }

    // 3. Org Admin
    if (isRoleEligible(routing.org_admin) && recipients.admin) {
      for (const [ch, isEnabled] of Object.entries(routing.org_admin.channels || {})) {
        if (isEnabled) enqueueDispatch({ recipientRole: 'admin', recipientObj: recipients.admin, channel: ch });
      }
    }

    // 4. Customer Routing Evaluation (Strict Tenant Admin Preference)
    const orgCustomerEnabled = orgDoc?.customer_notifications_enabled !== false && orgDoc?.customerNotificationsEnabled !== false;
    let customerChannels = {};

    if (orgCustomerEnabled && isRoleEligible(routing.customer)) {
      customerChannels = { ...(routing.customer.channels || {}) };
    }

    // Only fallback to customer.welcome if the tenant has NOT explicitly disabled customer routing for this event
    const isCustomerExplicitlyDisabled = routing.customer?.enabled === false;
    if (orgCustomerEnabled && !isCustomerExplicitlyDisabled && eventKey === 'lead.created' && !Object.values(customerChannels).some(Boolean)) {
      try {
        let welcomeRule = await NotificationMatrixRule.findOne({
          $or: [{ organization_id: organizationId }, { organizationId: organizationId }],
          event_key: 'customer.welcome'
        }).lean().exec();

        // Only check global default if tenant has no custom welcome rule AND hasn't disabled customer routing
        if (!welcomeRule) {
          welcomeRule = await NotificationMatrixRule.findOne({
            $or: [{ organization_id: null }, { organization_id: { $exists: false } }],
            event_key: 'customer.welcome'
          }).lean().exec();
        }

        if (welcomeRule && isRoleEligible(welcomeRule.routing?.customer)) {
          customerChannels = { ...(welcomeRule.routing.customer.channels || {}) };
        }
      } catch (e) {
        console.warn('[NotificationDispatcher] Error checking customer.welcome rule:', e.message);
      }
    }

    if (recipients.customer && Object.values(customerChannels).some(Boolean)) {
      for (const [ch, isEnabled] of Object.entries(customerChannels)) {
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
