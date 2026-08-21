const mongoose = require('mongoose');

/**
 * One row per (role, industry, screen) granting any subset of the four basic
 * actions. SuperAdmin and admin roles are treated as implicit allow at the
 * service layer — no row required.
 */
const roleActionPermissionSchema = new mongoose.Schema(
  {
    role_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Role',         required: true, alias: 'roleId' },
    industry_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Industry',     required: true, alias: 'industryId' },
    screen_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Screen',       required: true, alias: 'screenId' },
    organization_id: { type: String, ref: 'Organization', default: null, alias: 'organizationId' },
    workspace_id:    { type: String, ref: 'Workspace', default: null, alias: 'workspaceId' },
    can_view:        { type: Boolean, default: false, alias: 'canView' },
    can_add:         { type: Boolean, default: false, alias: 'canAdd' },
    can_edit:        { type: Boolean, default: false, alias: 'canEdit' },
    can_delete:      { type: Boolean, default: false, alias: 'canDelete' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

roleActionPermissionSchema.index(
  { role_id: 1, industry_id: 1, screen_id: 1, organization_id: 1, workspace_id: 1 },
  { unique: true, name: 'idx_role_action_perm_scoped_unique' },
);

const RoleActionPermission = mongoose.model(
  'RoleActionPermission',
  roleActionPermissionSchema,
  'role_action_permissions',
);

exports.RoleActionPermission = RoleActionPermission;

exports.list = async ({ roleId, industryId, screenId, organizationId, organization_id, workspaceId, workspace_id } = {}) => {
  const q = {};
  if (roleId) q.role_id = roleId;
  if (industryId) q.industry_id = industryId;
  if (screenId) q.screen_id = screenId;
  
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  if (orgId !== undefined) q.organization_id = orgId;
  
  const wsId = workspaceId !== undefined ? workspaceId : workspace_id;
  if (wsId !== undefined) q.workspace_id = wsId;

  return RoleActionPermission.find(q).lean().exec();
};

exports.findFor = ({ roleId, industryId, screenId, organizationId, organization_id, workspaceId, workspace_id }) => {
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const wsId = workspaceId !== undefined ? workspaceId : workspace_id;
  return RoleActionPermission.findOne({
    role_id: roleId,
    industry_id: industryId,
    screen_id: screenId,
    organization_id: orgId || null,
    workspace_id: wsId || null,
  }).lean().exec();
};

exports.upsert = async ({
  roleId, industryId, screenId, organizationId, organization_id, workspaceId, workspace_id,
  canView, can_view, canAdd, can_add, canEdit, can_edit, canDelete, can_delete,
}) => {
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const wsId = workspaceId !== undefined ? workspaceId : workspace_id;

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
    { role_id: roleId, industry_id: industryId, screen_id: screenId, organization_id: orgId || null, workspace_id: wsId || null },
    { $set, $setOnInsert: { role_id: roleId, industry_id: industryId, screen_id: screenId, organization_id: orgId || null, workspace_id: wsId || null } },
    { upsert: true },
  );
  return RoleActionPermission.findOne({
    role_id: roleId,
    industry_id: industryId,
    screen_id: screenId,
    organization_id: orgId || null,
    workspace_id: wsId || null,
  }).lean().exec();
};

exports.removeByRole     = (roleId)     => RoleActionPermission.deleteMany({ role_id: roleId }).exec();
exports.removeByIndustry = (industryId) => RoleActionPermission.deleteMany({ industry_id: industryId }).exec();
exports.removeByScreen   = (screenId)   => RoleActionPermission.deleteMany({ screen_id: screenId }).exec();
