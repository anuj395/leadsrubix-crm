const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { sendNotification } = require('../services/whatsappService');

const router = express.Router();

/**
 * Normalizes a WhatsAppConfig document into a dual-cased, frontend-friendly payload
 * with full 2-tier gateway resolution ('universal' vs 'custom')
 */
function normalizeConfigPayload(config, targetOrgId = null, universalConfig = null, isSuperAdmin = false) {
  const plain = config ? (config.toObject ? config.toObject({ virtuals: true, getters: true }) : config) : {};
  const simply = plain.simply || {};
  const wapi = plain.wapi || {};
  const cs = plain.chat_simplified || plain.chatSimplified || {};

  const orgId = plain.organization_id || plain.organizationId || targetOrgId || null;
  const indId = plain.industry_id || plain.industryId || null;

  const hasValidToken = (val) => Boolean(val && String(val).trim().length > 0 && !String(val).includes('undefined') && !String(val).includes('null'));

  const wapiToken = (wapi.wapi_token || wapi.wapiToken || plain.fields?.wapiToken || plain.wapiToken || '').trim();
  const simplyToken = (simply.access_token || simply.accessToken || plain.fields?.accessToken || plain.accessToken || '').trim();
  const simplyInstance = (simply.instance_id || simply.instanceId || plain.fields?.instanceId || plain.instanceId || '').trim();
  const csApiKey = (cs.api_key || cs.apiKey || plain.fields?.apiKey || plain.apiKey || '').trim();

  const isWapiActive = wapi.active !== false;
  const isSimplyActive = simply.active !== false;
  const isCsActive = cs.active !== false;

  const isWapiAvailable = hasValidToken(wapiToken) && isWapiActive;
  const isSimplyAvailable = hasValidToken(simplyToken) && isSimplyActive;
  const isCsAvailable = hasValidToken(csApiKey) && isCsActive;

  const hasCustomCredentials = Boolean(isWapiAvailable || isSimplyAvailable || isCsAvailable);

  const preferredType = String(plain.type || '').toLowerCase();
  let activeProvider = null;
  if ((preferredType.includes('simply') || preferredType === 'simply') && isSimplyAvailable) {
    activeProvider = 'simply';
  } else if ((preferredType.includes('chat') || preferredType.includes('simplified')) && isCsAvailable) {
    activeProvider = 'chatsimplified';
  } else if ((preferredType.includes('wapi') || preferredType.includes('whapi')) && isWapiAvailable) {
    activeProvider = 'wapi';
  } else if (isWapiAvailable) {
    activeProvider = 'wapi';
  } else if (isSimplyAvailable) {
    activeProvider = 'simply';
  } else if (isCsAvailable) {
    activeProvider = 'chatsimplified';
  } else if (wapi.active) {
    activeProvider = 'wapi';
  } else if (simply.active) {
    activeProvider = 'simply';
  } else if (cs.active) {
    activeProvider = 'chatsimplified';
  } else {
    activeProvider = preferredType.includes('simply') ? 'simply' : (preferredType.includes('chat') ? 'chatsimplified' : 'wapi');
  }

  // Fallback recipient settings and templates
  const notifyAssignedAgent = plain.notify_assigned_agent !== undefined ? Boolean(plain.notify_assigned_agent) : (plain.notifyAssignedAgent !== undefined ? Boolean(plain.notifyAssignedAgent) : true);
  const notifyAdmin = plain.notify_admin !== undefined ? Boolean(plain.notify_admin) : (plain.notifyAdmin !== undefined ? Boolean(plain.notifyAdmin) : true);
  const adminPhoneOverride = plain.admin_phone_override || plain.adminPhoneOverride || '';
  const notifyCustomerWelcome = plain.notify_customer_welcome !== undefined ? Boolean(plain.notify_customer_welcome) : (plain.notifyCustomerWelcome !== undefined ? Boolean(plain.notifyCustomerWelcome) : false);

  // Provider Credentials
  let safeSimplyToken = simplyToken;
  let safeWapiToken = wapiToken;
  let safeCsApiKey = csApiKey;

  // Convenience flat fields for NotificationHub and direct UI forms
  const providerType = activeProvider === 'simply' ? 'Simply WhatsApp' : (activeProvider === 'chatsimplified' ? 'ChatSimplified' : 'WHAPI');
  const activeUrl = activeProvider === 'simply' ? (simply.url || 'https://app.simplywhatsapp.com/api/send') : (activeProvider === 'chatsimplified' ? (cs.url || 'https://www.chatsimplified.co/api/v1/') : (wapi.wapi_url || wapi.wapiUrl || 'https://gate.whapi.cloud'));

  const isExplicitlyDisabled = Boolean(
    plain.is_active === false ||
    plain.isActive === false ||
    plain.is_enabled === false
  );
  const isGatewayActive = !isExplicitlyDisabled;

  return {
    _id: plain._id || null,
    organization_id: orgId,
    organizationId: orgId,
    industry_id: indId,
    industryId: indId,

    // Flat UI Convenience State
    type: plain.type || providerType,
    url: activeUrl,
    wapiUrl: wapi.wapi_url || wapi.wapiUrl || plain.fields?.wapiUrl || 'https://gate.whapi.cloud',
    wapiToken: safeWapiToken,
    simplyUrl: simply.url || plain.fields?.simplyUrl || 'https://app.simplywhatsapp.com/api/send',
    simplyInstanceId: simplyInstance,
    simplyAccessToken: safeSimplyToken,
    csUrl: cs.url || plain.fields?.csUrl || 'https://www.chatsimplified.co/api/v1/',
    csApiKey: safeCsApiKey,
    isActive: isGatewayActive,
    is_active: isGatewayActive,
    hasCustomCredentials: hasCustomCredentials,
    fields: {
      wapiUrl: wapi.wapi_url || wapi.wapiUrl || plain.fields?.wapiUrl || 'https://gate.whapi.cloud',
      wapiToken: safeWapiToken,
      simplyUrl: simply.url || plain.fields?.simplyUrl || 'https://app.simplywhatsapp.com/api/send',
      instanceId: simplyInstance,
      accessToken: safeSimplyToken,
      csUrl: cs.url || plain.fields?.csUrl || 'https://www.chatsimplified.co/api/v1/',
      apiKey: safeCsApiKey,
      ...(plain.fields || {})
    },

    // Gateway State
    is_universal: false,
    isUniversal: false,
    use_custom_api: true,
    useCustomApi: true,
    apiSource: hasCustomCredentials ? 'custom' : 'none',
    activeProvider: activeProvider,
    isInherited: false,

    // Recipient Controls
    notify_assigned_agent: notifyAssignedAgent,
    notifyAssignedAgent: notifyAssignedAgent,
    notify_admin: notifyAdmin,
    notifyAdmin: notifyAdmin,
    admin_phone_override: adminPhoneOverride,
    adminPhoneOverride: adminPhoneOverride,
    notify_customer_welcome: notifyCustomerWelcome,
    notifyCustomerWelcome: notifyCustomerWelcome,

    // Scenario Templates
    incoming_template: plain.incoming_template || plain.incomingTemplate || '',
    incomingTemplate: plain.incoming_template || plain.incomingTemplate || '',
    transfer_template: plain.transfer_template || plain.transferTemplate || '',
    transferTemplate: plain.transfer_template || plain.transferTemplate || '',
    task_reminder_template: plain.task_reminder_template || plain.taskReminderTemplate || '',
    taskReminderTemplate: plain.task_reminder_template || plain.taskReminderTemplate || '',
    deal_won_template: plain.deal_won_template || plain.dealWonTemplate || '',
    dealWonTemplate: plain.deal_won_template || plain.dealWonTemplate || '',
    customer_welcome_template: plain.customer_welcome_template || plain.customerWelcomeTemplate || '',
    customerWelcomeTemplate: plain.customer_welcome_template || plain.customerWelcomeTemplate || '',

    // Provider Credentials
    simply: {
      active: Boolean(simply.active),
      url: simply.url || 'https://app.simplywhatsapp.com/api/send',
      instance_id: simply.instance_id || simply.instanceId || '',
      instanceId: simply.instance_id || simply.instanceId || '',
      access_token: safeSimplyToken,
      accessToken: safeSimplyToken,
      incoming_json: simply.incoming_json || simply.incomingJson || '',
      incomingJson: simply.incoming_json || simply.incomingJson || '',
      transfer_json: simply.transfer_json || simply.transferJson || '',
      transferJson: simply.transfer_json || simply.transferJson || '',
    },
    wapi: {
      active: Boolean(wapi.active),
      wapi_url: wapi.wapi_url || wapi.wapiUrl || 'https://gate.whapi.cloud',
      wapiUrl: wapi.wapi_url || wapi.wapiUrl || 'https://gate.whapi.cloud',
      wapi_token: safeWapiToken,
      wapiToken: safeWapiToken,
      incoming_json: wapi.incoming_json || wapi.incomingJson || '',
      incomingJson: wapi.incoming_json || wapi.incomingJson || '',
      transfer_json: wapi.transfer_json || wapi.transferJson || '',
      transferJson: wapi.transfer_json || wapi.transferJson || '',
    },
    chatSimplified: {
      active: Boolean(cs.active),
      url: cs.url || 'https://www.chatsimplified.co/api/v1/',
      api_key: safeCsApiKey,
      apiKey: safeCsApiKey,
      incoming_json: cs.incoming_json || cs.incomingJson || '',
      incomingJson: cs.incoming_json || cs.incomingJson || '',
      transfer_json: cs.transfer_json || cs.transferJson || '',
      transferJson: cs.transfer_json || cs.transferJson || '',
    },
    chat_simplified: {
      active: Boolean(cs.active),
      url: cs.url || 'https://www.chatsimplified.co/api/v1/',
      api_key: safeCsApiKey,
      apiKey: safeCsApiKey,
      incoming_json: cs.incoming_json || cs.incomingJson || '',
      incomingJson: cs.incoming_json || cs.incomingJson || '',
      transfer_json: cs.transfer_json || cs.transferJson || '',
      transferJson: cs.transfer_json || cs.transferJson || '',
    },
    hasUniversalFallback: false,
    isPlatformManaged: false
  };
}

