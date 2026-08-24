const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    industry_id: { type: String, default: null, alias: 'industryId' },
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
  } else {
    q.$or = [{ organization_id: null }, { organization_id: { $exists: false } }];
  }
  const rawList = await Screen.find(q).sort({ order: 1, name: 1 }).exec();

  function shapePublic(doc) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...o,
      _id: String(o._id),
      id: String(o._id),
      key: o.key,
      name: o.name,
      description: o.description || '',
      order: typeof o.order === 'number' ? o.order : 0,
      isActive: o.isActive !== false && o.is_active !== false,
      is_active: o.isActive !== false && o.is_active !== false,
      organizationId: o.organizationId || o.organization_id || null,
      organization_id: o.organizationId || o.organization_id || null,
    };
  }

  const screenMap = new Map();
  for (const s of rawList) {
    const key = s.key;
    const shaped = shapePublic(s);
    const existing = screenMap.get(key);
    if (!existing) {
      screenMap.set(key, shaped);
    } else if (orgId && (s.organization_id === orgId || s.organizationId === orgId)) {
      screenMap.set(key, shaped);
    }
  }
  return Array.from(screenMap.values());
};

exports.findById = async (id) => Screen.findById(id).exec();

exports.findByKey = async (key, organizationId) => {
  const q = { key: String(key).trim() };
  if (organizationId) {
    const doc = await Screen.findOne({ key: q.key, organization_id: organizationId }).exec();
    if (doc) return doc;
  }
  return Screen.findOne({
    key: q.key,
    $or: [{ organization_id: null }, { organization_id: { $exists: false } }, { organization_id: '' }]
  }).exec();
};

exports.create = async ({ key, name, description, order, isActive, organizationId, organization_id, workspaceId, workspace_id, industryId, industry_id }) => {
  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const wsId = workspaceId !== undefined ? workspaceId : workspace_id;
  const indId = industryId !== undefined ? industryId : industry_id;
  const doc = await Screen.create({
    key: String(key).trim(),
    name: String(name).trim(),
    description: description || '',
    order: typeof order === 'number' ? order : 0,
    is_active: isActive !== false,
    organization_id: orgId || null,
    workspace_id: wsId || null,
    industry_id: indId || null,
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
