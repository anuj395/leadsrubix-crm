const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    lead_id: { type: String, default: null, index: true, alias: 'leadId' },
    recipient: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    subject: { type: String, required: true },
    trigger_action: { type: String, default: 'manual', alias: 'triggerAction' },
    provider: { type: String, default: 'AWS_SES_DEFAULT' },
    status: {
      type: String,
      enum: ['QUEUED', 'SENT', 'FAILED', 'BOUNCED', 'COMPLAINT', 'QUOTA_EXCEEDED', 'SUPPRESSED'],
      default: 'QUEUED',
      index: true
    },
    ses_message_id: { type: String, default: null, alias: 'sesMessageId' },
    error_message: { type: String, default: null, alias: 'errorMessage' },
    duration_ms: { type: Number, default: 0, alias: 'durationMs' },
    metadata: { type: Object, default: {} }
  },
  {
    timestamps: true,
    strict: false,
    minimize: false
  }
);

emailLogSchema.index({ organization_id: 1, createdAt: -1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema, 'email_logs');

module.exports = EmailLog;
