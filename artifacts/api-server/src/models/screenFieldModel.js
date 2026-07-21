const mongoose = require('mongoose');

const FIELD_TYPES = ['text', 'number', 'select', 'date', 'email', 'textarea', 'checkbox', 'badge', 'avatar', 'phone', 'image'];
const DROPDOWN_SOURCES = ['none', 'static', 'api'];

const screenFieldSchema = new mongoose.Schema(
  {
    screenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    fieldKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: FIELD_TYPES, default: 'text' },
    options: { type: [String], default: [] }, // for static select fields
    dropdownSource: { type: String, enum: DROPDOWN_SOURCES, default: 'none' },
    dropdownApi: { type: String, default: '', trim: true },
    isTableVisible: { type: Boolean, default: true },
    isFormVisible: { type: Boolean, default: true },
    isRequired: { type: Boolean, default: false },
    sortable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

screenFieldSchema.virtual('field_key')
  .get(function() { return this.fieldKey; })
  .set(function(v) { this.fieldKey = v; });

screenFieldSchema.virtual('dropdown_source')
  .get(function() { return this.dropdownSource; })
  .set(function(v) { this.dropdownSource = v; });

screenFieldSchema.virtual('dropdown_api')
  .get(function() { return this.dropdownApi; })
  .set(function(v) { this.dropdownApi = v; });

screenFieldSchema.virtual('is_table_visible')
  .get(function() { return this.isTableVisible; })
  .set(function(v) { this.isTableVisible = v; });

screenFieldSchema.virtual('is_form_visible')
  .get(function() { return this.isFormVisible; })
  .set(function(v) { this.isFormVisible = v; });

screenFieldSchema.virtual('is_required')
  .get(function() { return this.isRequired; })
  .set(function(v) { this.isRequired = v; });

screenFieldSchema.virtual('default_value')
  .get(function() { return this.defaultValue; })
  .set(function(v) { this.defaultValue = v; });

screenFieldSchema.index(
  { screenId: 1, fieldKey: 1 },
  { unique: true, name: 'idx_screen_field_unique' },
);
screenFieldSchema.index({ screenId: 1, order: 1 }, { name: 'idx_screen_field_order' });

const ScreenField = mongoose.model('ScreenField', screenFieldSchema, 'screen_fields');

exports.ScreenField = ScreenField;
exports.FIELD_TYPES = FIELD_TYPES;
exports.DROPDOWN_SOURCES = DROPDOWN_SOURCES;

exports.list = async ({ screenId, activeOnly = false } = {}) => {
  const q = {};
  if (screenId) q.screenId = screenId;
  if (activeOnly) q.isActive = true;
  return ScreenField.find(q).sort({ order: 1, label: 1 }).lean().exec();
};

exports.findById = async (id) => ScreenField.findById(id).lean().exec();

exports.findByScreenAndKey = async (screenId, fieldKey) =>
  ScreenField.findOne({ screenId, fieldKey: String(fieldKey).trim() }).lean().exec();

function normalizeDropdown(payload) {
  const src = payload.dropdownSource || payload.dropdown_source;
  const api = payload.dropdownApi || payload.dropdown_api;
  const source = DROPDOWN_SOURCES.includes(src) ? src : 'none';
  const apiUrl = source === 'api' ? String(api || '').trim() : '';
  return { dropdownSource: source, dropdownApi: apiUrl, dropdown_source: source, dropdown_api: apiUrl };
}

exports.create = async (payload) => {
  const dd = normalizeDropdown(payload);
  const doc = await ScreenField.create({
    screenId: payload.screenId,
    fieldKey: String(payload.fieldKey || payload.field_key).trim(),
    label: String(payload.label).trim(),
    type: payload.type || 'text',
    options: Array.isArray(payload.options) ? payload.options : [],
    dropdownSource: dd.dropdownSource,
    dropdownApi: dd.dropdownApi,
    isTableVisible: (payload.isTableVisible !== undefined ? payload.isTableVisible : payload.is_table_visible) !== false,
    isFormVisible: (payload.isFormVisible !== undefined ? payload.isFormVisible : payload.is_form_visible) !== false,
    isRequired: !!(payload.isRequired !== undefined ? payload.isRequired : payload.is_required),
    sortable: payload.sortable !== false,
    order: typeof payload.order === 'number' ? payload.order : 0,
    isActive: payload.isActive !== false,
    defaultValue: payload.defaultValue !== undefined ? payload.defaultValue : (payload.default_value !== undefined ? payload.default_value : null),
  });
  return doc.toObject();
};

exports.update = async (id, patch) => {
  const update = {};
  const fKey = patch.fieldKey || patch.field_key;
  if (fKey !== undefined) update.fieldKey = String(fKey).trim();
  if (patch.label !== undefined) update.label = String(patch.label).trim();
  if (patch.type !== undefined) update.type = String(patch.type);
  if (patch.options !== undefined) update.options = Array.isArray(patch.options) ? patch.options : [];
  if (patch.dropdownSource !== undefined || patch.dropdown_source !== undefined || patch.dropdownApi !== undefined || patch.dropdown_api !== undefined) {
    const dd = normalizeDropdown({
      dropdownSource: patch.dropdownSource || patch.dropdown_source,
      dropdownApi: patch.dropdownApi || patch.dropdown_api,
    });
    update.dropdownSource = dd.dropdownSource;
    update.dropdownApi = dd.dropdownApi;
  }
  const isTableVis = patch.isTableVisible !== undefined ? patch.isTableVisible : patch.is_table_visible;
  if (isTableVis !== undefined) update.isTableVisible = !!isTableVis;
  const isFormVis = patch.isFormVisible !== undefined ? patch.isFormVisible : patch.is_form_visible;
  if (isFormVis !== undefined) update.isFormVisible = !!isFormVis;
  const isReq = patch.isRequired !== undefined ? patch.isRequired : patch.is_required;
  if (isReq !== undefined) update.isRequired = !!isReq;
  if (patch.sortable !== undefined) update.sortable = !!patch.sortable;
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.isActive !== undefined) update.isActive = !!patch.isActive;
  const defVal = patch.defaultValue !== undefined ? patch.defaultValue : patch.default_value;
  if (defVal !== undefined) update.defaultValue = defVal;
  return ScreenField.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
};