// GET WhatsApp configuration
router.get('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      const requestedOrg = req.query.organizationId || req.query.organization_id || req.headers['x-organization-id'];
      if (requestedOrg && requestedOrg !== 'all' && requestedOrg !== 'null' && requestedOrg !== 'undefined') {
        orgId = requestedOrg;
      }
    } else {
      orgId = req.user.organizationId || req.user.organization_id || req.query.organizationId || req.headers['x-organization-id'] || null;
    }

    let config = null;
    if (orgId) {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId },
          ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
        ]
      }).lean().exec();

      const targetOrgIds = [orgId, org?._id ? String(org._id) : null, org?.organization_id, org?.organizationId].filter(Boolean);

      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: { $in: targetOrgIds } },
          { organizationId: { $in: targetOrgIds } }
        ]
      }).exec();
    } else {
      // SuperAdmin Global Platform config
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: null },
          { organizationId: null }
        ]
      }).exec();
    }

    const isSuperAdmin = req.user.role === 'superAdmin';

    // If client config doesn't exist yet, return a clean empty tenant config
    if (!config && orgId) {
      return res.json(normalizeConfigPayload({ organization_id: orgId, organizationId: orgId, is_active: true }, orgId, null, isSuperAdmin));
    }

    res.json(normalizeConfigPayload(config, orgId, null, isSuperAdmin));
  } catch (err) {
    next(err);
  }
});

