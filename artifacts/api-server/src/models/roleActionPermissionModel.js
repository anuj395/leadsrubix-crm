const mongoose = require('mongoose');

/**
 * One row per (role, industry, screen) granting any subset of the four basic
 * actions. SuperAdmin and admin roles are treated as implicit allow at the
 * service layer — no row required.
 */
const roleActionPermissionSchema = new mongoose.Schema(
  {
    role_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Role',     required: true, alias: 'roleId' },
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true, alias: 'industryId' },
    screen_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Screen',   required: true, alias: 'screenId' },
    can_view:    { type: Boolean, default: false, alias: 'canView' },
    can_add:     { type: Boolean, default: false, alias: 'canAdd' },
    can_edit:    { type: Boolean, default: false, alias: 'canEdit' },
    can_delete:  { type: Boolean, default: false, alias: 'canDelete' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

roleActionPermissionSchema.index(
  { role_id: 1, industry_id: 1, screen_id: 1 },
  { unique: true, name: 'idx_role_action_perm_unique' },
);

const RoleActionPermission = mongoose.model(
  'RoleActionPermission',
  roleActionPermissionSchema,
  'role_action_permissions',
);

exports.RoleActionPermission = RoleActionPermission;

exports.list = async ({ roleId, industryId, screenId } = {}) => {
  const q = {};
  if (roleId) q.role_id = roleId;
  if (industryId) q.industry_id = industryId;
  if (screenId) q.screen_id = screenId;
  return RoleActionPermission.find(q).lean().exec();
};

exports.findFor = ({ roleId, industryId, screenId }) => {
  return RoleActionPermission.findOne({ role_id: roleId, industry_id: industryId, screen_id: screenId }).lean().exec();
};

exports.upsert = async ({
  roleId, industryId, screenId,
  canView, can_view, canAdd, can_add, canEdit, can_edit, canDelete, can_delete,
}) => {
  const cView = canView !== undefined ? canView : can_view;
  const cAdd = canAdd !== undefined ? canAdd : can_add;
  const cEdit = canEdit !== undefined ? canEdit : can_edit;
  const cDel = canDelete !== undefined ? canDelete : can_delete;
  const $set = {};
  if (cView !== undefined) $set.can_view = !!cView;
  if (cAdd  !== undefined) $set.can_add  = !!cAdd;
  if (cEdit !== undefined) $set.can_edit = !!cEdit;
  if (cDel  !== undefined) $set.can_delete = !!cDel;
  await RoleActionPermission.updateOne(
    { role_id: roleId, industry_id: industryId, screen_id: screenId },
    { $set, $setOnInsert: { role_id: roleId, industry_id: industryId, screen_id: screenId } },
    { upsert: true },
  );
  return RoleActionPermission.findOne({ role_id: roleId, industry_id: industryId, screen_id: screenId }).lean().exec();
};

exports.removeByRole     = (roleId)     => RoleActionPermission.deleteMany({ role_id: roleId }).exec();
exports.removeByIndustry = (industryId) => RoleActionPermission.deleteMany({ industry_id: industryId }).exec();
exports.removeByScreen   = (screenId)   => RoleActionPermission.deleteMany({ screen_id: screenId }).exec();
