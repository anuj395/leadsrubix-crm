const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true }, // null = platform default, string = tenant org
    industry_id: { type: String, default: 'default', index: true }, // temp0001 - temp0007 or default
    event_key: { type: String, required: true, index: true }, // 'lead.created', 'lead.assigned', etc.
    channel: {
      type: String,
      required: true,
      enum: ['whatsapp', 'email', 'push', 'in_app'],
      index: true
    },
    name: { type: String, default: '' },
    subject_template: { type: String, default: '' }, // For Email subject or Push/In-App title
    body_template: { type: String, required: true },
    cta_label: { type: String, default: '' },
    cta_url_template: { type: String, default: '' },
    is_active: { type: Boolean, default: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

// Virtual aliases
notificationTemplateSchema.virtual('organizationId')
  .get(function () { return this.organization_id; })
  .set(function (v) { this.organization_id = v; });

notificationTemplateSchema.virtual('industryId')
  .get(function () { return this.industry_id; })
  .set(function (v) { this.industry_id = v; });

notificationTemplateSchema.virtual('eventKey')
  .get(function () { return this.event_key; })
  .set(function (v) { this.event_key = v; });

notificationTemplateSchema.virtual('subjectTemplate')
  .get(function () { return this.subject_template; })
  .set(function (v) { this.subject_template = v; });

notificationTemplateSchema.virtual('bodyTemplate')
  .get(function () { return this.body_template; })
  .set(function (v) { this.body_template = v; });

notificationTemplateSchema.virtual('ctaLabel')
  .get(function () { return this.cta_label; })
  .set(function (v) { this.cta_label = v; });

notificationTemplateSchema.virtual('ctaUrlTemplate')
  .get(function () { return this.cta_url_template; })
  .set(function (v) { this.cta_url_template = v; });

notificationTemplateSchema.virtual('isActive')
  .get(function () { return this.is_active; })
  .set(function (v) { this.is_active = v; });

notificationTemplateSchema.index({ organization_id: 1, event_key: 1, channel: 1 }, { unique: true });

const NotificationTemplate = mongoose.model(
  'NotificationTemplate',
  notificationTemplateSchema,
  'notification_templates'
);

module.exports = { NotificationTemplate };
