const mongoose = require('mongoose');

const sidebarPermissionSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    menu_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarMenu', required: true },
    is_visible: { type: Boolean, default: true },
    order_override: { type: Number, default: null },
  },
  { timestamps: true },
);

sidebarPermissionSchema.index(
  { roleId: 1, industryId: 1, menu_id: 1 },
  { unique: true, name: 'idx_perm_unique' },
);
sidebarPermissionSchema.index(
  { roleId: 1, industryId: 1, is_visible: 1 },
  { name: 'idx_perm_lookup' },
);

const SidebarPermission = mongoose.model(
  'SidebarPermission',
  sidebarPermissionSchema,
  'sidebar_permissions',
);

exports.SidebarPermission = SidebarPermission;

exports.list = async ({ roleId, industryId, menu_id, visibleOnly = false } = {}) => {
  const q = {};
  if (roleId) q.roleId = roleId;
  if (industryId) q.industryId = industryId;
  if (menu_id) q.menu_id = menu_id;
  if (visibleOnly) q.is_visible = true;
  return SidebarPermission.find(q).lean().exec();
};

exports.findById = async (id) => SidebarPermission.findById(id).lean().exec();

exports.upsert = async ({ roleId, industryId, menu_id, is_visible, order_override }) => {
  const $set = {};
  if (is_visible !== undefined) $set.is_visible = !!is_visible;
  if (order_override !== undefined) {
    $set.order_override = order_override === null ? null : Number(order_override);
  }
  await SidebarPermission.updateOne(
    { roleId, industryId, menu_id },
    { $set, $setOnInsert: { roleId, industryId, menu_id } },
    { upsert: true },
  );
  return SidebarPermission.findOne({ roleId, industryId, menu_id }).lean().exec();
};

exports.remove = async (id) => SidebarPermission.findByIdAndDelete(id).lean().exec();

exports.removeByCombo = async ({ roleId, industryId, menu_id }) =>
  SidebarPermission.deleteOne({ roleId, industryId, menu_id }).exec();

exports.removeByRoleIndustry = async ({ roleId, industryId }) =>
  SidebarPermission.deleteMany({ roleId, industryId }).exec();

exports.removeByIndustry = async (industryId) =>
  SidebarPermission.deleteMany({ industryId }).exec();

exports.removeByRole = async (roleId) =>
  SidebarPermission.deleteMany({ roleId }).exec();

exports.removeByMenu = async (menu_id) =>
  SidebarPermission.deleteMany({ menu_id }).exec();

exports.bulkSetForRoleIndustry = async ({ roleId, industryId, menu_ids }) => {
  const ids = Array.isArray(menu_ids) ? menu_ids : [];
  await SidebarPermission.deleteMany({
    roleId,
    industryId,
    menu_id: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((menu_id) => ({
      updateOne: {
        filter: { roleId, industryId, menu_id },
        update: {
          $set: { is_visible: true },
          $setOnInsert: { roleId, industryId, menu_id },
        },
        upsert: true,
      },
    }));
    await SidebarPermission.bulkWrite(ops, { ordered: false });
  }
  return SidebarPermission.find({ roleId, industryId }).lean().exec();
};
