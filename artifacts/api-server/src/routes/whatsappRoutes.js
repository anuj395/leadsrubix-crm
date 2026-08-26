const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');
const { sendNotification } = require('../services/whatsappService');

const router = express.Router();

// GET WhatsApp configuration
router.get('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      if (req.query.organizationId && req.query.organizationId !== 'all') {
        orgId = req.query.organizationId;
      }
    } else {
      orgId = req.user.organizationId || req.user.organization_id;
    }

    let config = null;
    if (orgId) {
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      }).exec();
    }

    if (!config) {
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: null },
          { organizationId: null }
        ]
      }).exec();
    }

    if (!config) {
      config = {
        simply: {
          active: false,
          url: 'https://app.simplywhatsapp.com/api/send',
          instanceId: '',
          accessToken: '',
          incoming_json: '{\n  "Customer Name": "customer_name",\n  "Contact No": "contact_no",\n  "Project": "project",\n  "Source": "lead_source"\n}',
          transfer_json: '{\n  "Customer Name": "customer_name",\n  "Contact No": "contact_no",\n  "Project": "project",\n  "Assigned Agent": "assigned_agent"\n}'
        },
        wapi: {
          active: false,
          wapi_url: 'https://gate.whapi.cloud',
          wapi_token: '',
          incoming_json: '',
          transfer_json: ''
        },
        chatSimplified: {
          active: false,
          url: 'https://www.chatsimplified.co/api/v1/',
          api_key: '',
          incoming_json: '',
          transfer_json: ''
        }
      };
    }

    res.json(config);
  } catch (err) {
    next(err);
  }
});

// POST Save WhatsApp configuration
router.post('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');

    if (req.user.role !== 'superAdmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only admins and superAdmins can update WhatsApp settings' });
    }

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      const requestedOrg = req.body.organizationId || req.query.organizationId;
      if (requestedOrg && requestedOrg !== 'all') {
        orgId = requestedOrg;
      }
    } else {
      orgId = req.user.organizationId || req.user.organization_id;
    }

    let config = null;
    if (orgId) {
      config = await WhatsAppConfig.findOne({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      }).exec();
    }

    if (!config) {
      config = new WhatsAppConfig({
        organization_id: orgId,
        organizationId: orgId
      });
    }

    if (req.body.simply) {
      const existingSimply = config.simply ? (config.simply.toObject ? config.simply.toObject() : config.simply) : {};
      config.simply = { ...existingSimply, ...req.body.simply };
    }
    if (req.body.wapi) {
      const existingWapi = config.wapi ? (config.wapi.toObject ? config.wapi.toObject() : config.wapi) : {};
      config.wapi = { ...existingWapi, ...req.body.wapi };
    }
    if (req.body.chatSimplified || req.body.chat_simplified) {
      const payloadCS = req.body.chatSimplified || req.body.chat_simplified;
      const existingCS = config.chatSimplified ? (config.chatSimplified.toObject ? config.chatSimplified.toObject() : config.chatSimplified) : {};
      config.chatSimplified = { ...existingCS, ...payloadCS };
      config.chat_simplified = { ...existingCS, ...payloadCS };
    }

    await config.save();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// POST Test WhatsApp message dispatch
router.post('/test', authenticate, async (req, res, next) => {
  try {
    let orgId = null;
    if (req.user.role === 'superAdmin') {
      orgId = req.body.organizationId || req.query.organizationId || req.user.organizationId || req.user.organization_id;
    } else {
      orgId = req.user.organizationId || req.user.organization_id;
    }

    const { recipientPhone, message } = req.body;
    if (!recipientPhone) {
      return res.status(400).json({ message: 'Recipient phone number is required for test message.' });
    }

    const result = await sendNotification({
      organizationId: orgId,
      customRecipient: recipientPhone,
      customMessage: message || 'Hello from Leads Rubix CRM! Your WhatsApp notification integration is working perfectly. 🚀',
      eventType: 'incoming'
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
