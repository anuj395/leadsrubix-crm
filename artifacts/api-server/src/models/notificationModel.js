const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    organization_id: { type: String, required: true, index: true },
    workspace_id: { type: String, default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    related_id: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

notificationSchema.index({ organization_id: 1, user_id: 1, is_read: 1 });

const Notification = mongoose.model(
  'Notification',
  notificationSchema,
  'notifications'
);

exports.Notification = Notification;