// POST Save WhatsApp configuration
router.post('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can update WhatsApp settings' });
    }

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      const requestedOrg = req.body.organizationId || req.body.organization_id || req.query.organizationId || req.query.organization_id || req.headers['x-organization-id'];
      if (requestedOrg && requestedOrg !== 'all' && requestedOrg !== 'null' && requestedOrg !== 'undefined') {
        orgId = requestedOrg;
      }
    } else {
      orgId = req.user.organizationId || req.user.organization_id || req.body.organizationId || req.body.organization_id || req.headers['x-organization-id'] || null;
    }

    const org = orgId ? await Organization.findOne({
      $or: [
        { organization_id: orgId },
        { organizationId: orgId },
        ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
      ]
    }).lean().exec() : null;

    const targetOrgIds = [orgId, org?._id ? String(org._id) : null, org?.organization_id, org?.organizationId].filter(Boolean);

    let config = null;
    if (targetOrgIds.length > 0) {
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: { $in: targetOrgIds } },
          { organizationId: { $in: targetOrgIds } }
        ]
      }).exec();
    } else {
      // SuperAdmin saving Global Platform config
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: null },
          { organizationId: null }
        ]
      }).exec();
    }

    if (!config) {
      config = new WhatsAppConfig({
        organization_id: org?.organization_id || orgId || null,
        organizationId: org?.organizationId || orgId || null,
        industry_id: req.body.industryId || org?.industry_id || null,
        industryId: req.body.industryId || org?.industryId || null,
        is_universal: !orgId
      });
    }

    if (req.body.type) {
      config.type = req.body.type;
    }
    if (req.body.fields) {
      config.fields = { ...(config.fields || {}), ...req.body.fields };
    }

    // Seamlessly map flat NotificationHub payload to provider objects
    if (!req.body.wapi && (req.body.fields?.wapiToken !== undefined || req.body.wapiToken !== undefined || req.body.fields?.wapiUrl || req.body.wapiUrl || req.body.type === 'WHAPI')) {
      const activeState = req.body.isActive !== undefined ? Boolean(req.body.isActive) : (req.body.active !== undefined ? Boolean(req.body.active) : true);
      const url = req.body.fields?.wapiUrl || req.body.wapiUrl || req.body.url || 'https://gate.whapi.cloud';
      const token = req.body.fields?.wapiToken !== undefined ? req.body.fields?.wapiToken : (req.body.wapiToken !== undefined ? req.body.wapiToken : '');
      req.body.wapi = {
        active: activeState,
        wapi_url: url,
        wapi_token: token,
      };
    }
    if (!req.body.simply && (req.body.type === 'Simply WhatsApp' || req.body.simplyAccessToken !== undefined || req.body.fields?.accessToken !== undefined || req.body.fields?.instanceId !== undefined)) {
      const activeState = req.body.isActive !== undefined ? Boolean(req.body.isActive) : (req.body.active !== undefined ? Boolean(req.body.active) : true);
      req.body.simply = {
        active: activeState,
        url: req.body.fields?.simplyUrl || req.body.simplyUrl || req.body.url || 'https://app.simplywhatsapp.com/api/send',
        instance_id: req.body.fields?.instanceId || req.body.instanceId || req.body.simplyInstanceId || '',
        access_token: req.body.fields?.accessToken || req.body.accessToken || req.body.simplyAccessToken || req.body.fields?.wapiToken || req.body.wapiToken || '',
      };
    }
    if (!req.body.chatSimplified && !req.body.chat_simplified && (req.body.type === 'ChatSimplified' || req.body.csApiKey !== undefined || req.body.fields?.apiKey !== undefined)) {
      const activeState = req.body.isActive !== undefined ? Boolean(req.body.isActive) : (req.body.active !== undefined ? Boolean(req.body.active) : true);
      const csPayload = {
        active: activeState,
        url: req.body.fields?.csUrl || req.body.csUrl || req.body.url || 'https://www.chatsimplified.co/api/v1/',
        api_key: req.body.fields?.apiKey || req.body.apiKey || req.body.csApiKey || req.body.fields?.wapiToken || req.body.wapiToken || '',
      };
      req.body.chatSimplified = csPayload;
      req.body.chat_simplified = csPayload;
    }

    // 1. Update Providers with Deep Merge & Mask Preservation
    if (req.body.simply) {
      const existingSimply = config.simply ? (config.simply.toObject ? config.simply.toObject() : config.simply) : {};
      const inSimply = req.body.simply;
      let inAccessToken = (inSimply.access_token !== undefined ? inSimply.access_token : (inSimply.accessToken !== undefined ? inSimply.accessToken : '')).trim();
      const existingToken = existingSimply.access_token || existingSimply.accessToken || '';
      if (inAccessToken.includes('••••••••') || inAccessToken === '••••••••' || ((inSimply.access_token === undefined && inSimply.accessToken === undefined) && !inAccessToken)) {
        inAccessToken = existingToken;
      }
      config.simply = {
        active: inSimply.active !== undefined ? Boolean(inSimply.active) : Boolean(existingSimply.active),
        url: (inSimply.url || existingSimply.url || 'https://app.simplywhatsapp.com/api/send').trim(),
        instance_id: (inSimply.instance_id !== undefined ? inSimply.instance_id : (inSimply.instanceId !== undefined ? inSimply.instanceId : (existingSimply.instance_id || existingSimply.instanceId || ''))).trim(),
        access_token: inAccessToken,
        incoming_json: inSimply.incoming_json !== undefined ? inSimply.incoming_json : (inSimply.incomingJson !== undefined ? inSimply.incomingJson : (existingSimply.incoming_json || '')),
        transfer_json: inSimply.transfer_json !== undefined ? inSimply.transfer_json : (inSimply.transferJson !== undefined ? inSimply.transferJson : (existingSimply.transfer_json || ''))
      };
    }

    if (req.body.wapi) {
      const existingWapi = config.wapi ? (config.wapi.toObject ? config.wapi.toObject() : config.wapi) : {};
      const inWapi = req.body.wapi;
      let inWapiToken = (inWapi.wapi_token !== undefined ? inWapi.wapi_token : (inWapi.wapiToken !== undefined ? inWapi.wapiToken : '')).trim();
      const existingToken = existingWapi.wapi_token || existingWapi.wapiToken || '';
      if (inWapiToken.includes('••••••••') || inWapiToken === '••••••••' || ((inWapi.wapi_token === undefined && inWapi.wapiToken === undefined) && !inWapiToken)) {
        inWapiToken = existingToken;
      }
      config.wapi = {
        active: inWapi.active !== undefined ? Boolean(inWapi.active) : Boolean(existingWapi.active),
        wapi_url: (inWapi.wapi_url || inWapi.wapiUrl || existingWapi.wapi_url || existingWapi.wapiUrl || 'https://gate.whapi.cloud').trim(),
        wapi_token: inWapiToken,
        incoming_json: inWapi.incoming_json !== undefined ? inWapi.incoming_json : (inWapi.incomingJson !== undefined ? inWapi.incomingJson : (existingWapi.incoming_json || '')),
        transfer_json: inWapi.transfer_json !== undefined ? inWapi.transfer_json : (inWapi.transferJson !== undefined ? inWapi.transferJson : (existingWapi.transfer_json || ''))
      };
    }

    if (req.body.chatSimplified || req.body.chat_simplified) {
      const inCS = req.body.chatSimplified || req.body.chat_simplified;
      const existingCS = (config.chat_simplified || config.chatSimplified)
        ? ((config.chat_simplified || config.chatSimplified).toObject ? (config.chat_simplified || config.chatSimplified).toObject() : (config.chat_simplified || config.chatSimplified))
        : {};
      let inApiKey = (inCS.api_key !== undefined ? inCS.api_key : (inCS.apiKey !== undefined ? inCS.apiKey : '')).trim();
      const existingApiKey = existingCS.api_key || existingCS.apiKey || '';
      if (inApiKey.includes('••••••••') || inApiKey === '••••••••' || ((inCS.api_key === undefined && inCS.apiKey === undefined) && !inApiKey)) {
        inApiKey = existingApiKey;
      }
      const mergedCS = {
        active: inCS.active !== undefined ? Boolean(inCS.active) : Boolean(existingCS.active),
        url: (inCS.url || existingCS.url || 'https://www.chatsimplified.co/api/v1/').trim(),
        api_key: inApiKey,
        incoming_json: inCS.incoming_json !== undefined ? inCS.incoming_json : (inCS.incomingJson !== undefined ? inCS.incomingJson : (existingCS.incoming_json || '')),
        transfer_json: inCS.transfer_json !== undefined ? inCS.transfer_json : (inCS.transferJson !== undefined ? inCS.transferJson : (existingCS.transfer_json || ''))
      };
      config.chat_simplified = mergedCS;
      config.chatSimplified = mergedCS;
    }

    // 2. Gateway Hierarchy & Master Enable/Disable Switch
    let isGatewayActive = true;
    if (req.body.isActive !== undefined) {
      isGatewayActive = Boolean(req.body.isActive);
    } else if (req.body.is_active !== undefined) {
      isGatewayActive = Boolean(req.body.is_active);
    } else if (req.body.active !== undefined) {
      isGatewayActive = Boolean(req.body.active);
    }

    config.is_active = isGatewayActive;
    config.isActive = isGatewayActive;
    config.is_enabled = isGatewayActive;

    if (!isGatewayActive) {
      if (config.wapi) config.wapi.active = false;
      if (config.simply) config.simply.active = false;
      if (config.chat_simplified) config.chat_simplified.active = false;
      if (config.chatSimplified) config.chatSimplified.active = false;
      config.use_custom_api = false;
    } else {
      // Explicitly activate the chosen provider only if credentials exist
      const chosenType = (req.body.type || config.type || 'WHAPI').toLowerCase();
      if (chosenType.includes('simply') && config.simply) {
        config.simply.active = Boolean(config.simply.access_token && config.simply.instance_id);
      } else if ((chosenType.includes('chat') || chosenType.includes('simplified')) && (config.chat_simplified || config.chatSimplified)) {
        const hasKey = Boolean(config.chat_simplified?.api_key || config.chatSimplified?.apiKey);
        if (config.chat_simplified) config.chat_simplified.active = hasKey;
        if (config.chatSimplified) config.chatSimplified.active = hasKey;
      } else if (config.wapi) {
        config.wapi.active = Boolean(config.wapi.wapi_token);
      }
      const hasAnyConfiguredKeys = Boolean(
        (config.wapi?.wapi_token && config.wapi?.active) ||
        (config.simply?.access_token && config.simply?.active) ||
        ((config.chat_simplified?.api_key || config.chatSimplified?.apiKey) && (config.chat_simplified?.active || config.chatSimplified?.active))
      );
      config.use_custom_api = hasAnyConfiguredKeys;
    }

    // Keep flat fields object in exact sync
    if (!config.fields) config.fields = {};
    if (config.wapi) {
      config.fields.wapiUrl = config.wapi.wapi_url;
      config.fields.wapiToken = config.wapi.wapi_token;
    }
    if (config.simply) {
      config.fields.simplyUrl = config.simply.url;
      config.fields.instanceId = config.simply.instance_id;
      config.fields.accessToken = config.simply.access_token;
    }
    if (config.chat_simplified || config.chatSimplified) {
      const csObj = config.chat_simplified || config.chatSimplified;
      config.fields.csUrl = csObj.url;
      config.fields.apiKey = csObj.api_key || csObj.apiKey;
    }

    // Sync master toggle to Organization document for instant circuit-breaker
    if (targetOrgIds.length > 0) {
      await Organization.updateMany(
        {
          $or: [
            { organization_id: { $in: targetOrgIds } },
            { organizationId: { $in: targetOrgIds } },
            ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
          ]
        },
        { $set: { whatsapp_enabled: isGatewayActive, whatsappEnabled: isGatewayActive } }
      ).exec().catch(err => console.warn('[whatsappRoutes] Failed to sync whatsapp_enabled to org:', err.message));
    }

    // 3. Recipient Controls
    if (req.body.notifyAssignedAgent !== undefined || req.body.notify_assigned_agent !== undefined) {
      config.notify_assigned_agent = req.body.notifyAssignedAgent !== undefined ? Boolean(req.body.notifyAssignedAgent) : Boolean(req.body.notify_assigned_agent);
    }
    if (req.body.notifyAdmin !== undefined || req.body.notify_admin !== undefined) {
      config.notify_admin = req.body.notifyAdmin !== undefined ? Boolean(req.body.notifyAdmin) : Boolean(req.body.notify_admin);
    }
    if (req.body.adminPhoneOverride !== undefined || req.body.admin_phone_override !== undefined) {
      config.admin_phone_override = (req.body.adminPhoneOverride !== undefined ? req.body.adminPhoneOverride : req.body.admin_phone_override).trim();
    }
    if (req.body.notifyCustomerWelcome !== undefined || req.body.notify_customer_welcome !== undefined) {
      config.notify_customer_welcome = req.body.notifyCustomerWelcome !== undefined ? Boolean(req.body.notifyCustomerWelcome) : Boolean(req.body.notify_customer_welcome);
    }

    // 4. Scenario Templates
    if (req.body.incomingTemplate !== undefined || req.body.incoming_template !== undefined) {
      config.incoming_template = req.body.incomingTemplate !== undefined ? req.body.incomingTemplate : req.body.incoming_template;
    }
    if (req.body.transferTemplate !== undefined || req.body.transfer_template !== undefined) {
      config.transfer_template = req.body.transferTemplate !== undefined ? req.body.transferTemplate : req.body.transfer_template;
    }
    if (req.body.taskReminderTemplate !== undefined || req.body.task_reminder_template !== undefined) {
      config.task_reminder_template = req.body.taskReminderTemplate !== undefined ? req.body.taskReminderTemplate : req.body.task_reminder_template;
    }
    if (req.body.dealWonTemplate !== undefined || req.body.deal_won_template !== undefined) {
      config.deal_won_template = req.body.dealWonTemplate !== undefined ? req.body.dealWonTemplate : req.body.deal_won_template;
    }
    if (req.body.customerWelcomeTemplate !== undefined || req.body.customer_welcome_template !== undefined) {
      config.customer_welcome_template = req.body.customerWelcomeTemplate !== undefined ? req.body.customerWelcomeTemplate : req.body.customer_welcome_template;
    }

    await config.save();
    const isSuperAdmin = req.user.role === 'superAdmin';
    const universalConfig = await WhatsAppConfig.findOne({
      $or: [
        { organization_id: null },
        { organizationId: null }
      ]
    }).exec();
    res.json(normalizeConfigPayload(config, orgId, universalConfig, isSuperAdmin));
  } catch (err) {
    next(err);
  }
});

