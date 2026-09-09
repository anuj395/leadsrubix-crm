const mongoose = require('mongoose');

const pushQuotaSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, unique: true, index: true },
    monthly_limit: { type: Number, default: 10000 },
    used_count: { type: Number, default: 0 },
    billing_month: { type: String, required: true } // 'YYYY-MM'
  },
  { timestamps: true }
);

const PushQuota = mongoose.model('PushQuota', pushQuotaSchema, 'push_quotas');

module.exports = {
  PushQuota
};
