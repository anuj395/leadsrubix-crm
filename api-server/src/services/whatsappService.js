const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Normalizes a phone number to E.164 format (numeric only, starting with country code)
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
 * Resolves placeholder mappings for the WhatsApp JSON templates
 */
function resolveTemplate(templateStr, contact, orgName) {
  try {
    const template = JSON.parse(templateStr);
    const resolved = {};

    const getValue = (placeholder) => {
      if (!placeholder) return '';
      switch (String(placeholder).toLowerCase()) {
        case 'customer_name':
        case 'customername':
          return contact.customerName || contact.customer_name || '';
        case 'contact_no':
        case 'contactnumber':
          return contact.contactNumber || contact.contact_no || '';
        case 'alternate_no':
        case 'alternateno':
          return contact.alternateNo || '';
        case 'country_code':
        case 'countrycode':
          return contact.countryCode || '';
        case 'lead_type':
        case 'leadtype':
          return contact.leadType || '';
        case 'email':
        case 'emailid':
          return contact.emailId || contact.email || '';
        case 'lead_source':
        case 'leadsource':
        case 'source':
          return contact.source || '';
        case 'organizationname':
        case 'organization_name':
          return orgName || '';
        default:
          return placeholder;
      }
    };

    for (const [key, placeholder] of Object.entries(template)) {
      resolved[key] = getValue(placeholder);
    }
    return resolved;
  } catch (err) {
    console.error('[WhatsAppService] Failed to parse template JSON:', err.message);
    return null;
  }
}

/**
 * Formats a template object into user-friendly lines
 */
function formatMessage(resolvedObj) {
  if (!resolvedObj) return '';
  // If the template specifies a custom Message field, we can use it or fallback to formatting all keys
  return Object.entries(resolvedObj)
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');
}

/**
 * Sends a WhatsApp notification for a contact event
 * @param {Object} params
 * @param {String} params.organizationId
 * @param {Object} params.contact
 * @param {String} params.eventType 'incoming' | 'transfer'
 */
async function sendNotification({ organizationId, contact, eventType }) {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');
    const User = mongoose.model('User');

    // 1. Fetch organization details
    const org = await Organization.findOne({
      $or: [
        { organization_id: organizationId },
        ...(mongoose.Types.ObjectId.isValid(organizationId) ? [{ _id: organizationId }] : [])
      ]
    }).lean().exec();

    const orgName = org ? (org.organization_name || org.name) : 'CRM Lead Notification';

    // 2. Fetch WhatsApp config
    let config = await WhatsAppConfig.findOne({ organizationId: organizationId }).exec();
    if (!config) {
      config = await WhatsAppConfig.findOne({ organizationId: null }).exec();
    }

    if (!config) {
      console.warn('[WhatsAppService] No WhatsApp configuration found.');
      return;
    }

    // 3. Resolve the active integration
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
      return;
    }

    // 4. Resolve template JSON
    const templateStr = eventType === 'incoming' ? channelSettings.incoming_json : channelSettings.transfer_json;
    if (!templateStr) {
      console.warn(`[WhatsAppService] No message template set for event: ${eventType}`);
      return;
    }

    const resolvedPayload = resolveTemplate(templateStr, contact, orgName);
    if (!resolvedPayload) return;

    const messageText = formatMessage(resolvedPayload);

    // 5. Determine recipient phone number (the assigned user's mobile)
    let recipientUser = null;
    if (contact.uid) {
      recipientUser = await User.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(contact.uid) ? contact.uid : null },
          { uid: contact.uid }
        ]
      }).exec();
    }

    if (!recipientUser && contact.contactOwnerEmail) {
      recipientUser = await User.findOne({ email: contact.contactOwnerEmail }).exec();
    }

    let recipientPhone = '';
    if (recipientUser) {
      recipientPhone = recipientUser.contactNumber || recipientUser.contact_no || recipientUser.admin_contact_number || '';
    }

    if (!recipientPhone) {
      recipientPhone = org?.mobile_number || '';
    }

    const cleanRecipient = normalizePhoneNumber(recipientPhone);
    if (!cleanRecipient) {
      console.warn('[WhatsAppService] No recipient phone number found for notification.');
      return;
    }

    console.log(`[WhatsAppService] Dispatching ${eventType} notification to ${cleanRecipient} via ${activeChannel}`);

    // 6. Send payload to API channel
    if (activeChannel === 'simply') {
      const url = channelSettings.url || 'https://app.simplywhatsapp.com/api/send';
      await axios.post(url, {
        number: cleanRecipient,
        message: messageText,
        msg: messageText,
        instance_id: channelSettings.instance_id || channelSettings.instanceId,
        access_token: channelSettings.access_token || channelSettings.accessToken,
      });
    } else if (activeChannel === 'wapi') {
      const baseUrl = channelSettings.wapi_url || 'https://gate.whapi.cloud';
      const token = channelSettings.wapi_token;
      await axios.post(`${baseUrl}/messages/text`, {
        to: `${cleanRecipient}@s.whatsapp.net`,
        body: messageText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } else if (activeChannel === 'chatsimplified') {
      const url = channelSettings.url || 'https://www.chatsimplified.co/api/v1/';
      const apiKey = channelSettings.api_key;
      await axios.post(url, {
        to: cleanRecipient,
        message: messageText
      }, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
    }

    console.log('[WhatsAppService] WhatsApp notification sent successfully.');
  } catch (err) {
    console.error('[WhatsAppService] Failed to send WhatsApp notification:', err.message);
  }
}

module.exports = {
  sendNotification
};
