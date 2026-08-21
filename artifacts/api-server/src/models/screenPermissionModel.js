const mongoose = require('mongoose');

const screenPermissionSchema = new mongoose.Schema(
  {
    screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true, alias: 'screenId' },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, alias: 'roleId' },
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true, alias: 'industryId' },
    field_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ScreenField', required: true, alias: 'fieldId' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    is_enabled: { type: Boolean, default: true, alias: 'isEnabled' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

screenPermissionSchema.index(
  { organization_id: 1, workspace_id: 1, screen_id: 1, role_id: 1, industry_id: 1, field_id: 1 },
  { unique: true, name: 'idx_screen_perm_scoped_unique' },
);
screenPermissionSchema.index(
  { organization_id: 1, workspace_id: 1, screen_id: 1, role_id: 1, industry_id: 1, is_enabled: 1 },
  { name: 'idx_screen_perm_scoped_lookup' },
);

const ScreenPermission = mongoose.model(
  'ScreenPermission',
  screenPermissionSchema,
  'screen_permissions',
);

exports.ScreenPermission = ScreenPermission;

exports.list = async ({ screenId, roleId, industryId, fieldId, enabledOnly = false, organizationId, organization_id, workspaceId, workspace_id } = {}) => {
  const mongoose = require('mongoose');
  const Screen = mongoose.model('Screen');
  const Role = mongoose.model('Role');

  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const wsId = workspaceId !== undefined ? workspaceId : (workspace_id !== undefined ? workspace_id : null);

  const q = {};
  if (industryId) q.industry_id = industryId;
  if (fieldId) q.field_id = fieldId;
  if (enabledOnly) q.is_enabled = true;

  if (screenId) {
    const sDoc = await Screen.findById(screenId).lean().exec();
    if (sDoc) {
      const allScreensForThisKey = await Screen.find({ key: sDoc.key }).select('_id').lean().exec();
      q.screen_id = { $in: allScreensForThisKey.map(s => s._id) };
    } else {
      q.screen_id = screenId;
    }
  }

  if (roleId) {
    const rDoc = await Role.findById(roleId).lean().exec();
    if (rDoc) {
      const allRolesForThisKey = await Role.find({ key: rDoc.key }).select('_id').lean().exec();
      q.role_id = { $in: allRolesForThisKey.map(r => r._id) };
    } else {
      q.role_id = roleId;
    }
  }

  let rawPerms = [];
  if (orgId !== undefined && orgId !== null && orgId !== 'all' && orgId !== '') {
    const orgQuery = { ...q, organization_id: orgId };
    if (wsId) {
      orgQuery.workspace_id = wsId;
    }
    rawPerms = await ScreenPermission.find(orgQuery).lean().exec();
    if (!rawPerms.length && wsId) {
      delete orgQuery.workspace_id;
      rawPerms = await ScreenPermission.find(orgQuery).lean().exec();
    }
    if (!rawPerms.length) {
      const fallbackQuery = { ...q, organization_id: null };
      rawPerms = await ScreenPermission.find(fallbackQuery).lean().exec();
    }
  } else {
    q.organization_id = null;
    rawPerms = await ScreenPermission.find(q).lean().exec();
  }

  return rawPerms;
};



exports.findById = async (id) => ScreenPermission.findById(id).exec();

exports.upsert = async ({ screenId, roleId, industryId, fieldId, isEnabled, is_enabled, organizationId, organization_id }) => {
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const enabled = isEnabled !== undefined ? isEnabled : is_enabled;
  const $set = {};
  if (enabled !== undefined) $set.is_enabled = !!enabled;
  const q = { screen_id: screenId, role_id: roleId, industry_id: industryId, field_id: fieldId, organization_id: orgId };
  await ScreenPermission.updateOne(
    q,
    { $set, $setOnInsert: q },
    { upsert: true },
  );
  return ScreenPermission.findOne(q).exec();
};

exports.remove = async (id) => ScreenPermission.findByIdAndDelete(id).exec();

exports.removeByScreen = async (screenId) =>
  ScreenPermission.deleteMany({ screen_id: screenId }).exec();

exports.removeByRole = async (roleId) =>
  ScreenPermission.deleteMany({ role_id: roleId }).exec();

exports.removeByIndustry = async (industryId) =>
  ScreenPermission.deleteMany({ industry_id: industryId }).exec();

exports.removeByField = async (fieldId) =>
  ScreenPermission.deleteMany({ field_id: fieldId }).exec();

exports.bulkSetForCombo = async ({ screenId, roleId, industryId, fieldIds, organizationId, organization_id, workspaceId, workspace_id }) => {
  const ids = Array.isArray(fieldIds) ? fieldIds : [];
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const wsId = workspaceId !== undefined ? workspaceId : (workspace_id !== undefined ? workspace_id : null);
  await ScreenPermission.deleteMany({
    screen_id: screenId,
    role_id: roleId,
    industry_id: industryId,
    organization_id: orgId,
    workspace_id: wsId,
    field_id: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((fieldId) => ({
      updateOne: {
        filter: { screen_id: screenId, role_id: roleId, industry_id: industryId, field_id: fieldId, organization_id: orgId, workspace_id: wsId },
        update: {
          $set: { is_enabled: true },
          $setOnInsert: { screen_id: screenId, role_id: roleId, industry_id: industryId, field_id: fieldId, organization_id: orgId, workspace_id: wsId },
        },
        upsert: true,
      },
    }));
    await ScreenPermission.bulkWrite(ops, { ordered: false });
  }
  return ScreenPermission.find({ screen_id: screenId, role_id: roleId, industry_id: industryId, organization_id: orgId, workspace_id: wsId }).exec();
};
