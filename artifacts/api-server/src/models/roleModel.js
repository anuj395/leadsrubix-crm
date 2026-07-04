const mongoose = require('mongoose');

const ROLE_KEYS = ['superAdmin', 'admin', 'leadManager', 'teamLead', 'sales'];

const roleSchema = new mongoose.Schema(
  {
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

roleSchema.index({ industryId: 1, key: 1 }, { unique: true, name: 'idx_role_industry_key' });

const Role = mongoose.model('Role', roleSchema, 'roles');

exports.Role = Role;
exports.ROLE_KEYS = ROLE_KEYS;

exports.list = async ({ industryId, activeOnly = false } = {}) => {
  const q = {};
  if (industryId) q.industryId = industryId;
  if (activeOnly) q.isActive = true;
  return Role.find(q).sort({ key: 1 }).lean().exec();
};

exports.findById = async (id) => Role.findById(id).lean().exec();

exports.findByIndustryAndKey = async (industryId, key) =>
  Role.findOne({ industryId, key: String(key).trim() }).lean().exec();

exports.create = async ({ industryId, key, name, description, isActive }) => {
  const doc = await Role.create({
    industryId,
    key: String(key).trim(),
    name: String(name).trim(),
    description: description || '',
    isActive: isActive !== false,
  });
  return doc.toObject();
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.key !== undefined) update.key = String(patch.key).trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.description !== undefined) update.description = String(patch.description);
  if (patch.isActive !== undefined) update.isActive = !!patch.isActive;
  if (patch.industryId !== undefined) update.industryId = patch.industryId;
  return Role.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
};

exports.remove = async (id) => Role.findByIdAndDelete(id).lean().exec();
