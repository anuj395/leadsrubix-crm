const mongoose = require('mongoose');
const { withDualCase, mapWithDualCase } = require('../utils/caseConverter');

const telephonyChannelSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    industry_id:     { type: String, default: null, index: true, alias: 'industryId' },
    workspace_id:    { type: String, default: null, alias: 'workspaceId' },

    // Channel Identity
    name:            { type: String, required: true, trim: true }, // e.g. "Primary Sales Line", "Toll Free Support"
    provider:        { 
      type: String, 
      required: true, 
      enum: ['tata_smartflo', 'telecmi', 'exotel', 'myoperator', 'airtel_iq', 'cloud_ivr', 'custom_pbx', 'digitalrubix'],
      default: 'tata_smartflo'
    },
    provider_name:   { type: String, default: 'Tata Smartflo', alias: 'providerName' },
    virtual_number:  { type: String, default: '', trim: true, alias: 'virtualNumber' }, // Pilot / DID Number

    // Dedicated Webhook Security
    api_key:         { type: String, required: true, unique: true, index: true, alias: 'apiKey' },

    // Intelligent Routing Configuration
    routing_mode:    { 
      type: String, 
      enum: ['AGENT_PHONE_MATCH', 'ROUND_ROBIN', 'FALLBACK_RULES'], 
      default: 'AGENT_PHONE_MATCH',
      alias: 'routingMode' 
    },
    default_agent_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, alias: 'defaultAgentId' },
    default_agent_name:  { type: String, default: '', alias: 'defaultAgentName' },
    default_agent_email: { type: String, default: '', alias: 'defaultAgentEmail' },

    // Status & Telemetry Counters
    status:          { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    total_calls:     { type: Number, default: 0, alias: 'totalCalls' },
    answered_calls:  { type: Number, default: 0, alias: 'answeredCalls' },
    missed_calls:    { type: Number, default: 0, alias: 'missedCalls' },
    last_call_at:    { type: Date, default: null, alias: 'lastCallAt' },

    created_by:      { type: String, default: 'Admin', alias: 'createdBy' },
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

telephonyChannelSchema.index({ organization_id: 1, status: 1 });
telephonyChannelSchema.index({ organization_id: 1, virtual_number: 1 });

const TelephonyChannel = mongoose.model('TelephonyChannel', telephonyChannelSchema, 'telephony_channels');

exports.TelephonyChannel = TelephonyChannel;
exports.shapePublic = (doc) => withDualCase(doc);
exports.list = async ({ filter = {}, limit = 100 } = {}) => {
  const docs = await TelephonyChannel.find(filter).sort({ created_at: -1 }).limit(limit).lean().exec();
  return mapWithDualCase(docs);
};
