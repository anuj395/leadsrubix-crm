const mongoose = require('mongoose');
const { mapWithDualCase, withDualCase } = require('../utils/caseConverter');

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
    contact_owner_id: { type: String, alias: 'contactOwnerId' },
    adset: { type: String },
    campaign: { type: String },
    notes: { type: String },
    account_id: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'accountId' },
    stage: { type: String, default: 'FRESH' },
    inquiries: { type: Array, default: [] },
    inquiry_count: { type: Number, default: 0, alias: 'inquiryCount' },
    total_lifetime_value: { type: Number, default: 0, alias: 'totalLifetimeValue' },
    active_deal_count: { type: Number, default: 0, alias: 'activeDealCount' },
    last_contacted_at: { type: Date, default: null, alias: 'lastContactedAt' },
    next_follow_up_date_time: { type: Date, default: null, alias: 'nextFollowUpDateTime' },
    next_follow_up_type: { type: String, default: '', alias: 'nextFollowUpType' },
    call_back_reason: { type: String, default: '', alias: 'callBackReason' },
    lost_reason: { type: String, default: '', alias: 'lostReason' },
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

exports.list = async ({ filter = {}, limit = 5000 } = {}) => {
  const q = Contact.find(filter).sort({ createdAt: -1 });
  if (limit > 0) q.limit(limit);
  const docs = await q.lean().exec();
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
  return withDualCase(doc.toObject());
};

exports.findById = async (id) => {
  const doc = await Contact.findById(id).lean().exec();
  return doc ? withDualCase(doc) : null;
};

exports.findByIdAndUpdate = async (id, update, options = {}) => {
  const normalizedUpdate = {};
  for (const [op, val] of Object.entries(update || {})) {
    if (op.startsWith('$')) {
      normalizedUpdate[op] = normalizePayload(val);
    } else {
      const dbKey = op.includes('_') ? op : camelToSnakeCase(op);
      normalizedUpdate[dbKey] = val;
    }
  }
  const doc = await Contact.findByIdAndUpdate(id, normalizedUpdate, { new: true, ...options }).lean().exec();
  return doc ? withDualCase(doc) : null;
};

exports.remove = async (id) => Contact.findByIdAndDelete(id).lean().exec();
