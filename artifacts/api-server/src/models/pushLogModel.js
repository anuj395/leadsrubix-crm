const mongoose = require('mongoose');

const pushLogSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true },
    organization_name: { type: String, default: '' },
    user_id: { type: String, required: true, index: true },
    user_email: { type: String, required: true },
    user_name: { type: String, default: '' },
    event_type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['DELIVERED', 'FAILED', 'SUPPRESSED_INACTIVE', 'SUPPRESSED_QUOTA'], 
      required: true 
    },
    aws_message_id: { type: String, default: '' },
    error_message: { type: String, default: '' },
    sent_at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const PushLog = mongoose.model('PushLog', pushLogSchema, 'push_logs');

module.exports = {
  PushLog
};
