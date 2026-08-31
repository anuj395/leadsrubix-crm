const mongoose = require('mongoose');

const apiTokenSchema = new mongoose.Schema(
  {
    api_key: { type: String, required: true, unique: true },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    industry_id: { type: String, default: null, alias: 'industryId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    source: { type: String, required: true }, // e.g. "Webhook", "Facebook"
    lead_source_id: { type: String, default: null, alias: 'leadSourceId' }, // camelCase matching Firebase
    country_code: { type: String, default: '+91', alias: 'countryCode' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    access_token: { type: String, alias: 'accessToken' },
    facebook_pages: { type: Array, alias: 'facebookPages' },
    page_id: { type: Array, alias: 'pageId' },
    app_id: { type: String, alias: 'appId' },
    app_secret: { type: String, alias: 'appSecret' },
    user_name: { type: String, alias: 'userName' },
    user_picture: { type: String, alias: 'userPicture' },
    fb_user_id: { type: String, alias: 'fbUserId' },
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
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

const ApiToken = mongoose.model('ApiToken', apiTokenSchema, 'api_tokens');

module.exports = ApiToken;
