const mongoose = require('mongoose');

const sidebarPermissionSchema = new mongoose.Schema(
  {
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, alias: 'roleId' },
    industry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true, alias: 'industryId' },
    menu_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarMenu', required: true, alias: 'menuId' },
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
  { role_id: 1, industry_id: 1, menu_id: 1 },
  { unique: true, name: 'idx_perm_unique' },
);
sidebarPermissionSchema.index(
  { role_id: 1, industry_id: 1, is_visible: 1 },
  { name: 'idx_perm_lookup' },
);

const SidebarPermission = mongoose.model(
  'SidebarPermission',
  sidebarPermissionSchema,
  'sidebar_permissions',
);

exports.SidebarPermission = SidebarPermission;

exports.list = async ({ roleId, industryId, menuId, menu_id, visibleOnly = false } = {}) => {
  const mId = menuId || menu_id;
  const q = {};
  if (roleId) q.role_id = roleId;
  if (industryId) q.industry_id = industryId;
  if (mId) q.menu_id = mId;
  if (visibleOnly) q.is_visible = true;
  return SidebarPermission.find(q).exec();
};

exports.findById = async (id) => SidebarPermission.findById(id).exec();

exports.upsert = async ({ roleId, industryId, menuId, menu_id, isVisible, is_visible, orderOverride, order_override }) => {
  const mId = menuId || menu_id;
  const vis = isVisible !== undefined ? isVisible : is_visible;
  const ord = orderOverride !== undefined ? orderOverride : order_override;
  const $set = {};
  if (vis !== undefined) $set.is_visible = !!vis;
  if (ord !== undefined) {
    $set.order_override = ord === null ? null : Number(ord);
  }
  await SidebarPermission.updateOne(
    { role_id: roleId, industry_id: industryId, menu_id: mId },
    { $set, $setOnInsert: { role_id: roleId, industry_id: industryId, menu_id: mId } },
    { upsert: true },
  );
  return SidebarPermission.findOne({ role_id: roleId, industry_id: industryId, menu_id: mId }).exec();
};

exports.remove = async (id) => SidebarPermission.findByIdAndDelete(id).exec();

exports.removeByCombo = async ({ roleId, industryId, menuId, menu_id }) => {
  const mId = menuId || menu_id;
  return SidebarPermission.deleteOne({ role_id: roleId, industry_id: industryId, menu_id: mId }).exec();
};

exports.removeByRoleIndustry = async ({ roleId, industryId }) =>
  SidebarPermission.deleteMany({ role_id: roleId, industry_id: industryId }).exec();

exports.removeByIndustry = async (industryId) =>
  SidebarPermission.deleteMany({ industry_id: industryId }).exec();

exports.removeByRole = async (roleId) =>
  SidebarPermission.deleteMany({ role_id: roleId }).exec();

exports.removeByMenu = async (menuId) =>
  SidebarPermission.deleteMany({ menu_id: menuId }).exec();

exports.bulkSetForRoleIndustry = async ({ roleId, industryId, menuIds, menu_ids }) => {
  const ids = Array.isArray(menuIds || menu_ids) ? (menuIds || menu_ids) : [];
  await SidebarPermission.deleteMany({
    role_id: roleId,
    industry_id: industryId,
    menu_id: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((menuId) => ({
      updateOne: {
        filter: { role_id: roleId, industry_id: industryId, menu_id: menuId },
        update: {
          $set: { is_visible: true },
          $setOnInsert: { role_id: roleId, industry_id: industryId, menu_id: menuId },
        },
        upsert: true,
      },
    }));
    await SidebarPermission.bulkWrite(ops, { ordered: false });
  }
  return SidebarPermission.find({ role_id: roleId, industry_id: industryId }).exec();
};
