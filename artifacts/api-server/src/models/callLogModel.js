const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    contact_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null, index: true, alias: 'contactId' },
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
    longitude:      { type: Number, default: null }
  },
  { 
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const CallLog = mongoose.model('CallLog', callLogSchema, 'call_logs');
exports.CallLog = CallLog;
