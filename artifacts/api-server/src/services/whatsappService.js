const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Escapes regex special characters
 */
function escapeRegex(text) {
  return String(text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Normalizes a phone number to standard international format (e.g. 919876543210)
 * Handles leading zeros, double zeros, spaces, dashes, brackets, and + prefixes
 */
function normalizePhoneNumber(rawPhone, defaultCountry = '91') {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';

  // Strip international prefixes (00 or +)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Strip trunk prefix (single 0)
  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  const cleanCountry = String(defaultCountry || '91').replace(/\D/g, '') || '91';

  // 10 digits without country code -> prepend default country code (e.g. 91)
  if (digits.length === 10) {
    digits = cleanCountry + digits;
  }

  // If number is shorter than 10 digits, it's invalid
  if (digits.length < 10) return '';

  return digits;
}

/**
 * Resolves all CRM placeholder mappings for WhatsApp message templates
 */
function resolveTemplate(templateStr, contact = {}, orgName = '', assignedUserName = '') {
  if (!templateStr) return null;

  const getValue = (placeholder) => {
    if (!placeholder) return '';
    const rawKey = String(placeholder).trim();
    const key = rawKey.toLowerCase();
    switch (key) {
      case 'customer_name':
      case 'customername':
      case 'name':
        return contact.customerName || contact.customer_name || contact.name || '';
      case 'contact_no':
      case 'contactnumber':
      case 'contact_number':
      case 'phone':
      case 'mobile':
        return contact.contactNumber || contact.contact_number || contact.contact_no || contact.phone || '';
      case 'alternate_no':
      case 'alternateno':
      case 'alternate_phone':
        return contact.alternateNo || contact.alternate_no || contact.alternatePhone || contact.alternate_phone || '';
      case 'country_code':
      case 'countrycode':
        return contact.countryCode || contact.country_code || '+91';
      case 'lead_type':
      case 'leadtype':
        return contact.leadType || contact.lead_type || 'Lead';
      case 'email':
      case 'emailid':
      case 'email_id':
        return contact.emailId || contact.email_id || contact.email || '';
      case 'lead_source':
      case 'leadsource':
      case 'source':
        return contact.source || contact.leadSource || contact.campaign || contact.lead_source || contact.lead_source_id || 'Self Generated';
      case 'project':
      case 'project_name':
      case 'projectname':
        return contact.projectName || contact.project_name || contact.project || '';
      case 'location':
      case 'city':
        return contact.location || contact.city || '';
      case 'budget':
        return contact.budget || '';
      case 'property_type':
      case 'propertytype':
        return contact.propertyType || contact.property_type || '';
      case 'deal_title':
      case 'dealtitle':
        return contact.dealTitle || contact.deal_title || contact.title || 'Opportunity';
      case 'deal_value':
      case 'dealvalue':
      case 'amount':
        return contact.dealValue || contact.deal_value || contact.amount || '0';
      case 'next_follow_up_type':
      case 'follow_up_type':
        return contact.nextFollowUpType || contact.next_follow_up_type || 'Call Back';
      case 'call_back_reason':
      case 'callback_reason':
        return contact.callBackReason || contact.call_back_reason || 'Scheduled Follow-up';
      case 'previous_owner':
      case 'transferred_from':
        return contact.previousOwner || contact.previous_owner || 'Previous Representative';
      case 'notes':
      case 'comment':
        return contact.notes || contact.comment || '';
      case 'assigned_agent':
      case 'agent_name':
      case 'assigned_to':
        return assignedUserName || contact.contactOwnerEmail || contact.contact_owner_email || contact.assignedTo || contact.assigned_to || 'Assigned Representative';
      case 'organizationname':
      case 'organization_name':
      case 'company_name':
        return orgName || contact.organization_name || contact.organizationName || 'Leads Rubix';
      case 'date':
        return new Date().toLocaleDateString('en-IN');
      case 'time':
        return new Date().toLocaleTimeString('en-IN');
      default:
        // Dynamic CRM & custom industry field fallback
        if (contact[rawKey] !== undefined && contact[rawKey] !== null) return String(contact[rawKey]);
        if (contact[key] !== undefined && contact[key] !== null) return String(contact[key]);
        if (contact.custom_fields && contact.custom_fields[rawKey] !== undefined) return String(contact.custom_fields[rawKey]);
        if (contact.custom_fields && contact.custom_fields[key] !== undefined) return String(contact.custom_fields[key]);
        if (contact.customFields && contact.customFields[rawKey] !== undefined) return String(contact.customFields[rawKey]);
        if (contact.customFields && contact.customFields[key] !== undefined) return String(contact.customFields[key]);
        return placeholder;
    }
  };

  try {
    const template = typeof templateStr === 'string' ? JSON.parse(templateStr) : templateStr;
    const resolved = {};

    for (const [k, v] of Object.entries(template)) {
      if (typeof v === 'string') {
        resolved[k] = getValue(v);
      } else {
        resolved[k] = v;
      }
    }
    return resolved;
  } catch (err) {
    if (typeof templateStr === 'string') {
      let str = templateStr;
      const placeholders = [
        'customer_name', 'customerName', 'contact_no', 'contactNumber', 'alternate_no', 'country_code',
        'lead_type', 'leadType', 'email', 'emailId', 'lead_source', 'leadSource', 'project', 'location',
        'budget', 'property_type', 'assigned_agent', 'organizationName', 'organization_name',
        'deal_title', 'deal_value', 'next_follow_up_type', 'call_back_reason', 'previous_owner'
      ];
      placeholders.forEach(p => {
        const val = getValue(p);
        str = str.replace(new RegExp(`\\{\\{?${p}\\}?\\}?`, 'gi'), val || 'N/A');
      });
      return str;
    }
    return null;
  }
}

/**
 * Formats a resolved template object or plain text into a professional WhatsApp message string
 */
function formatMessage(resolvedObj, eventType = 'incoming', recipientType = 'agent') {
  if (!resolvedObj) return '';

  if (typeof resolvedObj === 'string') {
    return resolvedObj;
  }

  const lines = [];

  // Professional Header based on Event & Recipient
  if (eventType === 'transfer') {
    lines.push('🔄 *Lead Transfer Alert*');
  } else if (eventType === 'task_reminder') {
    lines.push('⏰ *Follow-up Due Reminder*');
  } else if (eventType === 'deal_won') {
    lines.push('🎉 *Deal Milestone / Won*');
  } else if (recipientType === 'customer') {
    lines.push('👋 *Welcome!*');
  } else {
    lines.push(recipientType === 'admin' ? '📢 *New Lead Alert (Management)*' : '🆕 *New Lead Assigned to You*');
  }
  lines.push('');

  let customNote = '';

  for (const [k, v] of Object.entries(resolvedObj)) {
    const keyStr = String(k).trim();
    const lowerKey = keyStr.toLowerCase();

    // Save custom message/note text to append after field details
    if (lowerKey === 'message' || lowerKey === 'msg' || lowerKey === 'note') {
      if (v) customNote = String(v).trim();
      continue;
    }

    const valStr = (v !== null && v !== undefined) ? String(v).trim() : '';
    if (valStr && valStr !== 'N/A') {
      lines.push(`*${keyStr}:* ${valStr}`);
    }
  }

  if (customNote) {
    lines.push('');
    lines.push(customNote);
  }

  // Recipient Call-To-Action
  if (recipientType === 'agent') {
    lines.push('');
    lines.push(eventType === 'transfer' 
      ? '⚡ *Action:* Please review interaction notes and connect with the lead.'
      : '⚡ *Speed-to-Lead:* Please contact this prospect immediately.');
  }

  return lines.join('\n');
}

/**
 * Multi-Factor User Resolver: searches User collection by id, uid, email (case-insensitive), or display name
 */
async function resolveUserAndPhone(contact, targetOrgIds = []) {
  try {
    const User = mongoose.model('User');

    const ownerEmail = (contact?.contactOwnerEmail || contact?.contact_owner_email || contact?.assignedTo || contact?.assigned_to || '').trim();
    const ownerUid = (contact?.uid || contact?.contactOwnerId || contact?.contact_owner_id || '').trim();
    const createdBy = (contact?.createdBy || contact?.created_by || '').trim();

    const searchQueries = [];

    if (ownerUid) {
      searchQueries.push({ uid: ownerUid });
      if (mongoose.Types.ObjectId.isValid(ownerUid)) {
        searchQueries.push({ _id: ownerUid });
      }
      searchQueries.push({ _id: ownerUid });
    }

    if (ownerEmail && ownerEmail.includes('@')) {
      searchQueries.push({ email: { $regex: new RegExp(`^${escapeRegex(ownerEmail)}$`, 'i') } });
    } else if (ownerEmail && ownerEmail !== 'Unassigned') {
      // Possible user display name stored in assignedTo
      searchQueries.push({ name: { $regex: new RegExp(`^${escapeRegex(ownerEmail)}$`, 'i') } });
    }

    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      searchQueries.push({ _id: createdBy });
    }

    let userDoc = null;
    if (searchQueries.length > 0) {
      userDoc = await User.findOne({ $or: searchQueries }).lean().exec();
    }

    // If still not found and we have targetOrgIds, check by email case-insensitively within org
    if (!userDoc && ownerEmail && targetOrgIds.length > 0) {
      userDoc = await User.findOne({
        $or: [
          { organization_id: { $in: targetOrgIds } },
          { organizationId: { $in: targetOrgIds } }
        ],
        email: { $regex: new RegExp(`^${escapeRegex(ownerEmail)}$`, 'i') }
      }).lean().exec();
    }

    if (!userDoc) {
      return null;
    }

    const userName = userDoc.name || `${userDoc.firstName || userDoc.first_name || ''} ${userDoc.lastName || userDoc.last_name || ''}`.trim() || userDoc.email;
    const rawPhone = userDoc.contactNumber || userDoc.contact_number || userDoc.phone || userDoc.mobile || userDoc.fields?.phone || userDoc.fields?.contactNumber || userDoc.fields?.contact_number || '';

    return {
      user: userDoc,
      name: userName,
      email: userDoc.email,
      role: userDoc.role || 'sales',
      rawPhone: rawPhone
    };
  } catch (err) {
    console.error('[WhatsAppService] Error resolving user and phone:', err.message);
    return null;
  }
}

/**
 * Sends a WhatsApp notification across multiple recipients with 2-tier gateway hierarchy
 * ('SuperAdmin Universal' vs 'Client Custom' with automatic override and vice-versa fallback)
 */
async function sendNotification({
  organizationId,
  contact,
  eventType = 'incoming',
  customRecipient = null,
  customMessage = null,
  testProvider = null,
  testCredentials = null
}) {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const WhatsAppLog = mongoose.model('WhatsAppLog');
    const Organization = mongoose.model('Organization');
    const User = mongoose.model('User');

    // 1. Fetch Organization Details
    const org = organizationId ? await Organization.findOne({
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId },
        ...(mongoose.Types.ObjectId.isValid(organizationId) ? [{ _id: organizationId }] : [])
      ]
    }).lean().exec() : null;

    const orgName = org ? (org.organization_name || org.name || 'Leads Rubix CRM') : 'Leads Rubix CRM';
    const orgCountryCode = String(org?.country_code || org?.countryCode || '91').replace(/\D/g, '') || '91';

    const targetOrgIds = [
      organizationId,
      org?._id ? String(org._id) : null,
      org?.organization_id,
      org?.organizationId
    ].filter(Boolean);

    // 2. Resolve 2-Tier Gateway ('Custom Client' vs 'SuperAdmin Universal')
    let tenantConfig = null;
    if (targetOrgIds.length > 0) {
      tenantConfig = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: { $in: targetOrgIds } },
          { organizationId: { $in: targetOrgIds } }
        ]
      }).lean().exec();
    }

    const universalConfig = await WhatsAppConfig.findOne({
      $or: [{ organization_id: null }, { organizationId: null }]
    }).lean().exec();

    // Determine whether Tenant has active Custom API
    const isCustomActive = tenantConfig && tenantConfig.use_custom_api !== false && (
      Boolean(tenantConfig.wapi?.active && tenantConfig.wapi?.wapi_token) ||
      Boolean(tenantConfig.simply?.active && tenantConfig.simply?.access_token) ||
      Boolean((tenantConfig.chat_simplified?.active || tenantConfig.chatSimplified?.active) && (tenantConfig.chat_simplified?.api_key || tenantConfig.chatSimplified?.apiKey))
    );

    let activeConfig = null;
    let isUniversalGateway = false;

    if (testProvider && testCredentials) {
      // Direct diagnostic test mode
      activeConfig = { [testProvider]: { ...testCredentials, active: true } };
      isUniversalGateway = false;
    } else if (isCustomActive) {
      // Tenant's custom verified WhatsApp API takes precedence
      activeConfig = tenantConfig;
      isUniversalGateway = false;
    } else if (universalConfig && (universalConfig.wapi?.active || universalConfig.simply?.active || universalConfig.chat_simplified?.active || universalConfig.chatSimplified?.active)) {
      // Seamless fallback to SuperAdmin Universal Platform Gateway
      activeConfig = universalConfig;
      isUniversalGateway = true;
    } else if (tenantConfig) {
      activeConfig = tenantConfig;
      isUniversalGateway = false;
    }

    // 3. Resolve Active Channel & Credentials
    let activeChannel = testProvider || '';
    let channelSettings = testCredentials || null;

    if (!activeChannel || !channelSettings) {
      if (activeConfig) {
        if (activeConfig.wapi?.active) {
          activeChannel = 'wapi';
          channelSettings = activeConfig.wapi;
        } else if (activeConfig.simply?.active) {
          activeChannel = 'simply';
          channelSettings = activeConfig.simply;
        } else if (activeConfig.chat_simplified?.active || activeConfig.chatSimplified?.active) {
          activeChannel = 'chatsimplified';
          channelSettings = activeConfig.chat_simplified || activeConfig.chatSimplified;
        }
      }
    }

    if (!activeChannel || !channelSettings) {
      console.log(`[WhatsAppService] No active WhatsApp gateway found for organization: ${organizationId || 'global'}`);
      return { success: false, message: 'WhatsApp integration is inactive' };
    }

    console.log(`[WhatsAppService] Active Gateway: ${isUniversalGateway ? 'SuperAdmin Universal Gateway' : 'Client Custom Gateway'} via ${activeChannel}`);

    // 4. Resolve Lead & Assigned User Information
    const resolvedAgent = await resolveUserAndPhone(contact, targetOrgIds);
    const assignedUserName = resolvedAgent ? resolvedAgent.name : (contact?.assignedTo || contact?.assigned_to || '');

    const leadName = contact?.customerName || contact?.customer_name || contact?.name || 'New Lead';
    const leadPhone = contact?.contactNumber || contact?.contact_number || contact?.contact_no || contact?.phone || 'N/A';
    const leadSource = contact?.source || contact?.leadSource || contact?.campaign || 'Website/API';
    const leadProject = contact?.projectName || contact?.project_name || contact?.project || 'General';
    const leadBudget = contact?.budget || '';

    // 5. Build Recipient Queue (Assigned Agent, Admin, Customer)
    const effectiveConfig = tenantConfig || activeConfig || {};
    const notifyAssignedAgent = effectiveConfig.notify_assigned_agent !== false && effectiveConfig.notifyAssignedAgent !== false;
    const notifyAdmin = effectiveConfig.notify_admin !== false && effectiveConfig.notifyAdmin !== false;
    const notifyCustomerWelcome = Boolean(effectiveConfig.notify_customer_welcome || effectiveConfig.notifyCustomerWelcome);
    const adminPhoneOverride = effectiveConfig.admin_phone_override || effectiveConfig.adminPhoneOverride || '';

    const recipientsQueue = [];

    if (customRecipient) {
      // Manual custom test / override recipient
      const cleanCustom = normalizePhoneNumber(customRecipient, orgCountryCode);
      if (cleanCustom) {
        recipientsQueue.push({
          type: 'custom',
          name: 'Direct Recipient',
          phone: cleanCustom,
          message: customMessage || `🚀 Leads Rubix Test Message via ${activeChannel.toUpperCase()} (${isUniversalGateway ? 'Universal' : 'Custom'} Gateway).`
        });
      }
    } else {
      // A. Assigned Sales Rep / Agent
      if (notifyAssignedAgent && resolvedAgent && resolvedAgent.rawPhone) {
        const cleanAgentPhone = normalizePhoneNumber(resolvedAgent.rawPhone, orgCountryCode);
        if (cleanAgentPhone) {
          recipientsQueue.push({
            type: 'agent',
            role: resolvedAgent.role,
            name: resolvedAgent.name,
            phone: cleanAgentPhone,
            message: null // Will resolve template
          });
        }
      }

      // B. Admin / Management Copy
      if (notifyAdmin) {
        let rawAdminPhone = adminPhoneOverride;
        if (!rawAdminPhone && org) {
          rawAdminPhone = org.admin_contact_number || org.contact_number || org.contactNumber || org.phone || org.mobile || '';
        }
        if (!rawAdminPhone && targetOrgIds.length > 0) {
          const adminDoc = await User.findOne({
            $or: [
              { organization_id: { $in: targetOrgIds }, role: 'admin' },
              { organizationId: { $in: targetOrgIds }, role: 'admin' }
            ]
          }).lean().exec();
          if (adminDoc) {
            rawAdminPhone = adminDoc.contactNumber || adminDoc.contact_number || adminDoc.phone || adminDoc.mobile || '';
          }
        }

        const cleanAdminPhone = normalizePhoneNumber(rawAdminPhone, orgCountryCode);
        if (cleanAdminPhone) {
          recipientsQueue.push({
            type: 'admin',
            role: 'admin',
            name: 'Organization Admin',
            phone: cleanAdminPhone,
            message: null
          });
        }
      }

      // C. Customer Welcome (Only for incoming leads if enabled)
      if (notifyCustomerWelcome && eventType === 'incoming' && leadPhone) {
        const cleanCustPhone = normalizePhoneNumber(leadPhone, orgCountryCode);
        if (cleanCustPhone) {
          recipientsQueue.push({
            type: 'customer',
            role: 'customer',
            name: leadName,
            phone: cleanCustPhone,
            message: null
          });
        }
      }
    }

    // Deduplicate recipients by phone number
    const uniqueRecipients = [];
    const seenPhones = new Set();
    for (const r of recipientsQueue) {
      if (!seenPhones.has(r.phone)) {
        seenPhones.add(r.phone);
        uniqueRecipients.push(r);
      }
    }

    if (uniqueRecipients.length === 0) {
      console.warn('[WhatsAppService] No valid recipient phone numbers found for this notification.');
      return { success: false, message: 'No valid recipient phone numbers found for notification' };
    }

    // 6. Resolve Message Text for Each Recipient
    for (const r of uniqueRecipients) {
      if (r.message) continue;

      let templateStr = '';
      if (eventType === 'transfer') {
        templateStr = effectiveConfig.transfer_template || effectiveConfig.transferTemplate || channelSettings.transfer_json || channelSettings.transferJson;
      } else if (eventType === 'task_reminder') {
        templateStr = effectiveConfig.task_reminder_template || effectiveConfig.taskReminderTemplate;
      } else if (eventType === 'deal_won') {
        templateStr = effectiveConfig.deal_won_template || effectiveConfig.dealWonTemplate;
      } else if (r.type === 'customer') {
        templateStr = effectiveConfig.customer_welcome_template || effectiveConfig.customerWelcomeTemplate;
      } else {
        templateStr = effectiveConfig.incoming_template || effectiveConfig.incomingTemplate || channelSettings.incoming_json || channelSettings.incomingJson;
      }

      if (templateStr && String(templateStr).trim().length > 0) {
        const resolvedObj = resolveTemplate(templateStr, contact || {}, orgName, assignedUserName);
        if (resolvedObj) {
          r.message = formatMessage(resolvedObj, eventType, r.type);
        }
      }

      // High-converting Professional Fallback Defaults
      if (!r.message) {
        if (eventType === 'transfer') {
          r.message = `🔄 *Lead Transferred to You*\n\n` +
            `*Customer:* ${leadName}\n` +
            `*Phone:* ${leadPhone}\n` +
            `*Project:* ${leadProject}\n` +
            `*Source:* ${leadSource}\n` +
            `*Company:* ${orgName}\n\n` +
            `📋 Please check CRM notes and follow up with the customer.`;
        } else if (eventType === 'task_reminder') {
          r.message = `⏰ *Follow-up Due Reminder*\n\n` +
            `*Customer:* ${leadName}\n` +
            `*Phone:* ${leadPhone}\n` +
            `*Project:* ${leadProject}\n` +
            `*Type:* ${contact?.nextFollowUpType || 'Call Back'}\n` +
            `*Reason:* ${contact?.callBackReason || 'Scheduled Interaction'}\n\n` +
            `⚡ Please complete your scheduled interaction.`;
        } else if (eventType === 'deal_won') {
          r.message = `🎉 *Deal Won / Milestone!*\n\n` +
            `*Deal Title:* ${contact?.dealTitle || leadName}\n` +
            `*Value:* ₹${contact?.dealValue || contact?.amount || '0'}\n` +
            `*Agent:* ${assignedUserName}\n` +
            `*Company:* ${orgName}\n\n` +
            `👏 Congratulations team!`;
        } else if (r.type === 'customer') {
          r.message = `👋 *Hello ${leadName}!*\n\n` +
            `Thank you for reaching out to *${orgName}* regarding *${leadProject}*.\n\n` +
            `Our team member *${assignedUserName || 'Representative'}* will connect with you shortly!`;
        } else if (r.type === 'admin') {
          r.message = `📢 *New Lead Alert (Assigned to ${assignedUserName || 'Unassigned'})*\n\n` +
            `*Customer:* ${leadName}\n` +
            `*Phone:* ${leadPhone}\n` +
            `*Project:* ${leadProject}\n` +
            (leadBudget ? `*Budget:* ${leadBudget}\n` : '') +
            `*Source:* ${leadSource}\n` +
            `*Company:* ${orgName}`;
        } else {
          r.message = `🆕 *New Lead Assigned to You*\n\n` +
            `*Customer:* ${leadName}\n` +
            `*Phone:* ${leadPhone}\n` +
            `*Project:* ${leadProject}\n` +
            (leadBudget ? `*Budget:* ${leadBudget}\n` : '') +
            `*Source:* ${leadSource}\n` +
            `*Company:* ${orgName}\n\n` +
            `⚡ *Speed-to-Lead:* Please contact this prospect immediately.`;
        }
      }
    }

    // 7. Dispatch Concurrently via Active Provider & Log Delivery
    const dispatchPromises = uniqueRecipients.map(async (recipient) => {
      const logRecord = {
        organization_id: targetOrgIds[0] || null,
        organization_name: orgName,
        recipient_phone: recipient.phone,
        recipient_name: recipient.name,
        recipient_type: recipient.type,
        event_type: eventType,
        provider: activeChannel,
        is_universal: isUniversalGateway,
        contact_id: contact?._id ? String(contact._id) : '',
        message_body: recipient.message,
        status: 'SUCCESS',
        error_message: ''
      };

      try {
        if (activeChannel === 'wapi') {
          const baseUrl = (channelSettings.wapi_url || channelSettings.wapiUrl || 'https://gate.whapi.cloud').trim().replace(/\/+$/, '');
          const token = (channelSettings.wapi_token || channelSettings.wapiToken || channelSettings.token || '').trim();

          if (!token) throw new Error('WHAPI integration is missing WHAPI Token');

          const recipientId = recipient.phone.includes('@') ? recipient.phone : `${recipient.phone}@s.whatsapp.net`;
          const url = `${baseUrl}/messages/text?token=${encodeURIComponent(token)}`;

          await axios.post(url, {
            to: recipientId,
            body: recipient.message
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 12000
          });
        } else if (activeChannel === 'simply') {
          const url = (channelSettings.url || 'https://app.simplywhatsapp.com/api/send').trim();
          const instanceId = (channelSettings.instance_id || channelSettings.instanceId || '').trim();
          const accessToken = (channelSettings.access_token || channelSettings.accessToken || '').trim();

          if (!instanceId || !accessToken) throw new Error('Simply WhatsApp is missing Instance ID or Access Token');

          await axios.post(url, {
            number: recipient.phone,
            message: recipient.message,
            msg: recipient.message,
            instance_id: instanceId,
            access_token: accessToken,
          }, { timeout: 12000 });
        } else if (activeChannel === 'chatsimplified') {
          const url = (channelSettings.url || 'https://www.chatsimplified.co/api/v1/').trim();
          const apiKey = (channelSettings.api_key || channelSettings.apiKey || '').trim();

          if (!apiKey) throw new Error('ChatSimplified integration is missing API Key');

          await axios.post(url, {
            to: recipient.phone,
            message: recipient.message
          }, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 12000
          });
        }

        console.log(`[WhatsAppService] Dispatched ${eventType} notification to ${recipient.name} (${recipient.phone})`);
        await WhatsAppLog.create(logRecord).catch(e => console.warn('[WhatsAppLog] Log creation warning:', e.message));
        return { success: true, phone: recipient.phone, name: recipient.name, type: recipient.type };
      } catch (dispatchErr) {
        const errorMsg = dispatchErr.response?.data
          ? (typeof dispatchErr.response.data === 'string' ? dispatchErr.response.data : JSON.stringify(dispatchErr.response.data))
          : dispatchErr.message;

        console.error(`[WhatsAppService] Dispatch error for ${recipient.phone}:`, errorMsg);
        logRecord.status = 'FAILED';
        logRecord.error_message = errorMsg;
        await WhatsAppLog.create(logRecord).catch(e => console.warn('[WhatsAppLog] Failed log creation warning:', e.message));
        return { success: false, phone: recipient.phone, error: errorMsg };
      }
    });

    const results = await Promise.allSettled(dispatchPromises);
    const successfulDispatches = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    return {
      success: successfulDispatches > 0,
      totalDispatched: successfulDispatches,
      gateway: isUniversalGateway ? 'universal' : 'custom',
      provider: activeChannel,
      recipients: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };
  } catch (err) {
    const errorDetails = err.response?.data
      ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
      : err.message;
    console.error('[WhatsAppService] Fatal error in sendNotification:', errorDetails);
    return { success: false, message: errorDetails };
  }
}

/**
 * Direct WhatsApp message dispatcher resolving custom vs universal gateway.
 */
async function sendDirectWhatsAppMessage({ organizationId, phone, name = '', role = 'agent', eventType = 'general', messageBody = '' }) {
  const normPhone = normalizePhoneNumber(phone);
  if (!normPhone) return { success: false, error: 'Valid recipient phone number required' };

  return sendNotification({
    action: eventType,
    organizationId,
    contact: { customerName: name, phone: normPhone },
    customRecipients: [
      {
        name: name || 'User',
        phone: normPhone,
        type: role,
        message: messageBody
      }
    ]
  });
}

module.exports = {
  normalizePhoneNumber,
  resolveTemplate,
  formatMessage,
  resolveUserAndPhone,
  sendNotification,
  sendDirectWhatsAppMessage
};
