const mongoose = require('mongoose');

const whatsappConfigSchema = new mongoose.Schema(
  {
    organizationId: { type: String, default: null }, // null for global default
    simply: {
      active: { type: Boolean, default: false },
      url: { type: String, default: 'https://app.simplywhatsapp.com/api/send' },
      instanceId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      incoming_json: { type: String, default: '' },
      transfer_json: { type: String, default: '' }
    },
    wapi: {
      active: { type: Boolean, default: false },
      wapi_url: { type: String, default: 'https://gate.whapi.cloud' },
      wapi_token: { type: String, default: '' },
      incoming_json: { type: String, default: '' },
      transfer_json: { type: String, default: '' }
    },
    chatSimplified: {
      active: { type: Boolean, default: false },
      url: { type: String, default: 'https://www.chatsimplified.co/api/v1/' },
      api_key: { type: String, default: '' },
      incoming_json: { type: String, default: '' },
      transfer_json: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

const WhatsAppConfig = mongoose.model('WhatsAppConfig', whatsappConfigSchema, 'whatsapp_configs');

exports.WhatsAppConfig = WhatsAppConfig;
