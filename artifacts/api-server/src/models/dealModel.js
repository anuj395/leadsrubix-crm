const mongoose = require('mongoose');
const { mapWithDualCase } = require('../utils/caseConverter');

const dealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    stage: { type: String, default: 'QUALIFICATION' }, // QUALIFICATION, CONTACTED, PROPOSAL_SENT, NEGOTIATION, WON, LOST
    probability: { type: Number, default: 10 },
    close_date: { type: Date, alias: 'closeDate' },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, alias: 'accountId' },
    contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', alias: 'contactId' },
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

const Deal = mongoose.model('Deal', dealSchema, 'deals');
exports.Deal = Deal;

exports.list = async ({ filter = {}, limit = 200 } = {}) => {
  const docs = await Deal.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
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
  const doc = await Deal.create(normalizePayload(payload));
  return doc.toObject();
};

exports.findById = async (id) => Deal.findById(id).lean().exec();

exports.findByIdAndUpdate = async (id, update, options = {}) => {
  const normalizedUpdate = {};
  for (const [op, val] of Object.entries(update || {})) {
    if (op.startsWith('$')) {
      normalizedUpdate[op] = normalizePayload(val);
    } else {
      normalizedUpdate[op] = val;
    }
  }
  return Deal.findByIdAndUpdate(id, normalizedUpdate, options).lean().exec();
};

exports.remove = async (id) => Deal.findByIdAndDelete(id).lean().exec();
