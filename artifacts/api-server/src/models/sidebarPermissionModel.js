const mongoose = require('mongoose');

const sidebarPermissionSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarMenu', required: true },
    isVisible: { type: Boolean, default: true },
    orderOverride: { type: Number, default: null },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

sidebarPermissionSchema.virtual('menu_id')
  .get(function() { return this.menuId; })
  .set(function(v) { this.menuId = v; });

sidebarPermissionSchema.virtual('is_visible')
  .get(function() { return this.isVisible; })
  .set(function(v) { this.isVisible = v; });

sidebarPermissionSchema.virtual('order_override')
  .get(function() { return this.orderOverride; })
  .set(function(v) { this.orderOverride = v; });

sidebarPermissionSchema.index(
  { roleId: 1, industryId: 1, menuId: 1 },
  { unique: true, name: 'idx_perm_unique' },
);
sidebarPermissionSchema.index(
  { roleId: 1, industryId: 1, isVisible: 1 },
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
  if (roleId) q.roleId = roleId;
  if (industryId) q.industryId = industryId;
  if (mId) q.menuId = mId;
  if (visibleOnly) q.isVisible = true;
  return SidebarPermission.find(q).lean().exec();
};

exports.findById = async (id) => SidebarPermission.findById(id).lean().exec();

exports.upsert = async ({ roleId, industryId, menuId, menu_id, isVisible, is_visible, orderOverride, order_override }) => {
  const mId = menuId || menu_id;
  const vis = isVisible !== undefined ? isVisible : is_visible;
  const ord = orderOverride !== undefined ? orderOverride : order_override;
  const $set = {};
  if (vis !== undefined) $set.isVisible = !!vis;
  if (ord !== undefined) {
    $set.orderOverride = ord === null ? null : Number(ord);
  }
  await SidebarPermission.updateOne(
    { roleId, industryId, menuId: mId },
    { $set, $setOnInsert: { roleId, industryId, menuId: mId } },
    { upsert: true },
  );
  return SidebarPermission.findOne({ roleId, industryId, menuId: mId }).lean().exec();
};

exports.remove = async (id) => SidebarPermission.findByIdAndDelete(id).lean().exec();

exports.removeByCombo = async ({ roleId, industryId, menuId, menu_id }) => {
  const mId = menuId || menu_id;
  return SidebarPermission.deleteOne({ roleId, industryId, menuId: mId }).exec();
};

exports.removeByRoleIndustry = async ({ roleId, industryId }) =>
  SidebarPermission.deleteMany({ roleId, industryId }).exec();

exports.removeByIndustry = async (industryId) =>
  SidebarPermission.deleteMany({ industryId }).exec();

exports.removeByRole = async (roleId) =>
  SidebarPermission.deleteMany({ roleId }).exec();

exports.removeByMenu = async (menuId) =>
  SidebarPermission.deleteMany({ menuId }).exec();

exports.bulkSetForRoleIndustry = async ({ roleId, industryId, menuIds, menu_ids }) => {
  const ids = Array.isArray(menuIds || menu_ids) ? (menuIds || menu_ids) : [];
  await SidebarPermission.deleteMany({
    roleId,
    industryId,
    menuId: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((menuId) => ({
      updateOne: {
        filter: { roleId, industryId, menuId },
        update: {
          $set: { isVisible: true },
          $setOnInsert: { roleId, industryId, menuId },
        },
        upsert: true,
      },
    }));
    await SidebarPermission.bulkWrite(ops, { ordered: false });
  }
  return SidebarPermission.find({ roleId, industryId }).lean().exec();
};
