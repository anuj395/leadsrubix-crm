const mongoose = require('mongoose');

const apiTokenSchema = new mongoose.Schema(
  {
    api_key: { type: String, required: true, unique: true },
    organizationId: { type: String, required: true, alias: 'organization_id' },
    source: { type: String, required: true }, // e.g. "Webhook", "Facebook"
    leadSourceId: { type: String, default: null }, // camelCase matching Firebase
    countryCode: { type: String, default: '+91', alias: 'country_code' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const ApiToken = mongoose.model('ApiToken', apiTokenSchema, 'apiTokens');

module.exports = ApiToken;
