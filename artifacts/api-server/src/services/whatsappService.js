const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Normalizes a phone number to standard international format (e.g. 919876543210)
 */
function normalizePhoneNumber(phone, defaultCountry = '91') {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  } else if (clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  const cleanCountry = String(defaultCountry || '91').replace(/\D/g, '') || '91';
  if (clean.length === 10) {
    clean = cleanCountry + clean;
  }
  return clean;
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
      case 'notes':
      case 'comment':
        return contact.notes || contact.comment || '';
      case 'assigned_agent':
      case 'agent_name':
      case 'assigned_to':
        return assignedUserName || contact.contactOwnerEmail || contact.contact_owner_email || contact.assignedTo || contact.assigned_to || '';
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
        'budget', 'property_type', 'assigned_agent', 'organizationName', 'organization_name'
      ];
      placeholders.forEach(p => {
        const val = getValue(p);
        str = str.replace(new RegExp(`\\{\\{?${p}\\}?\\}?`, 'gi'), val);
      });
      return str;
    }
    return null;
  }
}

/**
 * Formats a resolved template object or plain text into a complete WhatsApp message string
 */
function formatMessage(resolvedObj, eventType = 'incoming') {
  if (!resolvedObj) return '';

  if (typeof resolvedObj === 'string') {
    return resolvedObj;
  }

  const lines = [];

  // Header Title
  lines.push(eventType === 'transfer' ? '🔄 Lead Transfer Alert' : '🚨 Lead Alert');
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
    lines.push(`${keyStr}: ${valStr}`);
  }

  if (customNote) {
    lines.push('');
    lines.push(customNote);
  }

  lines.push('');
  lines.push('Thanks and Regards');
  lines.push('Leads Rubix');
  lines.push('https://www.leadsrubix.com');

  return lines.join('\n');
}

