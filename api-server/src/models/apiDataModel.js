const mongoose = require('mongoose');

const apiDataSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    status: { type: String, default: 'SUCCESS' }, // SUCCESS, FAILED
    fail_reason: { type: String, default: '', alias: 'failReason' },
    created_at: { type: Date, default: Date.now, alias: 'createdAt' }
  },
  {
    strict: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const ApiData = mongoose.model('ApiData', apiDataSchema, 'api_data_logs');

module.exports = ApiData;
