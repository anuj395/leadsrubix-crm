const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

screenSchema.index({ key: 1 }, { unique: true, name: 'idx_screen_key' });

const Screen = mongoose.model('Screen', screenSchema, 'screens');

exports.Screen = Screen;

exports.list = async ({ activeOnly = false } = {}) => {
  const q = activeOnly ? { isActive: true } : {};
  return Screen.find(q).sort({ order: 1, name: 1 }).lean().exec();
};

exports.findById = async (id) => Screen.findById(id).lean().exec();

exports.findByKey = async (key) =>
  Screen.findOne({ key: String(key).trim() }).lean().exec();

exports.create = async ({ key, name, description, order, isActive }) => {
  const doc = await Screen.create({
    key: String(key).trim(),
    name: String(name).trim(),
    description: description || '',
    order: typeof order === 'number' ? order : 0,
    isActive: isActive !== false,
  });
  return doc.toObject();
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.key !== undefined) update.key = String(patch.key).trim();
  if (patch.name !== undefined) update.name = String(patch.name).trim();
  if (patch.description !== undefined) update.description = String(patch.description);
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.isActive !== undefined) update.isActive = !!patch.isActive;
  return Screen.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
};

exports.remove = async (id) => Screen.findByIdAndDelete(id).lean().exec();

exports.upsertByKey = async (key, attrs) => {
  const safe = String(key).trim();
  const $set = {
    name: attrs.name,
    description: attrs.description || '',
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    isActive: attrs.isActive !== false,
  };
  await Screen.updateOne({ key: safe }, { $set, $setOnInsert: { key: safe } }, { upsert: true });
  return Screen.findOne({ key: safe }).lean().exec();
};
