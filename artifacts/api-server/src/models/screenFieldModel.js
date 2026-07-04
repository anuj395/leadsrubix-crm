const mongoose = require('mongoose');

const FIELD_TYPES = ['text', 'number', 'select', 'date', 'email', 'textarea', 'checkbox', 'badge', 'avatar', 'phone', 'image'];
const DROPDOWN_SOURCES = ['none', 'static', 'api'];

const screenFieldSchema = new mongoose.Schema(
  {
    screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    field_key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: FIELD_TYPES, default: 'text' },
    options: { type: [String], default: [] }, // for static select fields
    // Dynamic-dropdown config (only meaningful when type === 'select'):
    //   - 'none'   → ignore (treat as plain text-ish select with empty options)
    //   - 'static' → use the `options` array above
    //   - 'api'    → fetch dropdown_api at form-render time and use the response
    dropdown_source: { type: String, enum: DROPDOWN_SOURCES, default: 'none' },
    dropdown_api: { type: String, default: '', trim: true },
    is_table_visible: { type: Boolean, default: true },
    is_form_visible: { type: Boolean, default: true },
    is_required: { type: Boolean, default: false },
    sortable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    default_value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

screenFieldSchema.index(
  { screen_id: 1, field_key: 1 },
  { unique: true, name: 'idx_screen_field_unique' },
);
screenFieldSchema.index({ screen_id: 1, order: 1 }, { name: 'idx_screen_field_order' });

const ScreenField = mongoose.model('ScreenField', screenFieldSchema, 'screen_fields');

exports.ScreenField = ScreenField;
exports.FIELD_TYPES = FIELD_TYPES;
exports.DROPDOWN_SOURCES = DROPDOWN_SOURCES;

exports.list = async ({ screen_id, activeOnly = false } = {}) => {
  const q = {};
  if (screen_id) q.screen_id = screen_id;
  if (activeOnly) q.isActive = true;
  return ScreenField.find(q).sort({ order: 1, label: 1 }).lean().exec();
};

exports.findById = async (id) => ScreenField.findById(id).lean().exec();

exports.findByScreenAndKey = async (screen_id, field_key) =>
  ScreenField.findOne({ screen_id, field_key: String(field_key).trim() }).lean().exec();

function normalizeDropdown(payload) {
  const source = DROPDOWN_SOURCES.includes(payload.dropdown_source) ? payload.dropdown_source : 'none';
  const apiUrl = source === 'api' ? String(payload.dropdown_api || '').trim() : '';
  return { dropdown_source: source, dropdown_api: apiUrl };
}

exports.create = async (payload) => {
  const dd = normalizeDropdown(payload);
  const doc = await ScreenField.create({
    screen_id: payload.screen_id,
    field_key: String(payload.field_key).trim(),
    label: String(payload.label).trim(),
    type: payload.type || 'text',
    options: Array.isArray(payload.options) ? payload.options : [],
    dropdown_source: dd.dropdown_source,
    dropdown_api: dd.dropdown_api,
    is_table_visible: payload.is_table_visible !== false,
    is_form_visible: payload.is_form_visible !== false,
    is_required: !!payload.is_required,
    sortable: payload.sortable !== false,
    order: typeof payload.order === 'number' ? payload.order : 0,
    isActive: payload.isActive !== false,
    default_value: payload.default_value !== undefined ? payload.default_value : null,
  });
  return doc.toObject();
};

exports.update = async (id, patch) => {
  const update = {};
  if (patch.field_key !== undefined) update.field_key = String(patch.field_key).trim();
  if (patch.label !== undefined) update.label = String(patch.label).trim();
  if (patch.type !== undefined) update.type = String(patch.type);
  if (patch.options !== undefined) update.options = Array.isArray(patch.options) ? patch.options : [];
  if (patch.dropdown_source !== undefined || patch.dropdown_api !== undefined) {
    const dd = normalizeDropdown({
      dropdown_source: patch.dropdown_source,
      dropdown_api: patch.dropdown_api,
    });
    update.dropdown_source = dd.dropdown_source;
    update.dropdown_api = dd.dropdown_api;
  }
  if (patch.is_table_visible !== undefined) update.is_table_visible = !!patch.is_table_visible;
  if (patch.is_form_visible !== undefined) update.is_form_visible = !!patch.is_form_visible;
  if (patch.is_required !== undefined) update.is_required = !!patch.is_required;
  if (patch.sortable !== undefined) update.sortable = !!patch.sortable;
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.isActive !== undefined) update.isActive = !!patch.isActive;
  if (patch.default_value !== undefined) update.default_value = patch.default_value;
  return ScreenField.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
};

exports.remove = async (id) => ScreenField.findByIdAndDelete(id).lean().exec();

exports.removeByScreen = async (screen_id) =>
  ScreenField.deleteMany({ screen_id }).exec();

exports.upsertByKey = async (screen_id, field_key, attrs) => {
  const key = String(field_key).trim();
  const dd = normalizeDropdown(attrs);
  const $set = {
    label: attrs.label,
    type: attrs.type || 'text',
    options: Array.isArray(attrs.options) ? attrs.options : [],
    dropdown_source: dd.dropdown_source,
    dropdown_api: dd.dropdown_api,
    is_table_visible: attrs.is_table_visible !== false,
    is_form_visible: attrs.is_form_visible !== false,
    is_required: !!attrs.is_required,
    sortable: attrs.sortable !== false,
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    isActive: attrs.isActive !== false,
    default_value: attrs.default_value !== undefined ? attrs.default_value : null,
  };
  await ScreenField.updateOne(
    { screen_id, field_key: key },
    { $set, $setOnInsert: { screen_id, field_key: key } },
    { upsert: true },
  );
  return ScreenField.findOne({ screen_id, field_key: key }).lean().exec();
};