// POST Test WhatsApp message dispatch
router.post('/test', authenticate, async (req, res, next) => {
  try {
    let orgId = null;
    if (req.user.role === 'superAdmin') {
      orgId = req.body.organizationId || req.body.organization_id || req.query.organizationId || req.headers['x-organization-id'] || req.user.organizationId || req.user.organization_id;
    } else {
      orgId = req.user.organizationId || req.user.organization_id || req.body.organizationId;
    }

    const { recipientPhone, message, provider, testCredentials } = req.body;
    if (!recipientPhone) {
      return res.status(400).json({ success: false, message: 'Recipient phone number is required for test message.' });
    }

    const result = await sendNotification({
      organizationId: orgId,
      customRecipient: recipientPhone,
      customMessage: message || 'Hello from Leads Rubix CRM! Your WhatsApp notification integration is working perfectly. 🚀',
      eventType: 'test',
      testProvider: provider,
      testCredentials: testCredentials
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    next(err);
  }
});

// GET Delivery Audit Logs
router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const WhatsAppLog = mongoose.model('WhatsAppLog');
    let orgId = null;
    if (req.user.role === 'superAdmin') {
      orgId = req.query.organizationId || req.query.organization_id || null;
    } else {
      orgId = req.user.organizationId || req.user.organization_id || null;
    }

    const filter = {};
    if (orgId && orgId !== 'all') {
      filter.organization_id = orgId;
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const logs = await WhatsAppLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

// POST /whatsapp-config/toggle - Fast, atomic toggle for WhatsApp Gateway
router.post('/toggle', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only admins can toggle WhatsApp gateway' });
    }
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      orgId = req.body.organizationId || req.body.organization_id || req.headers['x-organization-id'] || null;
    } else {
      orgId = req.user.organizationId || req.user.organization_id || null;
    }

    const isEnabled = req.body.isActive !== undefined ? Boolean(req.body.isActive) : Boolean(req.body.isEnabled);

    const org = orgId ? await Organization.findOne({
      $or: [
        { organization_id: orgId },
        { organizationId: orgId },
        ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ _id: orgId }] : [])
      ]
    }).lean().exec() : null;

    const targetOrgIds = [orgId, org?._id ? String(org._id) : null, org?.organization_id, org?.organizationId].filter(Boolean);

    // Atomically sync Organization document
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

    // Atomically sync WhatsAppConfig document
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

    return res.json({
      success: true,
      message: `WhatsApp Gateway ${isEnabled ? 'activated' : 'disabled'} for workspace.`,
      isActive: isEnabled
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
