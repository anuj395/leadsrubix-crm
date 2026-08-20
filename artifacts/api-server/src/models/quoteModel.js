const mongoose = require('mongoose');
const { mapWithDualCase } = require('../utils/caseConverter');

const quoteItemSchema = new mongoose.Schema({
  product_name: { type: String, required: true, alias: 'productName' },
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, default: 0, alias: 'unitPrice' },
  total: { type: Number, default: 0 }
});

const quoteSchema = new mongoose.Schema(
  {
    quote_number: { type: String, required: true, unique: true, alias: 'quoteNumber' },
    deal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', alias: 'dealId' },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', alias: 'accountId' },
    contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', alias: 'contactId' },
    organization_id: { type: String, required: true, alias: 'organizationId' },
    valid_till: { type: Date, alias: 'validTill' },
    status: { type: String, default: 'DRAFT' }, // DRAFT, SENT, ACCEPTED, REJECTED, ORDERED
    items: [quoteItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0, alias: 'grandTotal' },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'createdBy' },
    terms: { type: String, default: '' }
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

quoteSchema.pre('save', function(next) {
  let sub = 0;
  for (const item of this.items) {
    item.total = (item.quantity || 0) * (item.unit_price || 0);
    sub += item.total;
  }
  this.subtotal = sub;
  this.grand_total = sub + (this.tax || 0) - (this.discount || 0);
  next();
});

const Quote = mongoose.model('Quote', quoteSchema, 'quotes');
exports.Quote = Quote;

exports.list = async ({ filter = {}, limit = 200 } = {}) => {
  const docs = await Quote.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
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
  const doc = new Quote(normalizePayload(payload));
  await doc.save();
  return doc.toObject();
};

exports.findById = async (id) => Quote.findById(id).lean().exec();

exports.findByIdAndUpdate = async (id, update, options = {}) => {
  const normalizedUpdate = {};
  for (const [op, val] of Object.entries(update || {})) {
    if (op.startsWith('$')) {
      normalizedUpdate[op] = normalizePayload(val);
    } else {
      normalizedUpdate[op] = val;
    }
  }
  
  // If editing items, recalculate subtotal/grand_total
  if (normalizedUpdate['$set'] && normalizedUpdate['$set'].items) {
    let sub = 0;
    for (const item of normalizedUpdate['$set'].items) {
      const q = item.quantity || 0;
      const p = item.unit_price || item.unitPrice || 0;
      item.total = q * p;
      sub += item.total;
    }
    normalizedUpdate['$set'].subtotal = sub;
    const tax = normalizedUpdate['$set'].tax || 0;
    const disc = normalizedUpdate['$set'].discount || 0;
    normalizedUpdate['$set'].grand_total = sub + tax - disc;
  }

  return Quote.findByIdAndUpdate(id, normalizedUpdate, options).lean().exec();
};

exports.remove = async (id) => Quote.findByIdAndDelete(id).lean().exec();
