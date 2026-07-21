const mongoose = require('mongoose');

const sidebarMenuSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: '' },
    route: { type: String, default: '' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarMenu', default: null },
    order: { type: Number, default: 0 },
    module: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

sidebarMenuSchema.virtual('parent_id')
  .get(function() { return this.parentId; })
  .set(function(v) { this.parentId = v; });

sidebarMenuSchema.index({ key: 1 }, { unique: true, name: 'idx_menu_key' });
sidebarMenuSchema.index({ parentId: 1, order: 1 }, { name: 'idx_menu_parent_order' });

const SidebarMenu = mongoose.model('SidebarMenu', sidebarMenuSchema, 'sidebar_menus');

exports.SidebarMenu = SidebarMenu;

exports.list = async ({ activeOnly = false, parentId, parent_id } = {}) => {
  const pId = parentId !== undefined ? parentId : parent_id;
  const q = activeOnly ? { isActive: true } : {};
  if (pId !== undefined) q.parentId = pId;
  return SidebarMenu.find(q).sort({ order: 1, name: 1 }).lean().exec();
};

exports.findChildren = async (parentId) =>
  SidebarMenu.find({ parentId }).lean().exec();

exports.findById = async (id) => SidebarMenu.findById(id).lean().exec();

exports.findByKey = async (key) =>
  SidebarMenu.findOne({ key: String(key).trim() }).lean().exec();

exports.findByIds = async (ids) =>
  SidebarMenu.find({ _id: { $in: ids } }).lean().exec();

exports.create = async ({ key, name, icon, route, parentId, parent_id, order, module: mod, isActive }) => {
  const pId = parentId !== undefined ? parentId : parent_id;
  const doc = await SidebarMenu.create({
    key: String(key).trim(),
    name: String(name).trim(),
    icon: icon || '',
    route: route || '',
    parentId: pId || null,
    order: typeof order === 'number' ? order : 0,
    module: mod || '',
    isActive: isActive !== false,
  });
  return doc.toObject();
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.key !== undefined) update.key = String(patch.key).trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.icon !== undefined) update.icon = String(patch.icon);
  if (patch.route !== undefined) update.route = String(patch.route);
  const pId = patch.parentId !== undefined ? patch.parentId : patch.parent_id;
  if (pId !== undefined) update.parentId = pId || null;
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.module !== undefined) update.module = String(patch.module);
  if (patch.isActive !== undefined) update.isActive = !!patch.isActive;
  return SidebarMenu.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
};

exports.remove = async (id) => SidebarMenu.findByIdAndDelete(id).lean().exec();

exports.upsertByKey = async (key, attrs) => {
  const safe = String(key).trim();
  const pId = attrs.parentId !== undefined ? attrs.parentId : attrs.parent_id;
  const $set = {
    name: attrs.name,
    icon: attrs.icon || '',
    route: attrs.route || '',
    parentId: pId || null,
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    module: attrs.module || '',
    isActive: attrs.isActive !== false,
  };
  await SidebarMenu.updateOne({ key: safe }, { $set, $setOnInsert: { key: safe } }, { upsert: true });
  return SidebarMenu.findOne({ key: safe }).lean().exec();
};
