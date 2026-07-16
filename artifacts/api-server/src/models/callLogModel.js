const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    contactId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true, alias: 'contact_id' },
    organizationId: { type: String, default: null, index: true },
    industryId:     { type: String, default: null, index: true },
    customerName:   { type: String, default: '', alias: 'customer_name' },
    contactNumber:  { type: String, default: '', alias: 'contact_no' },
    duration:       { type: Number, default: 0 }, // Duration in seconds
    details:        { type: String, default: '' },
    createdBy:      { type: String, default: '', alias: 'created_by' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const CallLog = mongoose.model('CallLog', callLogSchema, 'calllogs');
exports.CallLog = CallLog;