exports.remove = async (id) => ScreenField.findByIdAndDelete(id).lean().exec();

exports.removeByScreen = async (screenId) =>
  ScreenField.deleteMany({ screenId }).exec();

exports.upsertByKey = async (screenId, fieldKey, attrs) => {
  const key = String(fieldKey).trim();
  const dd = normalizeDropdown(attrs);
  const $set = {
    label: attrs.label,
    type: attrs.type || 'text',
    options: Array.isArray(attrs.options) ? attrs.options : [],
    dropdownSource: dd.dropdownSource,
    dropdownApi: dd.dropdownApi,
    isTableVisible: (attrs.isTableVisible !== undefined ? attrs.isTableVisible : attrs.is_table_visible) !== false,
    isFormVisible: (attrs.isFormVisible !== undefined ? attrs.isFormVisible : attrs.is_form_visible) !== false,
    isRequired: !!(attrs.isRequired !== undefined ? attrs.isRequired : attrs.is_required),
    sortable: attrs.sortable !== false,
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    isActive: attrs.isActive !== false,
    defaultValue: attrs.defaultValue !== undefined ? attrs.defaultValue : (attrs.default_value !== undefined ? attrs.default_value : null),
  };
  await ScreenField.updateOne(
    { screenId, fieldKey: key },
    { $set, $setOnInsert: { screenId, fieldKey: key } },
    { upsert: true },
  );
  return ScreenField.findOne({ screenId, fieldKey: key }).lean().exec();
};