/**
 * Sends a WhatsApp notification for incoming leads or lead transfers
 * @param {Object} params
 * @param {String} params.organizationId
 * @param {Object} [params.contact]
 * @param {String} params.eventType 'incoming' | 'transfer'
 * @param {String} [params.customRecipient] Optional custom mobile number
 * @param {String} [params.customMessage] Optional custom message text
 * @param {String} [params.testProvider] Optional provider override for test mode ('wapi' | 'simply' | 'chatsimplified')
 * @param {Object} [params.testCredentials] Optional credentials override for test mode
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
    const Organization = mongoose.model('Organization');
    const User = mongoose.model('User');

    // 1. Fetch organization details (matching string organization_id, organizationId, or ObjectId)
    const org = organizationId ? await Organization.findOne({
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId },
        ...(mongoose.Types.ObjectId.isValid(organizationId) ? [{ _id: organizationId }] : [])
      ]
    }).lean().exec() : null;

    const orgName = org ? (org.organization_name || org.name || 'CRM Lead Notification') : 'CRM Lead Notification';

    // Build list of all potential organization identifier forms
    const targetOrgIds = [
      organizationId,
      org?._id ? String(org._id) : null,
      org?.organization_id,
      org?.organizationId
    ].filter(Boolean);

    // 2. Fetch WhatsApp config (Org specific, fallback to global default)
    let config = null;
    if (targetOrgIds.length > 0) {
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: { $in: targetOrgIds } },
          { organizationId: { $in: targetOrgIds } }
        ]
      }).exec();
    }

    if (!config) {
      config = await WhatsAppConfig.findOne({
        $or: [{ organization_id: null }, { organizationId: null }]
      }).exec();
    }

    // 3. Resolve active channel & settings
    let activeChannel = testProvider || '';
    let channelSettings = testCredentials || null;

    if (!activeChannel || !channelSettings) {
      if (config) {
        if (config.wapi?.active) {
          activeChannel = 'wapi';
          channelSettings = config.wapi;
        } else if (config.simply?.active) {
          activeChannel = 'simply';
          channelSettings = config.simply;
        } else if (config.chat_simplified?.active || config.chatSimplified?.active) {
          activeChannel = 'chatsimplified';
          channelSettings = config.chat_simplified || config.chatSimplified;
        }
      }
    }

    if (!activeChannel || !channelSettings) {
      console.log('[WhatsAppService] WhatsApp integration is inactive for this organization.');
      return { success: false, message: 'WhatsApp integration is inactive' };
    }

    // 4. Resolve message text
    let messageText = customMessage;
    let assignedUserName = '';

    // Determine recipient user / agent
    const ownerEmail = contact?.contactOwnerEmail || contact?.contact_owner_email || contact?.assignedTo || contact?.assigned_to || '';
    const ownerUid = contact?.uid || contact?.contactOwnerId || contact?.contact_owner_id;

    let recipientUser = null;
    if (ownerUid) {
      recipientUser = await User.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(ownerUid) ? ownerUid : null },
          { uid: ownerUid }
        ]
      }).lean().exec();
    }
    if (!recipientUser && ownerEmail) {
      recipientUser = await User.findOne({ email: ownerEmail }).lean().exec();
    }

    if (recipientUser) {
      assignedUserName = recipientUser.name || `${recipientUser.firstName || ''} ${recipientUser.lastName || ''}`.trim() || recipientUser.email;
    }

    const leadName = contact?.customerName || contact?.customer_name || contact?.name || 'New Lead';
    const leadPhone = contact?.contactNumber || contact?.contact_number || contact?.contact_no || contact?.phone || 'N/A';
    const leadSource = contact?.source || contact?.leadSource || contact?.campaign || 'Website/API';
    const leadProject = contact?.projectName || contact?.project_name || contact?.project || 'General';

    if (!messageText) {
      const templateStr = eventType === 'transfer'
        ? (channelSettings.transfer_json || channelSettings.transferJson)
        : (channelSettings.incoming_json || channelSettings.incomingJson);

      if (templateStr && String(templateStr).trim().length > 0) {
        const resolvedPayload = resolveTemplate(templateStr, contact || {}, orgName, assignedUserName);
        if (resolvedPayload) {
          messageText = formatMessage(resolvedPayload, eventType);
        }
      }

      // Fail-Safe Default Message Template if JSON template was blank or failed to resolve
      if (!messageText) {
        if (eventType === 'transfer') {
          messageText = `🔄 *Lead Transferred to You*\n\n` +
            `*Customer:* ${leadName}\n` +
            `*Phone:* ${leadPhone}\n` +
            `*Source:* ${leadSource}\n` +
            `*Project:* ${leadProject}\n` +
            `*Company:* ${orgName}\n\n` +
            `Please check your assigned leads in CRM.`;
        } else {
          messageText = `🆕 *New Lead Assigned*\n\n` +
            `*Customer:* ${leadName}\n` +
            `*Phone:* ${leadPhone}\n` +
            `*Source:* ${leadSource}\n` +
            `*Project:* ${leadProject}\n` +
            `*Company:* ${orgName}\n\n` +
            `Please check your leads in CRM.`;
        }
      }
    }

    // 5. Determine recipient phone number with multiple fallbacks
    let recipientPhone = customRecipient;
    if (!recipientPhone && recipientUser) {
      recipientPhone = recipientUser.contactNumber || recipientUser.contact_number || recipientUser.contact_no || recipientUser.phone || recipientUser.mobile || recipientUser.admin_contact_number || '';
    }
    // Fallback to Org Admin contact number if agent phone is unpopulated
    if (!recipientPhone && org) {
      recipientPhone = org.admin_contact_number || org.contact_number || org.contactNumber || org.phone || org.mobile || '';
    }
    // Fallback to any active Tenant Admin user if org has no direct phone number
    if (!recipientPhone && targetOrgIds.length > 0) {
      const adminUser = await User.findOne({
        $or: [
          { organization_id: { $in: targetOrgIds }, role: 'admin' },
          { organizationId: { $in: targetOrgIds }, role: 'admin' }
        ]
      }).lean().exec();
      if (adminUser) {
        recipientPhone = adminUser.contactNumber || adminUser.contact_number || adminUser.contact_no || adminUser.phone || adminUser.mobile || '';
      }
    }

    const orgCountryCode = String(org?.country_code || org?.countryCode || '91').replace(/\D/g, '') || '91';
    const cleanRecipient = normalizePhoneNumber(recipientPhone, orgCountryCode);
    if (!cleanRecipient) {
      console.warn('[WhatsAppService] No valid recipient phone number found for notification.');
      return { success: false, message: 'No valid recipient phone number found for this lead or organization.' };
    }

    console.log(`[WhatsAppService] Dispatching ${eventType || 'custom'} notification to ${cleanRecipient} via ${activeChannel}`);

    // 6. Send payload to respective provider API with credential checks & sanitization
    if (activeChannel === 'wapi') {
      const baseUrl = (channelSettings.wapi_url || channelSettings.wapiUrl || 'https://gate.whapi.cloud').trim().replace(/\/+$/, '');
      const token = (channelSettings.wapi_token || channelSettings.wapiToken || channelSettings.token || '').trim();

      if (!token) {
        console.warn('[WhatsAppService] WHAPI integration is active but missing WHAPI Token.');
        return { success: false, message: 'WHAPI integration is missing WHAPI Token' };
      }

      const recipientId = cleanRecipient.includes('@') ? cleanRecipient : `${cleanRecipient}@s.whatsapp.net`;
      const url = `${baseUrl}/messages/text?token=${encodeURIComponent(token)}`;

      await axios.post(url, {
        to: recipientId,
        body: messageText
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

      if (!instanceId || !accessToken) {
        console.warn('[WhatsAppService] Simply WhatsApp is active but missing Instance ID or Access Token.');
        return { success: false, message: 'Simply WhatsApp is missing Instance ID or Access Token' };
      }

      await axios.post(url, {
        number: cleanRecipient,
        message: messageText,
        msg: messageText,
        instance_id: instanceId,
        access_token: accessToken,
      }, { timeout: 12000 });
    } else if (activeChannel === 'chatsimplified') {
      const url = (channelSettings.url || 'https://www.chatsimplified.co/api/v1/').trim();
      const apiKey = (channelSettings.api_key || channelSettings.apiKey || '').trim();

      if (!apiKey) {
        console.warn('[WhatsAppService] ChatSimplified integration is active but missing API Key.');
        return { success: false, message: 'ChatSimplified integration is missing API Key' };
      }

      await axios.post(url, {
        to: cleanRecipient,
        message: messageText
      }, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 12000
      });
    }

    console.log('[WhatsAppService] WhatsApp notification sent successfully.');
    return {
      success: true,
      message: 'WhatsApp notification sent successfully',
      recipient: cleanRecipient,
      channel: activeChannel
    };
  } catch (err) {
    const errorDetails = err.response?.data
      ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
      : err.message;
    console.error('[WhatsAppService] Failed to send WhatsApp notification:', errorDetails);
    return { success: false, message: errorDetails };
  }
}

module.exports = {
  normalizePhoneNumber,
  resolveTemplate,
  formatMessage,
  sendNotification
};
