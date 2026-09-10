const mongoose = require('mongoose');

const whatsappLogSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    organization_name: { type: String, default: '', alias: 'organizationName' },
    recipient_phone: { type: String, required: true, alias: 'recipientPhone' },
    recipient_name: { type: String, default: '', alias: 'recipientName' },
    recipient_type: { 
      type: String, 
      enum: ['agent', 'admin', 'customer', 'custom'], 
      default: 'agent', 
      alias: 'recipientType' 
    },
    event_type: { 
      type: String, 
      enum: ['incoming', 'transfer', 'task_reminder', 'deal_won', 'test'], 
      default: 'incoming', 
      alias: 'eventType' 
    },
    provider: { 
      type: String, 
      enum: ['wapi', 'simply', 'chatsimplified'], 
      default: 'wapi' 
    },
    is_universal: { type: Boolean, default: false, alias: 'isUniversal' },
    status: { 
      type: String, 
      enum: ['SUCCESS', 'FAILED'], 
      default: 'SUCCESS' 
    },
    error_message: { type: String, default: '', alias: 'errorMessage' },
    message_body: { type: String, default: '', alias: 'messageBody' },
    contact_id: { type: String, default: '', alias: 'contactId' },
    sent_at: { type: Date, default: Date.now, alias: 'sentAt' }
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const WhatsAppLog = mongoose.model('WhatsAppLog', whatsappLogSchema, 'whatsapp_logs');

module.exports = {
  WhatsAppLog
};
