const mongoose = require('mongoose');
const { withDualCase, mapWithDualCase } = require('../utils/caseConverter');

const callLogSchema = new mongoose.Schema(
  {
    contact_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null, index: true, alias: 'contactId' },
    related_to_type: { type: String, enum: ['Lead', 'Account', 'Contact', 'Deal'], alias: 'relatedToType' },
    related_to_id:   { type: mongoose.Schema.Types.ObjectId, alias: 'relatedToId' },
    lead_id:         { type: String, default: '', index: true, alias: 'leadId' },
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    industry_id:     { type: String, default: null, index: true, alias: 'industryId' },
    customer_name:   { type: String, default: '', alias: 'customerName' },
    contact_number:  { type: String, default: '', alias: 'contactNumber' },
    duration:       { type: Number, default: 0 },
    details:        { type: String, default: '' },
    created_by:      { type: String, default: '', alias: 'createdBy' },
    stage:          { type: String, default: '' },
    contact_owner_email: { type: String, default: '', alias: 'contactOwnerEmail' },
    location:       { type: String, default: '' },
    project_name:    { type: String, default: '', alias: 'projectName' },
    budget:         { type: String, default: '' },
    transfer_status: { type: Boolean, default: false, alias: 'transferStatus' },
    source:         { type: String, default: '' },
    type:           { type: String, default: '' },
    inventory_type:  { type: String, default: '', alias: 'inventoryType' },
    uid:            { type: String, default: '', index: true },
    latitude:       { type: Number, default: null },
    longitude:      { type: Number, default: null },
    call_sid:       { type: String, default: '', index: true, alias: 'callSid' },
    recording_url:  { type: String, default: '', alias: 'recordingUrl' },
    virtual_number: { type: String, default: '', alias: 'virtualNumber' },
    agent_number:   { type: String, default: '', alias: 'agentNumber' },
    agent_extension:{ type: String, default: '', alias: 'agentExtension' },
    call_status:    { type: String, default: '', alias: 'callStatus' },
    direction:      { type: String, default: 'Inbound' },
    provider:       { type: String, default: 'Cloud Telephony' },
    ivr_option:     { type: String, default: '', alias: 'ivrOption' }
  },
  { 
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const CallLog = mongoose.model('CallLog', callLogSchema, 'call_logs');
exports.CallLog = CallLog;
exports.shapePublic = (doc) => withDualCase(doc);
exports.list = async ({ filter = {}, limit = 200 } = {}) => {
  const docs = await CallLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  return mapWithDualCase(docs);
};
