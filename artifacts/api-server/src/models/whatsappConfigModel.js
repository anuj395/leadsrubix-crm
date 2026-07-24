const mongoose = require('mongoose');

const whatsappConfigSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, alias: 'organizationId' }, // null for global default
    simply: {
      active: { type: Boolean, default: false },
      url: { type: String, default: 'https://app.simplywhatsapp.com/api/send' },
      instance_id: { type: String, default: '', alias: 'instanceId' },
      access_token: { type: String, default: '', alias: 'accessToken' },
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
    chat_simplified: {
      type: new mongoose.Schema({
        active: { type: Boolean, default: false },
        url: { type: String, default: 'https://www.chatsimplified.co/api/v1/' },
        api_key: { type: String, default: '' },
        incoming_json: { type: String, default: '' },
        transfer_json: { type: String, default: '' }
      }),
      default: () => ({}),
      alias: 'chatSimplified'
    }
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const WhatsAppConfig = mongoose.model('WhatsAppConfig', whatsappConfigSchema, 'whatsapp_configs');

exports.WhatsAppConfig = WhatsAppConfig;
