const mongoose = require('mongoose');

const sidebarMenuSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '' },
    route: { type: String, default: '' },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarMenu', default: null, alias: 'parentId' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    order: { type: Number, default: 0 },
    module: { type: String, default: '' },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

sidebarMenuSchema.index({ organization_id: 1, key: 1 }, { unique: true, name: 'idx_menu_org_key' });
sidebarMenuSchema.index({ organization_id: 1, parent_id: 1, order: 1 }, { name: 'idx_menu_org_parent_order' });

const SidebarMenu = mongoose.model('SidebarMenu', sidebarMenuSchema, 'sidebar_menus');

exports.SidebarMenu = SidebarMenu;

exports.list = async ({ activeOnly = false, parentId, parent_id, organizationId, organization_id } = {}) => {
  const pId = parentId !== undefined ? parentId : parent_id;
  const q = {};
  if (activeOnly) q.is_active = true;
  if (pId !== undefined) q.parent_id = pId;
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  if (orgId !== undefined) q.organization_id = orgId;
  return SidebarMenu.find(q).sort({ order: 1, name: 1 }).exec();
};

exports.findChildren = async (parentId) =>
  SidebarMenu.find({ parent_id: parentId }).exec();

exports.findById = async (id) => SidebarMenu.findById(id).exec();

exports.findByKey = async (key, organizationId) => {
  const q = { key: String(key).trim() };
  if (organizationId !== undefined) q.organization_id = organizationId;
  return SidebarMenu.findOne(q).exec();
};

exports.findByIds = async (ids) =>
  SidebarMenu.find({ _id: { $in: ids } }).exec();

exports.create = async ({ key, name, icon, route, parentId, parent_id, order, module: mod, isActive }) => {
  const pId = parentId !== undefined ? parentId : parent_id;
  const doc = await SidebarMenu.create({
    key: String(key).trim(),
    name: String(name).trim(),
    icon: icon || '',
    route: route || '',
    parent_id: pId || null,
    order: typeof order === 'number' ? order : 0,
    module: mod || '',
    is_active: isActive !== false,
  });
  return doc;
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.key !== undefined) update.key = String(patch.key).trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.icon !== undefined) update.icon = String(patch.icon);
  if (patch.route !== undefined) update.route = String(patch.route);
  const pId = patch.parentId !== undefined ? patch.parentId : patch.parent_id;
  if (pId !== undefined) update.parent_id = pId || null;
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.module !== undefined) update.module = String(patch.module);
  if (patch.isActive !== undefined) update.is_active = !!patch.isActive;
  return SidebarMenu.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
};

exports.remove = async (id) => SidebarMenu.findByIdAndDelete(id).exec();

exports.upsertByKey = async (key, attrs) => {
  const safe = String(key).trim();
  const pId = attrs.parentId !== undefined ? attrs.parentId : attrs.parent_id;
  const $set = {
    name: attrs.name,
    icon: attrs.icon || '',
    route: attrs.route || '',
    parent_id: pId || null,
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    module: attrs.module || '',
    is_active: attrs.isActive !== false,
  };
  await SidebarMenu.updateOne({ key: safe }, { $set, $setOnInsert: { key: safe } }, { upsert: true });
  return SidebarMenu.findOne({ key: safe }).exec();
};
