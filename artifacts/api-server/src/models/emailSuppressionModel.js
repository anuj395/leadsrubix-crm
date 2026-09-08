const mongoose = require('mongoose');

const emailSuppressionSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    reason: {
      type: String,
      enum: ['HARD_BOUNCE', 'SPAM_COMPLAINT', 'MANUAL_UNSUBSCRIBE'],
      default: 'HARD_BOUNCE'
    },
    details: { type: Object, default: {} }
  },
  {
    timestamps: true,
    strict: false,
    minimize: false
  }
);

emailSuppressionSchema.index({ organization_id: 1, email: 1 }, { unique: true });

const EmailSuppression = mongoose.model('EmailSuppression', emailSuppressionSchema, 'email_suppressions');

module.exports = EmailSuppression;
