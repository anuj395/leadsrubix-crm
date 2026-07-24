const mongoose = require('mongoose');

/**
 * Contacts use a freeform schema (`strict: false`) because the available
 * fields are configured at runtime via the screen-config system. We still
 * track owner/scope and timestamps for ordering and access control.
 */
const contactSchema = new mongoose.Schema(
  {
    created_by: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'createdBy' },
    organization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', alias: 'organizationId' },
    customer_name: { type: String, alias: 'customerName' },
    contact_number: { type: String, alias: 'contactNumber' },
    email_id: { type: String, alias: 'emailId' },
    alternate_no: { type: String, alias: 'alternateNo' },
    lead_type: { type: String, alias: 'leadType' },
    location: { type: String },
    project_name: { type: String, alias: 'projectName' },
    property_type: { type: String, alias: 'propertyType' },
    property_stage: { type: String, alias: 'propertyStage' },
    budget: { type: String },
    property_sub_type: { type: String, alias: 'propertySubType' },
    source: { type: String },
    contact_owner_email: { type: String, alias: 'contactOwnerEmail' },
    adset: { type: String },
    campaign: { type: String },
    notes: { type: String },
  },
  { 
    timestamps: true, 
    strict: false, 
    minimize: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const Contact = mongoose.model('Contact', contactSchema, 'contacts');

exports.Contact = Contact;

exports.list = async ({ filter = {}, limit = 200 } = {}) =>
  Contact.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();

exports.create = async (payload) => {
  const doc = await Contact.create(payload);
  return doc.toObject();
};

exports.findById = async (id) => Contact.findById(id).lean().exec();
exports.findByIdAndUpdate = async (id, update, options = {}) => Contact.findByIdAndUpdate(id, update, options).lean().exec();

exports.remove = async (id) => Contact.findByIdAndDelete(id).lean().exec();
