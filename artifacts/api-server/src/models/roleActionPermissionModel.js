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
  const mongoose = require('mongoose');
  const Screen = mongoose.model('Screen');
  const Role = mongoose.model('Role');

  const q = {};
  if (industryId) q.industry_id = industryId;

  if (screenId) {
    const sDoc = await Screen.findById(screenId).lean().exec();
    if (sDoc) {
      const allScreens = await Screen.find({ key: sDoc.key }).select('_id').lean().exec();
      q.screen_id = { $in: allScreens.map(s => s._id) };
    } else {
      q.screen_id = screenId;
    }
  }

  if (roleId) {
    const rDoc = await Role.findById(roleId).lean().exec();
    if (rDoc) {
      const allRoles = await Role.find({ key: rDoc.key }).select('_id').lean().exec();
      q.role_id = { $in: allRoles.map(r => r._id) };
    } else {
      q.role_id = roleId;
    }
  }

  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const wsId = workspaceId !== undefined ? workspaceId : workspace_id;

  if (orgId !== undefined && orgId !== null && orgId !== 'all') {
    const orgQuery = { ...q, organization_id: orgId };
    if (wsId) orgQuery.workspace_id = wsId;
    let raw = await RoleActionPermission.find(orgQuery).lean().exec();
    if (!raw.length && wsId) {
      delete orgQuery.workspace_id;
      raw = await RoleActionPermission.find(orgQuery).lean().exec();
    }
    if (!raw.length) {
      raw = await RoleActionPermission.find({ ...q, organization_id: null }).lean().exec();
    }
    return raw;
  } else {
    q.organization_id = null;
    return RoleActionPermission.find(q).lean().exec();
  }
};

exports.findFor = async ({ roleId, industryId, screenId, screen_key, role_key, organizationId, organization_id, workspaceId, workspace_id }) => {
  const mongoose = require('mongoose');
  const Screen = mongoose.model('Screen');
  const Role = mongoose.model('Role');

  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const wsId = workspaceId !== undefined ? workspaceId : (workspace_id !== undefined ? workspace_id : null);

  let screenIds = [];
  if (screenId) {
    const sDoc = await Screen.findById(screenId).lean().exec();
    if (sDoc) {
      const allScreens = await Screen.find({ key: sDoc.key }).select('_id').lean().exec();
      screenIds = allScreens.map(s => s._id);
    } else {
      screenIds = [screenId];
    }
  } else if (screen_key) {
    const allScreens = await Screen.find({ key: screen_key }).select('_id').lean().exec();
    screenIds = allScreens.map(s => s._id);
  }

  let roleIds = [];
  if (roleId) {
    const rDoc = await Role.findById(roleId).lean().exec();
    if (rDoc) {
      const allRoles = await Role.find({ key: rDoc.key }).select('_id').lean().exec();
      roleIds = allRoles.map(r => r._id);
    } else {
      roleIds = [roleId];
    }
  } else if (role_key) {
    const allRoles = await Role.find({ key: role_key }).select('_id').lean().exec();
    roleIds = allRoles.map(r => r._id);
  }

  const query = {
    screen_id: { $in: screenIds },
    role_id: { $in: roleIds },
  };
  if (industryId) query.industry_id = industryId;

  if (orgId) {
    query.organization_id = orgId;
    if (wsId) query.workspace_id = wsId;
    let doc = await RoleActionPermission.findOne(query).lean().exec();
    if (!doc && wsId) {
      delete query.workspace_id;
      doc = await RoleActionPermission.findOne(query).lean().exec();
    }
    return doc;
  }

  query.organization_id = null;
  return RoleActionPermission.findOne(query).lean().exec();
};

exports.upsert = async ({
  roleId, industryId, screenId, organizationId, organization_id, workspaceId, workspace_id,
  canView, can_view, canAdd, can_add, canEdit, can_edit, canDelete, can_delete,
}) => {
  const mongoose = require('mongoose');
  const Screen = mongoose.model('Screen');
  const Role = mongoose.model('Role');

  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const wsId = workspaceId !== undefined ? workspaceId : (workspace_id !== undefined ? workspace_id : (orgId ? 'ws_' + orgId : null));

  const cView = canView !== undefined ? canView : can_view;
  const cAdd = canAdd !== undefined ? canAdd : can_add;
  const cEdit = canEdit !== undefined ? canEdit : can_edit;
  const cDel = canDelete !== undefined ? canDelete : can_delete;

  const $set = {};
  if (cView !== undefined) $set.can_view = !!cView;
  if (cAdd  !== undefined) $set.can_add  = !!cAdd;
  if (cEdit !== undefined) $set.can_edit = !!cEdit;
  if (cDel  !== undefined) $set.can_delete = !!cDel;

  const [sDoc, rDoc] = await Promise.all([
    Screen.findById(screenId).lean().exec(),
    Role.findById(roleId).lean().exec(),
  ]);

  const allScreenIds = sDoc ? (await Screen.find({ key: sDoc.key }).select('_id').lean().exec()).map(s => s._id) : [screenId];
  const allRoleIds = rDoc ? (await Role.find({ key: rDoc.key }).select('_id').lean().exec()).map(r => r._id) : [roleId];

  for (const sId of allScreenIds) {
    for (const rId of allRoleIds) {
      await RoleActionPermission.updateOne(
        { role_id: rId, industry_id: industryId, screen_id: sId, organization_id: orgId || null, workspace_id: wsId || null },
        { $set, $setOnInsert: { role_id: rId, industry_id: industryId, screen_id: sId, organization_id: orgId || null, workspace_id: wsId || null } },
        { upsert: true },
      );
    }
  }

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
