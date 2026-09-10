const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { sendNotification } = require('../services/whatsappService');

const router = express.Router();

/**
 * Normalizes a WhatsAppConfig document into a dual-cased, frontend-friendly payload
 */
function normalizeConfigPayload(config, targetOrgId = null) {
  const plain = config ? (config.toObject ? config.toObject({ virtuals: true, getters: true }) : config) : {};
  const simply = plain.simply || {};
  const wapi = plain.wapi || {};
  const cs = plain.chat_simplified || plain.chatSimplified || {};

  const orgId = plain.organization_id || plain.organizationId || targetOrgId || null;
  const indId = plain.industry_id || plain.industryId || null;

  return {
    _id: plain._id || null,
    organization_id: orgId,
    organizationId: orgId,
    industry_id: indId,
    industryId: indId,
    simply: {
      active: Boolean(simply.active),
      url: simply.url || 'https://app.simplywhatsapp.com/api/send',
      instance_id: simply.instance_id || simply.instanceId || '',
      instanceId: simply.instance_id || simply.instanceId || '',
      access_token: simply.access_token || simply.accessToken || '',
      accessToken: simply.access_token || simply.accessToken || '',
      incoming_json: simply.incoming_json || simply.incomingJson || '',
      incomingJson: simply.incoming_json || simply.incomingJson || '',
      transfer_json: simply.transfer_json || simply.transferJson || '',
      transferJson: simply.transfer_json || simply.transferJson || '',
    },
    wapi: {
      active: Boolean(wapi.active),
      wapi_url: wapi.wapi_url || wapi.wapiUrl || 'https://gate.whapi.cloud',
      wapiUrl: wapi.wapi_url || wapi.wapiUrl || 'https://gate.whapi.cloud',
      wapi_token: wapi.wapi_token || wapi.wapiToken || '',
      wapiToken: wapi.wapi_token || wapi.wapiToken || '',
      incoming_json: wapi.incoming_json || wapi.incomingJson || '',
      incomingJson: wapi.incoming_json || wapi.incomingJson || '',
      transfer_json: wapi.transfer_json || wapi.transferJson || '',
      transferJson: wapi.transfer_json || wapi.transferJson || '',
    },
    chatSimplified: {
      active: Boolean(cs.active),
      url: cs.url || 'https://www.chatsimplified.co/api/v1/',
      api_key: cs.api_key || cs.apiKey || '',
      apiKey: cs.api_key || cs.apiKey || '',
      incoming_json: cs.incoming_json || cs.incomingJson || '',
      incomingJson: cs.incoming_json || cs.incomingJson || '',
      transfer_json: cs.transfer_json || cs.transferJson || '',
      transferJson: cs.transfer_json || cs.transferJson || '',
    },
    chat_simplified: {
      active: Boolean(cs.active),
      url: cs.url || 'https://www.chatsimplified.co/api/v1/',
      api_key: cs.api_key || cs.apiKey || '',
      apiKey: cs.api_key || cs.apiKey || '',
      incoming_json: cs.incoming_json || cs.incomingJson || '',
      incomingJson: cs.incoming_json || cs.incomingJson || '',
      transfer_json: cs.transfer_json || cs.transferJson || '',
      transferJson: cs.transfer_json || cs.transferJson || '',
    }
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
    }

    // Fallback to global default config if tenant-specific not yet saved
    if (!config) {
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: null },
          { organizationId: null }
        ]
      }).exec();
    }

    res.json(normalizeConfigPayload(config, orgId));
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
      // SuperAdmin saving Global default config
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: null },
          { organizationId: null }
        ]
      }).exec();
    }

    if (!config) {
      // Inherit templates from global config if available
      const globalConfig = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: null },
          { organizationId: null }
        ]
      }).exec();

      config = new WhatsAppConfig({
        organization_id: org?.organization_id || orgId || null,
        organizationId: org?.organizationId || orgId || null,
        industry_id: req.body.industryId || org?.industry_id || null,
        industryId: req.body.industryId || org?.industryId || null,
        simply: globalConfig?.simply || undefined,
        wapi: globalConfig?.wapi || undefined,
        chat_simplified: globalConfig?.chat_simplified || undefined,
      });
    }

    if (req.body.simply) {
      const existingSimply = config.simply ? (config.simply.toObject ? config.simply.toObject() : config.simply) : {};
      const inSimply = req.body.simply;
      config.simply = {
        active: inSimply.active !== undefined ? Boolean(inSimply.active) : Boolean(existingSimply.active),
        url: (inSimply.url || existingSimply.url || 'https://app.simplywhatsapp.com/api/send').trim(),
        instance_id: (inSimply.instance_id !== undefined ? inSimply.instance_id : (inSimply.instanceId !== undefined ? inSimply.instanceId : (existingSimply.instance_id || existingSimply.instanceId || ''))).trim(),
        access_token: (inSimply.access_token !== undefined ? inSimply.access_token : (inSimply.accessToken !== undefined ? inSimply.accessToken : (existingSimply.access_token || existingSimply.accessToken || ''))).trim(),
        incoming_json: inSimply.incoming_json !== undefined ? inSimply.incoming_json : (inSimply.incomingJson !== undefined ? inSimply.incomingJson : (existingSimply.incoming_json || '')),
        transfer_json: inSimply.transfer_json !== undefined ? inSimply.transfer_json : (inSimply.transferJson !== undefined ? inSimply.transferJson : (existingSimply.transfer_json || ''))
      };
    }

    if (req.body.wapi) {
      const existingWapi = config.wapi ? (config.wapi.toObject ? config.wapi.toObject() : config.wapi) : {};
      const inWapi = req.body.wapi;
      config.wapi = {
        active: inWapi.active !== undefined ? Boolean(inWapi.active) : Boolean(existingWapi.active),
        wapi_url: (inWapi.wapi_url || inWapi.wapiUrl || existingWapi.wapi_url || existingWapi.wapiUrl || 'https://gate.whapi.cloud').trim(),
        wapi_token: (inWapi.wapi_token !== undefined ? inWapi.wapi_token : (inWapi.wapiToken !== undefined ? inWapi.wapiToken : (existingWapi.wapi_token || existingWapi.wapiToken || ''))).trim(),
        incoming_json: inWapi.incoming_json !== undefined ? inWapi.incoming_json : (inWapi.incomingJson !== undefined ? inWapi.incomingJson : (existingWapi.incoming_json || '')),
        transfer_json: inWapi.transfer_json !== undefined ? inWapi.transfer_json : (inWapi.transferJson !== undefined ? inWapi.transferJson : (existingWapi.transfer_json || ''))
      };
    }

    if (req.body.chatSimplified || req.body.chat_simplified) {
      const inCS = req.body.chatSimplified || req.body.chat_simplified;
      const existingCS = (config.chat_simplified || config.chatSimplified)
        ? ((config.chat_simplified || config.chatSimplified).toObject ? (config.chat_simplified || config.chatSimplified).toObject() : (config.chat_simplified || config.chatSimplified))
        : {};
      const mergedCS = {
        active: inCS.active !== undefined ? Boolean(inCS.active) : Boolean(existingCS.active),
        url: (inCS.url || existingCS.url || 'https://www.chatsimplified.co/api/v1/').trim(),
        api_key: (inCS.api_key !== undefined ? inCS.api_key : (inCS.apiKey !== undefined ? inCS.apiKey : (existingCS.api_key || existingCS.apiKey || ''))).trim(),
        incoming_json: inCS.incoming_json !== undefined ? inCS.incoming_json : (inCS.incomingJson !== undefined ? inCS.incomingJson : (existingCS.incoming_json || '')),
        transfer_json: inCS.transfer_json !== undefined ? inCS.transfer_json : (inCS.transferJson !== undefined ? inCS.transferJson : (existingCS.transfer_json || ''))
      };
      config.chat_simplified = mergedCS;
      config.chatSimplified = mergedCS;
    }

    await config.save();
    res.json(normalizeConfigPayload(config, orgId));
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
      eventType: 'incoming',
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

module.exports = router;
