const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    contactId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null, index: true },
    leadId:         { type: String, default: '', index: true },
    organizationId: { type: String, default: null, index: true },
    industryId:     { type: String, default: null, index: true },
    customerName:   { type: String, default: '' },
    contactNumber:  { type: String, default: '' },
    duration:       { type: Number, default: 0 },
    details:        { type: String, default: '' },
    createdBy:      { type: String, default: '' },
    stage:          { type: String, default: '' },
    contactOwnerEmail: { type: String, default: '' },
    location:       { type: String, default: '' },
    projectName:    { type: String, default: '' },
    budget:         { type: String, default: '' },
    transferStatus: { type: Boolean, default: false },
    source:         { type: String, default: '' },
    type:           { type: String, default: '' },
    inventoryType:  { type: String, default: '' },
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

const CallLog = mongoose.model('CallLog', callLogSchema, 'calllogs');
exports.CallLog = CallLog;
