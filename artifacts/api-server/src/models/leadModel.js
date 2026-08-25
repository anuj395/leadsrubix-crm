const mongoose = require('mongoose');
const { mapWithDualCase } = require('../utils/caseConverter');

const leadSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, alias: 'firstName' },
    last_name: { type: String, default: '', alias: 'lastName' },
    company_name: { type: String, default: '', alias: 'companyName' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    lead_status: { type: String, default: 'NEW', alias: 'leadStatus' },
    lead_source: { type: String, default: '', alias: 'leadSource' },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    workspace_id: { type: String, alias: 'workspaceId' },
    industry_id: { type: String, alias: 'industryId' },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', alias: 'ownerId' },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'createdBy' },
    notes: { type: String, default: '' }
  },
  {
    timestamps: true,
    strict: false,
    minimize: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const Lead = mongoose.model('Lead', leadSchema, 'leads');
exports.Lead = Lead;

exports.list = async ({ filter = {}, limit = 200 } = {}) => {
  const docs = await Lead.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
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
  const doc = await Lead.create(normalizePayload(payload));
  return doc.toObject();
};

exports.findById = async (id) => Lead.findById(id).lean().exec();

exports.findByIdAndUpdate = async (id, update, options = {}) => {
  const normalizedUpdate = {};
  for (const [op, val] of Object.entries(update || {})) {
    if (op.startsWith('$')) {
      normalizedUpdate[op] = normalizePayload(val);
    } else {
      normalizedUpdate[op] = val;
    }
  }
  return Lead.findByIdAndUpdate(id, normalizedUpdate, options).lean().exec();
};

exports.remove = async (id) => Lead.findByIdAndDelete(id).lean().exec();
