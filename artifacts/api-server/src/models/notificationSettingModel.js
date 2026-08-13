const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true },
    user_id: { type: String, default: null, index: true }, // null means organization-wide setting
    notification_type: { type: String, required: true },
    is_enabled: { type: Boolean, default: true },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

notificationSettingSchema.index({ organization_id: 1, user_id: 1, notification_type: 1 }, { unique: true });

const NotificationSetting = mongoose.model(
  'NotificationSetting',
  notificationSettingSchema,
  'notification_settings'
);

exports.NotificationSetting = NotificationSetting;
