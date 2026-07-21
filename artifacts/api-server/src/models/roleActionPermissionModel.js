const mongoose = require('mongoose');

/**
 * One row per (role, industry, screen) granting any subset of the four basic
 * actions. SuperAdmin and admin roles are treated as implicit allow at the
 * service layer — no row required.
 */
const roleActionPermissionSchema = new mongoose.Schema(
  {
    roleId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Role',     required: true },
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    screenId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Screen',   required: true },
    canView:    { type: Boolean, default: false },
    canAdd:     { type: Boolean, default: false },
    canEdit:    { type: Boolean, default: false },
    canDelete:  { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

roleActionPermissionSchema.virtual('can_view')
  .get(function() { return this.canView; })
  .set(function(v) { this.canView = v; });

roleActionPermissionSchema.virtual('can_add')
  .get(function() { return this.canAdd; })
  .set(function(v) { this.canAdd = v; });

roleActionPermissionSchema.virtual('can_edit')
  .get(function() { return this.canEdit; })
  .set(function(v) { this.canEdit = v; });

roleActionPermissionSchema.virtual('can_delete')
  .get(function() { return this.canDelete; })
  .set(function(v) { this.canDelete = v; });

roleActionPermissionSchema.index(
  { roleId: 1, industryId: 1, screenId: 1 },
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
  if (roleId) q.roleId = roleId;
  if (industryId) q.industryId = industryId;
  if (screenId) q.screenId = screenId;
  return RoleActionPermission.find(q).lean().exec();
};

exports.findFor = ({ roleId, industryId, screenId }) => {
  return RoleActionPermission.findOne({ roleId, industryId, screenId }).lean().exec();
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
  if (cView !== undefined) $set.canView = !!cView;
  if (cAdd  !== undefined) $set.canAdd  = !!cAdd;
  if (cEdit !== undefined) $set.canEdit = !!cEdit;
  if (cDel  !== undefined) $set.canDelete = !!cDel;
  await RoleActionPermission.updateOne(
    { roleId, industryId, screenId },
    { $set, $setOnInsert: { roleId, industryId, screenId } },
    { upsert: true },
  );
  return RoleActionPermission.findOne({ roleId, industryId, screenId }).lean().exec();
};

exports.removeByRole     = (roleId)     => RoleActionPermission.deleteMany({ roleId }).exec();
exports.removeByIndustry = (industryId) => RoleActionPermission.deleteMany({ industryId }).exec();
exports.removeByScreen   = (screenId)   => RoleActionPermission.deleteMany({ screenId }).exec();
