// src/models/bookingModel.js
// Bookings made against a contact / lead. Per the migration spec, holds
// embedded contactDetails / bookingDetails / notes / attachments / callLogs
// arrays so the entire booking artefact is self-contained. Freeform schema
// so the SuperAdmin can add tenant-specific fields through screen-config.

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    industry_id:     { type: String, default: null, index: true, alias: 'industryId' },
    organization_id: { type: String, default: null, index: true, alias: 'organizationId' },
    // Optional reference to the contact this booking originated from.
    contact_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null, index: true, alias: 'contactId' },
    customer_name:   { type: String, default: '', alias: 'customerName' },
    contact_number:   { type: String, default: '', alias: 'contactNumber' },
    project:        { type: String, default: '' },
    location:       { type: String, default: '' },
    branch:         { type: String, default: '' },
    team:           { type: String, default: '' },
    reporting_to:    { type: String, default: '', alias: 'reportingTo' },
    contact_details: { type: mongoose.Schema.Types.Mixed, default: {}, alias: 'contactDetails' },
    booking_details: { type: [mongoose.Schema.Types.Mixed], default: [], alias: 'bookingDetails' },
    notes:          { type: [mongoose.Schema.Types.Mixed], default: [] },
    attachments:    { type: [mongoose.Schema.Types.Mixed], default: [] },
    call_logs:       { type: [mongoose.Schema.Types.Mixed], default: [], alias: 'callLogs' },
    is_active:       { type: Boolean, default: true, alias: 'isActive' },
    created_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, alias: 'createdBy' },
  },
  { 
    timestamps: true, 
    strict: false, 
    minimize: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const Booking = mongoose.model('Booking', bookingSchema, 'bookings');
exports.Booking = Booking;
