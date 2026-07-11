const mongoose = require('mongoose');

/**
 * Contacts use a freeform schema (`strict: false`) because the available
 * fields are configured at runtime via the screen-config system. We still
 * track owner/scope and timestamps for ordering and access control.
 */
const contactSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.Mixed, default: null },
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
