const mongoose = require('mongoose');

const apiTokenSchema = new mongoose.Schema(
  {
    api_key: { type: String, required: true, unique: true },
    organizationId: { type: String, required: true },
    source: { type: String, required: true }, // e.g. "Webhook", "Facebook"
    leadSourceId: { type: String, default: null }, // camelCase matching Firebase
    countryCode: { type: String, default: '+91', alias: 'country_code' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    access_token: { type: String },
    facebook_pages: { type: Array },
    page_id: { type: Array },
    app_id: { type: String },
    app_secret: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

apiTokenSchema.pre('save', function (next) {
  if (this.source && String(this.source).toLowerCase() !== 'facebook') {
    this.access_token = undefined;
    this.facebook_pages = undefined;
    this.page_id = undefined;
    this.app_id = undefined;
    this.app_secret = undefined;
  }
  next();
});

const ApiToken = mongoose.model('ApiToken', apiTokenSchema, 'apiTokens');

module.exports = ApiToken;
