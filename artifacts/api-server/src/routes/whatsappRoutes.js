const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const Organization = mongoose.model('Organization');

    let orgId = null;
    if (req.user.role !== 'superAdmin') {
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      orgId = org ? org.organizationId : null;
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
    if (req.user.role === 'admin') {
      const org = await Organization.findOne({ industryId: req.user.industryId }).exec();
      orgId = org ? org.organizationId : null;
      if (!orgId) {
        return res.status(400).json({ message: 'Error: User organization not found' });
      }
    }

    // Upsert the WhatsApp config
    let config = await WhatsAppConfig.findOne({ organizationId: orgId }).exec();
    if (!config) {
      config = new WhatsAppConfig({ organizationId: orgId });
    }

    // Assign payload fields (simply, wapi, chatSimplified)
    if (req.body.simply) {
      config.simply = { ...config.simply.toObject(), ...req.body.simply };
    }
    if (req.body.wapi) {
      config.wapi = { ...config.wapi.toObject(), ...req.body.wapi };
    }
    if (req.body.chatSimplified) {
      config.chatSimplified = { ...config.chatSimplified.toObject(), ...req.body.chatSimplified };
    }

    await config.save();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
