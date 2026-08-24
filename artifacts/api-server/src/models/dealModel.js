const mongoose = require('mongoose');
const { mapWithDualCase, withDualCase } = require('../utils/caseConverter');

const dealSchema = new mongoose.Schema(
  {
    title: { type: String },
    name: { type: String },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    pipeline_id: { type: String, alias: 'pipelineId' },
    stage_id: { type: String, alias: 'stageId' },
    stage: { type: String, default: 'QUALIFICATION' },
    probability: { type: Number, default: 10 },
    expected_close_date: { type: Date, alias: 'expectedCloseDate' },
    close_date: { type: Date, alias: 'closeDate' },
    account_id: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'accountId' },
    account_name: { type: String, default: '', alias: 'accountName' },
    contact_id: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'contactId' },
    contact_name: { type: String, default: '', alias: 'contactName' },
    contact_phone: { type: String, default: '', alias: 'contactPhone' },
    contact_email: { type: String, default: '', alias: 'contactEmail' },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    industry_id: { type: String, default: null, alias: 'industryId' },
    owner_id: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'ownerId' },
    owner_name: { type: String, default: '', alias: 'ownerName' },
    owner_email: { type: String, default: '', alias: 'ownerEmail' },
    lost_reason: { type: String, default: '', alias: 'lostReason' },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'createdBy' }
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

exports.list = async ({ filter = {}, limit = 500 } = {}) => {
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
  if (out.name && !out.title) out.title = out.name;
  if (out.title && !out.name) out.name = out.title;
  if (out.stage_id && !out.stageId) out.stageId = out.stage_id;
  if (out.stageId && !out.stage_id) out.stage_id = out.stageId;
  return out;
}

exports.create = async (payload) => {
  const doc = await Deal.create(normalizePayload(payload));
  return withDualCase(doc.toObject());
};

exports.findById = async (id) => {
  const doc = await Deal.findById(id).lean().exec();
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
  const doc = await Deal.findByIdAndUpdate(id, normalizedUpdate, { new: true, ...options }).lean().exec();
  return doc ? withDualCase(doc) : null;
};

exports.remove = async (id) => Deal.findByIdAndDelete(id).exec();
