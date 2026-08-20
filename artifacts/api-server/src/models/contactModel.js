const mongoose = require('mongoose');
const { mapWithDualCase } = require('../utils/caseConverter');

/**
 * Contacts use a freeform schema (`strict: false`) because the available
 * fields are configured at runtime via the screen-config system. We still
 * track owner/scope and timestamps for ordering and access control.
 */
const contactSchema = new mongoose.Schema(
  {
    created_by: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'createdBy' },
    organization_id: { type: String, alias: 'organizationId' },
    workspace_id: { type: String, alias: 'workspaceId' },
    industry_id: { type: String, alias: 'industryId' },
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
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null, alias: 'accountId' },
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

exports.list = async ({ filter = {}, limit = 200 } = {}) => {
  const docs = await Contact.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  return mapWithDualCase(docs);
};

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizePayload(payload) {
  if (!payload) return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    const dbKey = k.includes('_') ? k : camelToSnakeCase(k);
    out[dbKey] = v;
  }
  return out;
}

exports.create = async (payload) => {
  const doc = await Contact.create(normalizePayload(payload));
  return doc.toObject();
};

exports.findById = async (id) => Contact.findById(id).lean().exec();

exports.findByIdAndUpdate = async (id, update, options = {}) => {
  const normalizedUpdate = {};
  for (const [op, val] of Object.entries(update || {})) {
    if (op.startsWith('$')) {
      normalizedUpdate[op] = normalizePayload(val);
    } else {
      normalizedUpdate[op] = val;
    }
  }
  return Contact.findByIdAndUpdate(id, normalizedUpdate, options).lean().exec();
};

exports.remove = async (id) => Contact.findByIdAndDelete(id).lean().exec();
