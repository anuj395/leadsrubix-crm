const mongoose = require('mongoose');

const ROLE_KEYS = ['superAdmin', 'admin', 'leadManager', 'teamLead', 'sales'];

const roleSchema = new mongoose.Schema(
  {
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true, alias: 'industryId' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
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

roleSchema.index({ organization_id: 1, industry_id: 1, key: 1 }, { unique: true, name: 'idx_role_org_industry_key' });

const Role = mongoose.model('Role', roleSchema, 'roles');

const industryModel = require('./industryModel');

exports.Role = Role;
exports.ROLE_KEYS = ROLE_KEYS;

exports.list = async ({ industryId, organizationId, activeOnly = false, excludeRole } = {}) => {
  const q = {};
  if (industryId) {
    const industryDoc = await industryModel.findByCode(industryId);
    if (industryDoc) {
      q.industry_id = industryDoc._id;
    } else {
      q.industry_id = industryId;
    }
  }
  if (organizationId !== undefined && organizationId !== null && organizationId !== 'all' && organizationId !== '') {
    q.$or = [{ organization_id: organizationId }, { organization_id: null }, { organization_id: { $exists: false } }];
  } else {
    q.$or = [{ organization_id: null }, { organization_id: { $exists: false } }];
  }
  if (activeOnly) q.is_active = true;

  const excludedKeys = ['superAdmin', 'replicateAdmin'];
  if (excludeRole) excludedKeys.push(excludeRole);
  q.key = { $nin: excludedKeys };

  const rawList = await Role.find(q).populate('industry_id').sort({ key: 1 }).exec();

  const roleMap = new Map();
  for (const r of rawList) {
    const key = r.key;
    const existing = roleMap.get(key);
    if (!existing) {
      roleMap.set(key, r);
    } else if (organizationId && (r.organization_id === organizationId || r.organizationId === organizationId)) {
      roleMap.set(key, r);
    }
  }
  return Array.from(roleMap.values());
};

exports.findById = async (id) => Role.findById(id).populate('industry_id').exec();

exports.findByIndustryAndKey = async (industryId, key, organizationId) => {
  let targetId = industryId;
  const industryDoc = await industryModel.findByCode(industryId);
  if (industryDoc) {
    targetId = industryDoc._id;
  }
  const q = { industry_id: targetId, key: String(key).trim() };
  if (organizationId) {
    const doc = await Role.findOne({ ...q, organization_id: organizationId }).exec();
    if (doc) return doc;
  }
  return Role.findOne({ ...q, organization_id: null }).exec();
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
