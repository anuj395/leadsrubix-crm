const mongoose = require('mongoose');

const whatsappConfigSchema = new mongoose.Schema(
  {
    industry_id: { type: String, default: null, alias: 'industryId' },
    organization_id: { type: String, default: null, alias: 'organizationId' }, // null for global default
    
    // Gateway Hierarchy & Mode
    is_universal: { type: Boolean, default: false, alias: 'isUniversal' }, // true for SuperAdmin Global record
    use_custom_api: { type: Boolean, default: false, alias: 'useCustomApi' }, // true = use custom client provider, false = inherit universal gateway
    
    // Recipient Controls
    notify_assigned_agent: { type: Boolean, default: true, alias: 'notifyAssignedAgent' },
    notify_admin: { type: Boolean, default: true, alias: 'notifyAdmin' },
    admin_phone_override: { type: String, default: '', alias: 'adminPhoneOverride' },
    notify_customer_welcome: { type: Boolean, default: false, alias: 'notifyCustomerWelcome' },
    
    // Multi-Scenario Templates
    incoming_template: { type: String, default: '', alias: 'incomingTemplate' },
    transfer_template: { type: String, default: '', alias: 'transferTemplate' },
    task_reminder_template: { type: String, default: '', alias: 'taskReminderTemplate' },
    deal_won_template: { type: String, default: '', alias: 'dealWonTemplate' },
    customer_welcome_template: { type: String, default: '', alias: 'customerWelcomeTemplate' },
    
    simply: {
      active: { type: Boolean, default: false },
      url: { type: String, default: 'https://app.simplywhatsapp.com/api/send' },
      instance_id: { type: String, default: '', alias: 'instanceId' },
      access_token: { type: String, default: '', alias: 'accessToken' },
      incoming_json: { type: String, default: '', alias: 'incomingJson' },
      transfer_json: { type: String, default: '', alias: 'transferJson' }
    },
    wapi: {
      active: { type: Boolean, default: false },
      wapi_url: { type: String, default: 'https://gate.whapi.cloud', alias: 'wapiUrl' },
      wapi_token: { type: String, default: '', alias: 'wapiToken' },
      incoming_json: { type: String, default: '', alias: 'incomingJson' },
      transfer_json: { type: String, default: '', alias: 'transferJson' }
    },
    chat_simplified: {
      type: new mongoose.Schema({
        active: { type: Boolean, default: false },
        url: { type: String, default: 'https://www.chatsimplified.co/api/v1/' },
        api_key: { type: String, default: '', alias: 'apiKey' },
        incoming_json: { type: String, default: '', alias: 'incomingJson' },
        transfer_json: { type: String, default: '', alias: 'transferJson' }
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
