const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Normalizes a phone number to standard international format (e.g. 919876543210)
 */
function normalizePhoneNumber(phone, defaultCountry = '91') {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  if (clean.length === 10) {
    clean = defaultCountry + clean;
  }
  return clean;
}

/**
 * Resolves all CRM placeholder mappings for WhatsApp message templates
 */
function resolveTemplate(templateStr, contact, orgName, assignedUserName = '') {
  try {
    const template = typeof templateStr === 'string' ? JSON.parse(templateStr) : templateStr;
    const resolved = {};

    const getValue = (placeholder) => {
      if (!placeholder) return '';
      const key = String(placeholder).toLowerCase().trim();
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
          return contact.alternateNo || contact.alternate_no || '';
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
          return contact.source || contact.leadSource || contact.campaign || '';
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
          return orgName || '';
        case 'date':
          return new Date().toLocaleDateString('en-IN');
        case 'time':
          return new Date().toLocaleTimeString('en-IN');
        default:
          return placeholder;
      }
    };

    for (const [k, v] of Object.entries(template)) {
      if (typeof v === 'string') {
        resolved[k] = getValue(v);
      } else {
        resolved[k] = v;
      }
    }
    return resolved;
  } catch (err) {
    console.error('[WhatsAppService] Failed to parse template JSON:', err.message);
    return null;
  }
}

/**
 * Formats a template object into user-friendly message lines
 */
function formatMessage(resolvedObj) {
  if (!resolvedObj) return '';
  if (resolvedObj.message || resolvedObj.Message) {
    return resolvedObj.message || resolvedObj.Message;
  }
  return Object.entries(resolvedObj)
    .map(([k, val]) => `${k}: ${val}`)
    .join('\n');
}

/**
 * Sends a WhatsApp notification for incoming leads or lead transfers
 * @param {Object} params
 * @param {String} params.organizationId
 * @param {Object} params.contact
 * @param {String} params.eventType 'incoming' | 'transfer'
 * @param {String} [params.customRecipient] Optional custom mobile number
 * @param {String} [params.customMessage] Optional custom message text
 */
async function sendNotification({ organizationId, contact, eventType, customRecipient = null, customMessage = null }) {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');
    const User = mongoose.model('User');

    // 1. Fetch organization details
    const org = await Organization.findOne({
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId },
        ...(mongoose.Types.ObjectId.isValid(organizationId) ? [{ _id: organizationId }] : [])
      ]
    }).lean().exec();

    const orgName = org ? (org.organization_name || org.name || 'CRM Lead Notification') : 'CRM Lead Notification';

    // 2. Fetch WhatsApp config (Org specific, fallback to global default)
    let config = await WhatsAppConfig.findOne({
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId }
      ]
    }).exec();

    if (!config) {
      config = await WhatsAppConfig.findOne({
        $or: [{ organization_id: null }, { organizationId: null }]
      }).exec();
    }

    if (!config) {
      console.warn('[WhatsAppService] No WhatsApp configuration found.');
      return { success: false, message: 'No WhatsApp configuration found' };
    }

    // 3. Resolve active channel
    let activeChannel = '';
    let channelSettings = null;

    if (config.simply?.active) {
      activeChannel = 'simply';
      channelSettings = config.simply;
    } else if (config.wapi?.active) {
      activeChannel = 'wapi';
      channelSettings = config.wapi;
    } else if (config.chat_simplified?.active || config.chatSimplified?.active) {
      activeChannel = 'chatsimplified';
      channelSettings = config.chat_simplified || config.chatSimplified;
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

    if (!messageText) {
      const templateStr = eventType === 'incoming' ? channelSettings.incoming_json : channelSettings.transfer_json;
      if (!templateStr) {
        console.warn(`[WhatsAppService] No message template set for event: ${eventType}`);
        return { success: false, message: `No template for ${eventType}` };
      }

      const resolvedPayload = resolveTemplate(templateStr, contact || {}, orgName, assignedUserName);
      if (!resolvedPayload) return { success: false, message: 'Failed to resolve template' };

      messageText = formatMessage(resolvedPayload);
    }

    // 5. Determine recipient phone number
    let recipientPhone = customRecipient;
    if (!recipientPhone && recipientUser) {
      recipientPhone = recipientUser.contactNumber || recipientUser.contact_number || recipientUser.contact_no || recipientUser.phone || recipientUser.mobile || recipientUser.admin_contact_number || '';
    }

    const orgCountryCode = String(org?.country_code || org?.countryCode || '91').replace(/\D/g, '') || '91';
    const cleanRecipient = normalizePhoneNumber(recipientPhone, orgCountryCode);
    if (!cleanRecipient) {
      console.warn('[WhatsAppService] No valid recipient phone number found for notification.');
      return { success: false, message: 'No valid recipient phone number' };
    }

    console.log(`[WhatsAppService] Dispatching ${eventType || 'custom'} notification to ${cleanRecipient} via ${activeChannel}`);

    // 6. Send payload to respective provider API
    if (activeChannel === 'simply') {
      const url = channelSettings.url || 'https://app.simplywhatsapp.com/api/send';
      const instanceId = channelSettings.instance_id || channelSettings.instanceId;
      const accessToken = channelSettings.access_token || channelSettings.accessToken;

      await axios.post(url, {
        number: cleanRecipient,
        message: messageText,
        msg: messageText,
        instance_id: instanceId,
        access_token: accessToken,
      }, { timeout: 10000 });
    } else if (activeChannel === 'wapi') {
      const baseUrl = channelSettings.wapi_url || 'https://gate.whapi.cloud';
      const token = channelSettings.wapi_token;

      await axios.post(`${baseUrl}/messages/text`, {
        to: `${cleanRecipient}@s.whatsapp.net`,
        body: messageText
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
    } else if (activeChannel === 'chatsimplified') {
      const url = channelSettings.url || 'https://www.chatsimplified.co/api/v1/';
      const apiKey = channelSettings.api_key;

      await axios.post(url, {
        to: cleanRecipient,
        message: messageText
      }, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      });
    }

    console.log('[WhatsAppService] WhatsApp notification sent successfully.');
    return { success: true, message: 'WhatsApp notification sent successfully', recipient: cleanRecipient };
  } catch (err) {
    console.error('[WhatsAppService] Failed to send WhatsApp notification:', err.message);
    return { success: false, message: err.message };
  }
}

module.exports = {
  normalizePhoneNumber,
  resolveTemplate,
  formatMessage,
  sendNotification
};
