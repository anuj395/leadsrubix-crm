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
  { organization_id: 1, screen_id: 1, role_id: 1, industry_id: 1, field_id: 1 },
  { unique: true, name: 'idx_screen_perm_org_unique' },
);
screenPermissionSchema.index(
  { organization_id: 1, screen_id: 1, role_id: 1, industry_id: 1, is_enabled: 1 },
  { name: 'idx_screen_perm_org_lookup' },
);

const ScreenPermission = mongoose.model(
  'ScreenPermission',
  screenPermissionSchema,
  'screen_permissions',
);

exports.ScreenPermission = ScreenPermission;

exports.list = async ({ screenId, roleId, industryId, fieldId, enabledOnly = false, organizationId, organization_id } = {}) => {
  const q = {};
  if (screenId) q.screen_id = screenId;
  if (roleId) q.role_id = roleId;
  if (industryId) q.industry_id = industryId;
  if (fieldId) q.field_id = fieldId;
  if (enabledOnly) q.is_enabled = true;
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  if (orgId !== undefined && orgId !== null && orgId !== 'all' && orgId !== '') {
    q.$or = [{ organization_id: orgId }, { organization_id: null }];
  } else {
    q.organization_id = null;
  }
  return ScreenPermission.find(q).exec();
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

exports.bulkSetForCombo = async ({ screenId, roleId, industryId, fieldIds, organizationId, organization_id }) => {
  const ids = Array.isArray(fieldIds) ? fieldIds : [];
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  await ScreenPermission.deleteMany({
    screen_id: screenId,
    role_id: roleId,
    industry_id: industryId,
    organization_id: orgId,
    field_id: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((fieldId) => ({
      updateOne: {
        filter: { screen_id: screenId, role_id: roleId, industry_id: industryId, field_id: fieldId, organization_id: orgId },
        update: {
          $set: { is_enabled: true },
          $setOnInsert: { screen_id: screenId, role_id: roleId, industry_id: industryId, field_id: fieldId, organization_id: orgId },
        },
        upsert: true,
      },
    }));
    await ScreenPermission.bulkWrite(ops, { ordered: false });
  }
  return ScreenPermission.find({ screen_id: screenId, role_id: roleId, industry_id: industryId, organization_id: orgId }).exec();
};
