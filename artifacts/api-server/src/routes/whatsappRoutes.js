const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');

    let orgId = null;
    if (req.user.role === 'superAdmin') {
      if (req.query.organizationId && req.query.organizationId !== 'all') {
        orgId = req.query.organizationId;
      }
    } else {
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      orgId = org ? (org.organizationId || String(org._id)) : req.user.organizationId;
    }

    // Try finding the organization specific config
    let config = null;
    if (orgId) {
      config = await WhatsAppConfig.findOne({ organizationId: orgId }).exec();
    }

    // If no org config, look for global default config
    if (!config) {
      config = await WhatsAppConfig.findOne({ organizationId: null }).exec();
    }

    // If still no config, return a default template
    if (!config) {
      config = {
        simply: {
          active: false,
          url: 'https://app.simplywhatsapp.com/api/send',
          instanceId: '',
          accessToken: '',
          incoming_json: '',
          transfer_json: ''
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

router.post('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');

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
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      orgId = org ? (org.organizationId || String(org._id)) : req.user.organizationId;
    }

    // Upsert the WhatsApp config
    let config = await WhatsAppConfig.findOne({ organizationId: orgId }).exec();
    if (!config) {
      config = new WhatsAppConfig({ organizationId: orgId });
    }

    // Assign payload fields (simply, wapi, chatSimplified)
    if (req.body.simply) {
      const existingSimply = config.simply ? (config.simply.toObject ? config.simply.toObject() : config.simply) : {};
      config.simply = { ...existingSimply, ...req.body.simply };
    }
    if (req.body.wapi) {
      const existingWapi = config.wapi ? (config.wapi.toObject ? config.wapi.toObject() : config.wapi) : {};
      config.wapi = { ...existingWapi, ...req.body.wapi };
    }
    if (req.body.chatSimplified) {
      const existingCS = config.chatSimplified ? (config.chatSimplified.toObject ? config.chatSimplified.toObject() : config.chatSimplified) : {};
      config.chatSimplified = { ...existingCS, ...req.body.chatSimplified };
    }

    await config.save();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
