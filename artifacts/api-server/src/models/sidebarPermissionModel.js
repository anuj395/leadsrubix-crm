const mongoose = require('mongoose');

const sidebarPermissionSchema = new mongoose.Schema(
  {
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, alias: 'roleId' },
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true, alias: 'industryId' },
    menu_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarMenu', required: true, alias: 'menuId' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    is_visible: { type: Boolean, default: true, alias: 'isVisible' },
    order_override: { type: Number, default: null, alias: 'orderOverride' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

sidebarPermissionSchema.index(
  { organization_id: 1, role_id: 1, industry_id: 1, menu_id: 1 },
  { unique: true, name: 'idx_perm_org_unique' },
);
sidebarPermissionSchema.index(
  { organization_id: 1, role_id: 1, industry_id: 1, is_visible: 1 },
  { name: 'idx_perm_org_lookup' },
);

const SidebarPermission = mongoose.model(
  'SidebarPermission',
  sidebarPermissionSchema,
  'sidebar_permissions',
);

exports.SidebarPermission = SidebarPermission;

exports.list = async ({ roleId, industryId, menuId, menu_id, visibleOnly = false, organizationId, organization_id } = {}) => {
  const mId = menuId || menu_id;
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const q = {};
  if (roleId) q.role_id = roleId;
  if (industryId) q.industry_id = industryId;
  if (mId) q.menu_id = mId;
  if (visibleOnly) q.is_visible = true;
  if (orgId !== undefined && orgId !== null && orgId !== 'all' && orgId !== '') {
    q.$or = [{ organization_id: orgId }, { organization_id: null }];
  } else {
    q.organization_id = null;
  }
  return SidebarPermission.find(q).exec();
};

exports.findById = async (id) => SidebarPermission.findById(id).exec();

exports.upsert = async ({ roleId, industryId, menuId, menu_id, isVisible, is_visible, orderOverride, order_override, organizationId, organization_id }) => {
  const mId = menuId || menu_id;
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const vis = isVisible !== undefined ? isVisible : is_visible;
  const ord = orderOverride !== undefined ? orderOverride : order_override;
  const $set = {};
  if (vis !== undefined) $set.is_visible = !!vis;
  if (ord !== undefined) {
    $set.order_override = ord === null ? null : Number(ord);
  }
  const q = { role_id: roleId, industry_id: industryId, menu_id: mId, organization_id: orgId };
  await SidebarPermission.updateOne(
    q,
    { $set, $setOnInsert: q },
    { upsert: true },
  );
  return SidebarPermission.findOne(q).exec();
};

exports.remove = async (id) => SidebarPermission.findByIdAndDelete(id).exec();

exports.removeByCombo = async ({ roleId, industryId, menuId, menu_id, organizationId, organization_id }) => {
  const mId = menuId || menu_id;
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  return SidebarPermission.deleteOne({ role_id: roleId, industry_id: industryId, menu_id: mId, organization_id: orgId }).exec();
};

exports.removeByRoleIndustry = async ({ roleId, industryId }) =>
  SidebarPermission.deleteMany({ role_id: roleId, industry_id: industryId }).exec();

exports.removeByIndustry = async (industryId) =>
  SidebarPermission.deleteMany({ industry_id: industryId }).exec();

exports.removeByRole = async (roleId) =>
  SidebarPermission.deleteMany({ role_id: roleId }).exec();

exports.removeByMenu = async (menuId) =>
  SidebarPermission.deleteMany({ menu_id: menuId }).exec();

exports.bulkSetForRoleIndustry = async ({ roleId, industryId, menuIds, menu_ids, organizationId, organization_id }) => {
  const ids = Array.isArray(menuIds || menu_ids) ? (menuIds || menu_ids) : [];
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  await SidebarPermission.deleteMany({
    role_id: roleId,
    industry_id: industryId,
    organization_id: orgId,
    menu_id: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((menuId) => ({
      updateOne: {
        filter: { role_id: roleId, industry_id: industryId, menu_id: menuId, organization_id: orgId },
        update: {
          $set: { is_visible: true },
          $setOnInsert: { role_id: roleId, industry_id: industryId, menu_id: menuId, organization_id: orgId },
        },
        upsert: true,
      },
    }));
    await SidebarPermission.bulkWrite(ops, { ordered: false });
  }
  return SidebarPermission.find({ role_id: roleId, industry_id: industryId, organization_id: orgId }).exec();
};
