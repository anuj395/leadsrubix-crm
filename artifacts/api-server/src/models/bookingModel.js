// src/models/bookingModel.js
// Bookings made against a contact / lead. Per the migration spec, holds
// embedded contactDetails / bookingDetails / notes / attachments / callLogs
// arrays so the entire booking artefact is self-contained. Freeform schema
// so the SuperAdmin can add tenant-specific fields through screen-config.

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    industryId:     { type: String, default: null, index: true },
    // Optional reference to the contact this booking originated from.
    contactId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null, index: true, alias: 'contact_id' },
    customerName:   { type: String, default: '', alias: 'customer_name' },
    contactNumber:   { type: String, default: '', alias: 'contact_no' },
    project:        { type: String, default: '' },
    location:       { type: String, default: '' },
    branch:         { type: String, default: '' },
    team:           { type: String, default: '' },
    reportingTo:    { type: String, default: '', alias: 'reporting_to' },
    contactDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    bookingDetails: { type: [mongoose.Schema.Types.Mixed], default: [] },
    notes:          { type: [mongoose.Schema.Types.Mixed], default: [] },
    attachments:    { type: [mongoose.Schema.Types.Mixed], default: [] },
    callLogs:       { type: [mongoose.Schema.Types.Mixed], default: [] },
    isActive:       { type: Boolean, default: true },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
