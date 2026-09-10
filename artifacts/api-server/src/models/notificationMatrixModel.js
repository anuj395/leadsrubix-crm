const mongoose = require('mongoose');

const notificationMatrixSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: null, index: true }, // null = platform default, string = tenant org
    event_key: { type: String, required: true, index: true }, // e.g. 'lead.created', 'lead.assigned', 'task.reminder', etc.
    event_label: { type: String, default: '' },
    is_enabled: { type: Boolean, default: true },
    routing: {
      assigned_agent: {
        enabled: { type: Boolean, default: true },
        channels: {
          whatsapp: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          in_app: { type: Boolean, default: true }
        }
      },
      team_lead: {
        enabled: { type: Boolean, default: false },
        channels: {
          whatsapp: { type: Boolean, default: false },
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          in_app: { type: Boolean, default: true }
        }
      },
      org_admin: {
        enabled: { type: Boolean, default: true },
        channels: {
          whatsapp: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
          in_app: { type: Boolean, default: true }
        },
        override_phone: { type: String, default: '' },
        override_email: { type: String, default: '' }
      },
      customer: {
        enabled: { type: Boolean, default: false },
        channels: {
          whatsapp: { type: Boolean, default: false },
          email: { type: Boolean, default: false }
        }
      }
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

// Virtual aliases
notificationMatrixSchema.virtual('organizationId')
  .get(function () { return this.organization_id; })
  .set(function (v) { this.organization_id = v; });

notificationMatrixSchema.virtual('eventKey')
  .get(function () { return this.event_key; })
  .set(function (v) { this.event_key = v; });

notificationMatrixSchema.virtual('eventLabel')
  .get(function () { return this.event_label; })
  .set(function (v) { this.event_label = v; });

notificationMatrixSchema.virtual('isEnabled')
  .get(function () { return this.is_enabled; })
  .set(function (v) { this.is_enabled = v; });

notificationMatrixSchema.index({ organization_id: 1, event_key: 1 }, { unique: true });

const NotificationMatrixRule = mongoose.model(
  'NotificationMatrixRule',
  notificationMatrixSchema,
  'notification_matrix_rules'
);

module.exports = { NotificationMatrixRule };
