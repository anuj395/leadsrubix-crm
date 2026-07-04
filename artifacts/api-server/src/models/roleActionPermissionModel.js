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
    screen_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Screen',   required: true },
    can_view:    { type: Boolean, default: false },
    can_add:     { type: Boolean, default: false },
    can_edit:    { type: Boolean, default: false },
    can_delete:  { type: Boolean, default: false },
  },
  { timestamps: true },
);

roleActionPermissionSchema.index(
  { roleId: 1, industryId: 1, screen_id: 1 },
  { unique: true, name: 'idx_role_action_perm_unique' },
);

const RoleActionPermission = mongoose.model(
  'RoleActionPermission',
  roleActionPermissionSchema,
  'role_action_permissions',
);

exports.RoleActionPermission = RoleActionPermission;

exports.list = async ({ roleId, industryId, screen_id } = {}) => {
  const q = {};
  if (roleId) q.roleId = roleId;
  if (industryId) q.industryId = industryId;
  if (screen_id) q.screen_id = screen_id;
  return RoleActionPermission.find(q).lean().exec();
};

exports.findFor = ({ roleId, industryId, screen_id }) =>
  RoleActionPermission.findOne({ roleId, industryId, screen_id }).lean().exec();

exports.upsert = async ({
  roleId, industryId, screen_id,
  can_view, can_add, can_edit, can_delete,
}) => {
  const $set = {};
  if (can_view   !== undefined) $set.can_view   = !!can_view;
  if (can_add    !== undefined) $set.can_add    = !!can_add;
  if (can_edit   !== undefined) $set.can_edit   = !!can_edit;
  if (can_delete !== undefined) $set.can_delete = !!can_delete;
  await RoleActionPermission.updateOne(
    { roleId, industryId, screen_id },
    { $set, $setOnInsert: { roleId, industryId, screen_id } },
    { upsert: true },
  );
  return RoleActionPermission.findOne({ roleId, industryId, screen_id }).lean().exec();
};

exports.removeByRole     = (roleId)     => RoleActionPermission.deleteMany({ roleId }).exec();
exports.removeByIndustry = (industryId) => RoleActionPermission.deleteMany({ industryId }).exec();
exports.removeByScreen   = (screen_id)   => RoleActionPermission.deleteMany({ screen_id }).exec();
