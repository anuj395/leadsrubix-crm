const mongoose = require('mongoose');

const systemGatewayControlSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global_master_controls', unique: true },
    whatsapp_enabled: { type: Boolean, default: true, alias: 'whatsappEnabled' },
    email_enabled: { type: Boolean, default: true, alias: 'emailEnabled' },
    push_enabled: { type: Boolean, default: true, alias: 'pushEnabled' },
    in_app_enabled: { type: Boolean, default: true, alias: 'inAppEnabled' }
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

systemGatewayControlSchema.virtual('whatsappEnabled')
  .get(function () { return this.whatsapp_enabled; })
  .set(function (v) { this.whatsapp_enabled = v; });

systemGatewayControlSchema.virtual('emailEnabled')
  .get(function () { return this.email_enabled; })
  .set(function (v) { this.email_enabled = v; });

systemGatewayControlSchema.virtual('pushEnabled')
  .get(function () { return this.push_enabled; })
  .set(function (v) { this.push_enabled = v; });

systemGatewayControlSchema.virtual('inAppEnabled')
  .get(function () { return this.in_app_enabled; })
  .set(function (v) { this.in_app_enabled = v; });

const SystemGatewayControl = mongoose.model(
  'SystemGatewayControl',
  systemGatewayControlSchema,
  'system_gateway_controls'
);

exports.SystemGatewayControl = SystemGatewayControl;
