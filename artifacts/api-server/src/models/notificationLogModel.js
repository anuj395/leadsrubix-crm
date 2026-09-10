const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true },
    event_key: { type: String, required: true, index: true },
    channel: {
      type: String,
      required: true,
      enum: ['whatsapp', 'email', 'push', 'in_app'],
      index: true
    },
    recipient_role: {
      type: String,
      required: true,
      enum: ['agent', 'team_lead', 'admin', 'customer', 'custom'],
      default: 'agent',
      index: true
    },
    recipient_name: { type: String, default: '' },
    recipient_target: { type: String, required: true }, // Phone number, email address, device token, or user ID
    provider: { type: String, default: 'system' }, // 'whapi', 'simply', 'chatsimplified', 'smtp', 'aws_ses', 'aws_sns', 'in_app'
    is_universal: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'SUPPRESSED'],
      default: 'SUCCESS',
      index: true
    },
    title: { type: String, default: '' },
    message_body: { type: String, default: '' },
    error_message: { type: String, default: '' },
    latency_ms: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

// Virtual aliases
notificationLogSchema.virtual('organizationId')
  .get(function () { return this.organization_id; })
  .set(function (v) { this.organization_id = v; });

notificationLogSchema.virtual('eventKey')
  .get(function () { return this.event_key; })
  .set(function (v) { this.event_key = v; });

notificationLogSchema.virtual('recipientRole')
  .get(function () { return this.recipient_role; })
  .set(function (v) { this.recipient_role = v; });

notificationLogSchema.virtual('recipientName')
  .get(function () { return this.recipient_name; })
  .set(function (v) { this.recipient_name = v; });

notificationLogSchema.virtual('recipientTarget')
  .get(function () { return this.recipient_target; })
  .set(function (v) { this.recipient_target = v; });

notificationLogSchema.virtual('isUniversal')
  .get(function () { return this.is_universal; })
  .set(function (v) { this.is_universal = v; });

notificationLogSchema.virtual('messageBody')
  .get(function () { return this.message_body; })
  .set(function (v) { this.message_body = v; });

notificationLogSchema.virtual('errorMessage')
  .get(function () { return this.error_message; })
  .set(function (v) { this.error_message = v; });

notificationLogSchema.virtual('latencyMs')
  .get(function () { return this.latency_ms; })
  .set(function (v) { this.latency_ms = v; });

notificationLogSchema.index({ organization_id: 1, created_at: -1 });

const NotificationLog = mongoose.model(
  'NotificationLog',
  notificationLogSchema,
  'notification_logs'
);

module.exports = { NotificationLog };
