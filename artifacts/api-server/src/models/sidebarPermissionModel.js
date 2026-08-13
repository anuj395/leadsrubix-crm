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
  let rawPerms = [];
  if (orgId !== undefined && orgId !== null && orgId !== 'all' && orgId !== '') {
    const orgQuery = { ...q, organization_id: orgId };
    const orgCount = await SidebarPermission.countDocuments(orgQuery);
    if (orgCount > 0) {
      rawPerms = await SidebarPermission.find(orgQuery).exec();
    } else {
      q.organization_id = null;
      rawPerms = await SidebarPermission.find(q).exec();
    }
  } else {
    q.organization_id = null;
    rawPerms = await SidebarPermission.find(q).exec();
  }

  if (orgId && rawPerms.length > 0) {
    const mongoose = require('mongoose');
    const SidebarMenu = mongoose.model('SidebarMenu');
    const allOrgMenus = await SidebarMenu.find({
      $or: [
        { organization_id: orgId },
        { organization_id: null }
      ]
    }).lean().exec();

    const keyToClonedId = new Map();
    const globalIdToKey = new Map();

    for (const m of allOrgMenus) {
      if (m.organization_id === orgId || m.organizationId === orgId) {
        keyToClonedId.set(m.key, String(m._id));
      } else {
        globalIdToKey.set(String(m._id), m.key);
      }
    }

    rawPerms = rawPerms.map(p => {
      const o = p.toObject ? p.toObject() : p;
      const menuIdStr = String(o.menu_id || o.menuId);
      let targetKey = globalIdToKey.get(menuIdStr);
      if (!targetKey) {
        const mObj = allOrgMenus.find(m => String(m._id) === menuIdStr);
        if (mObj) targetKey = mObj.key;
      }
      if (targetKey && keyToClonedId.has(targetKey)) {
        o.menu_id = new mongoose.Types.ObjectId(keyToClonedId.get(targetKey));
        o.menuId = o.menu_id;
      }
      return o;
    });
  }
  return rawPerms;
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

  const mongoose = require('mongoose');
  const SidebarMenu = mongoose.model('SidebarMenu');

  // 1. Fetch all checked menus to find their keys
  const checkedMenus = await SidebarMenu.find({
    _id: { $in: ids }
  }).lean().exec();
  const checkedKeys = new Set(checkedMenus.map(m => m.key));

  // 2. Fetch all menus matching orgId or null
  const allMenus = await SidebarMenu.find({
    $or: [
      { organization_id: orgId },
      { organization_id: null }
    ]
  }).lean().exec();

  // 3. Separate menu IDs into checked (to enable) and unchecked (to delete)
  const checkedMenuIds = [];
  const uncheckedMenuIds = [];

  for (const m of allMenus) {
    if (checkedKeys.has(m.key)) {
      if (orgId) {
        if (m.organization_id === orgId || m.organizationId === orgId) {
          checkedMenuIds.push(m._id);
        } else {
          const hasClone = allMenus.some(c => c.key === m.key && (c.organization_id === orgId || c.organizationId === orgId));
          if (!hasClone) {
            checkedMenuIds.push(m._id);
          } else {
            uncheckedMenuIds.push(m._id);
          }
        }
      } else {
        if (!m.organization_id && !m.organizationId) {
          checkedMenuIds.push(m._id);
        }
      }
    } else {
      uncheckedMenuIds.push(m._id);
    }
  }

  // 4. Delete any permissions for unchecked menus (both cloned and global IDs)
  if (uncheckedMenuIds.length > 0) {
    await SidebarPermission.deleteMany({
      role_id: roleId,
      industry_id: industryId,
      organization_id: orgId,
      menu_id: { $in: uncheckedMenuIds }
    });
  }

  // 5. Upsert checked menu permissions
  if (checkedMenuIds.length > 0) {
    const ops = checkedMenuIds.map((menuId) => ({
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
