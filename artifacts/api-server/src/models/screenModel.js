const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

screenSchema.index({ organization_id: 1, key: 1 }, { unique: true, name: 'idx_screen_org_key' });

const Screen = mongoose.model('Screen', screenSchema, 'screens');

exports.Screen = Screen;

exports.list = async ({ activeOnly = false, organizationId, organization_id } = {}) => {
  const q = {};
  if (activeOnly) q.is_active = true;
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  if (orgId !== undefined && orgId !== null && orgId !== 'all' && orgId !== '') {
    q.$or = [{ organization_id: orgId }, { organization_id: null }, { organization_id: { $exists: false } }];
  }
  const rawList = await Screen.find(q).sort({ order: 1, name: 1 }).exec();

  const screenMap = new Map();
  for (const s of rawList) {
    const key = s.key;
    const existing = screenMap.get(key);
    if (!existing) {
      screenMap.set(key, s);
    } else if (orgId && (s.organization_id === orgId || s.organizationId === orgId)) {
      screenMap.set(key, s);
    }
  }
  return Array.from(screenMap.values());
};

exports.findById = async (id) => Screen.findById(id).exec();

exports.findByKey = async (key, organizationId) => {
  const q = { key: String(key).trim() };
  if (organizationId !== undefined) q.organization_id = organizationId;
  return Screen.findOne(q).exec();
};

exports.create = async ({ key, name, description, order, isActive }) => {
  const doc = await Screen.create({
    key: String(key).trim(),
    name: String(name).trim(),
    description: description || '',
    order: typeof order === 'number' ? order : 0,
    is_active: isActive !== false,
  });
  return doc;
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.key !== undefined) update.key = String(patch.key).trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.description !== undefined) update.description = String(patch.description);
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.isActive !== undefined) update.is_active = !!patch.isActive;
  return Screen.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
};

exports.remove = async (id) => Screen.findByIdAndDelete(id).exec();

exports.upsertByKey = async (key, attrs) => {
  const safe = String(key).trim();
  const $set = {
    name: attrs.name,
    description: attrs.description || '',
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    is_active: attrs.isActive !== false,
  };
  await Screen.updateOne({ key: safe }, { $set, $setOnInsert: { key: safe } }, { upsert: true });
  return Screen.findOne({ key: safe }).exec();
};
