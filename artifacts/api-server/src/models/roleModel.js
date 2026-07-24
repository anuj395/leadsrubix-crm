const mongoose = require('mongoose');

const ROLE_KEYS = ['superAdmin', 'admin', 'leadManager', 'teamLead', 'sales'];

const roleSchema = new mongoose.Schema(
  {
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true, alias: 'industryId' },
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

roleSchema.index({ industry_id: 1, key: 1 }, { unique: true, name: 'idx_role_industry_key' });

const Role = mongoose.model('Role', roleSchema, 'roles');

const industryModel = require('./industryModel');

exports.Role = Role;
exports.ROLE_KEYS = ROLE_KEYS;

exports.list = async ({ industryId, activeOnly = false, excludeRole } = {}) => {
  const q = { key: { $ne: 'superAdmin' } };
  if (industryId) {
    const industryDoc = await industryModel.findByCode(industryId);
    if (industryDoc) {
      q.industry_id = industryDoc._id;
    } else {
      q.industry_id = industryId;
    }
  }
  if (activeOnly) q.is_active = true;
  if (excludeRole) {
    q.key = { $nin: ['superAdmin', excludeRole] };
  }
  return Role.find(q).populate('industry_id').sort({ key: 1 }).exec();
};

exports.findById = async (id) => Role.findById(id).populate('industry_id').exec();

exports.findByIndustryAndKey = async (industryId, key) => {
  let targetId = industryId;
  const industryDoc = await industryModel.findByCode(industryId);
  if (industryDoc) {
    targetId = industryDoc._id;
  }
  return Role.findOne({ industry_id: targetId, key: String(key).trim() }).exec();
};

exports.create = async ({ industryId, key, name, description, isActive }) => {
  const doc = await Role.create({
    industry_id: industryId,
    key: String(key).trim(),
    name: String(name).trim(),
    description: description || '',
    is_active: isActive !== false,
  });
  return doc;
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.key !== undefined) update.key = String(patch.key).trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.description !== undefined) update.description = String(patch.description);
  if (patch.isActive !== undefined) update.is_active = !!patch.isActive;
  if (patch.industryId !== undefined) update.industry_id = patch.industryId;
  return Role.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
};

exports.remove = async (id) => Role.findByIdAndDelete(id).exec();
