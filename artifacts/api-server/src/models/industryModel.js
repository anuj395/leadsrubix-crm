const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
    status: { type: String, enum: ['Launched', 'Pre-Launched', 'Pending'], default: 'Launched' },
    baseline_designations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    default_team_name: { type: String, default: 'General Sales Team' },
    default_team_code: { type: String, default: 'GST' },
    default_branch_name: { type: String, default: 'Head Office' },
    default_branch_code: { type: String, default: 'HQ' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

industrySchema.index({ code: 1 }, { unique: true, name: 'idx_industry_code' });

const Industry = mongoose.model('Industry', industrySchema, 'industries');

exports.Industry = Industry;

exports.list = async ({ activeOnly = false } = {}) => {
  const q = {};
  if (activeOnly) {
    q.is_active = true;
    q.status = 'Launched';
  }
  return Industry.find(q).sort({ code: 1 }).exec();
};

exports.findById = async (id) => Industry.findById(id).exec();

exports.findByCode = async (code) => {
  if (!code) return null;
  const lower = String(code).toLowerCase().trim();
  let doc = await Industry.findOne({ code: lower }).exec();
  if (!doc && mongoose.Types.ObjectId.isValid(code)) {
    doc = await Industry.findById(code).exec();
  }
  return doc;
};

exports.create = async ({
  code,
  name,
  description,
  isActive,
  status,
  baseline_designations,
  default_team_name,
  default_team_code,
  default_branch_name,
  default_branch_code,
}) => {
  const doc = await Industry.create({
    code: String(code).toLowerCase().trim(),
    name: String(name).trim(),
    description: description || '',
    is_active: isActive !== false,
    status: status || 'Launched',
    baseline_designations: Array.isArray(baseline_designations) ? baseline_designations : [],
    default_team_name: default_team_name || 'General Sales Team',
    default_team_code: default_team_code || 'GST',
    default_branch_name: default_branch_name || 'Head Office',
    default_branch_code: default_branch_code || 'HQ',
  });
  return doc;
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.code !== undefined) update.code = String(patch.code).toLowerCase().trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.description !== undefined) update.description = String(patch.description);
  if (patch.isActive !== undefined) update.is_active = !!patch.isActive;
  if (patch.status !== undefined) update.status = String(patch.status);
  if (patch.baseline_designations !== undefined) {
    update.baseline_designations = Array.isArray(patch.baseline_designations) ? patch.baseline_designations : [];
  }
  if (patch.default_team_name !== undefined) update.default_team_name = String(patch.default_team_name);
  if (patch.default_team_code !== undefined) update.default_team_code = String(patch.default_team_code);
  if (patch.default_branch_name !== undefined) update.default_branch_name = String(patch.default_branch_name);
  if (patch.default_branch_code !== undefined) update.default_branch_code = String(patch.default_branch_code);
  return Industry.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
};

exports.remove = async (id) => Industry.findByIdAndDelete(id).exec();
