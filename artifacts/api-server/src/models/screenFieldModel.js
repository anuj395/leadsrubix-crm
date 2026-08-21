const mongoose = require('mongoose');

const FIELD_TYPES = ['text', 'number', 'select', 'date', 'email', 'textarea', 'checkbox', 'badge', 'avatar', 'phone', 'image'];
const DROPDOWN_SOURCES = ['none', 'static', 'api'];

const screenFieldSchema = new mongoose.Schema(
  {
    screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true, alias: 'screenId' },
    industry_id: { type: String, default: null, alias: 'industryId' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    field_key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: FIELD_TYPES, default: 'text' },
    options: { type: [String], default: [] }, // for static select fields
    dropdown_source: { type: String, enum: DROPDOWN_SOURCES, default: 'none', alias: 'dropdownSource' },
    dropdown_api: { type: String, default: '', trim: true, alias: 'dropdownApi' },
    is_table_visible: { type: Boolean, default: true, alias: 'isTableVisible' },
    is_form_visible: { type: Boolean, default: true, alias: 'isFormVisible' },
    is_required: { type: Boolean, default: false, alias: 'isRequired' },
    sortable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
    default_value: { type: mongoose.Schema.Types.Mixed, default: null, alias: 'defaultValue' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

screenFieldSchema.virtual('fieldKey')
  .get(function() {
    if (!this.field_key) return '';
    return this.field_key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  })
  .set(function(val) {
    if (!val) return;
    this.field_key = val.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  });

screenFieldSchema.index(
  { screen_id: 1, field_key: 1 },
  { unique: true, name: 'idx_screen_field_unique' },
);
screenFieldSchema.index({ screen_id: 1, order: 1 }, { name: 'idx_screen_field_order' });

const ScreenField = mongoose.model('ScreenField', screenFieldSchema, 'screen_fields');

exports.ScreenField = ScreenField;
exports.FIELD_TYPES = FIELD_TYPES;
exports.DROPDOWN_SOURCES = DROPDOWN_SOURCES;

exports.list = async ({ screenId, activeOnly = false, organizationId, organization_id, workspaceId, workspace_id } = {}) => {
  const q = {};
  if (screenId) q.screen_id = screenId;
  if (activeOnly) q.is_active = true;

  const orgId = organizationId !== undefined ? organizationId : organization_id;
  const wsId = workspaceId !== undefined ? workspaceId : workspace_id;

  if (orgId !== undefined && orgId !== null && orgId !== 'all' && orgId !== '') {
    if (wsId !== undefined && wsId !== null && wsId !== 'all' && wsId !== '') {
      q.$or = [
        { organization_id: orgId, workspace_id: wsId },
        { organization_id: orgId },
        { organization_id: null }
      ];
    } else {
      q.$or = [
        { organization_id: orgId },
        { organization_id: null }
      ];
    }
  } else {
    q.$or = [{ organization_id: null }];
  }

  const rawList = await ScreenField.find(q).sort({ order: 1, label: 1 }).exec();

  function shapePublic(doc) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : { ...doc };
    return {
      ...o,
      _id: String(o._id),
      id: String(o._id),
      fieldKey: o.fieldKey || o.field_key,
      field_key: o.fieldKey || o.field_key,
      label: o.label,
      type: o.type,
      options: o.options || [],
      dropdownSource: o.dropdownSource || o.dropdown_source || 'none',
      dropdown_source: o.dropdownSource || o.dropdown_source || 'none',
      dropdownApi: o.dropdownApi || o.dropdown_api || '',
      dropdown_api: o.dropdownApi || o.dropdown_api || '',
      isTableVisible: o.isTableVisible !== false && o.is_table_visible !== false,
      is_table_visible: o.isTableVisible !== false && o.is_table_visible !== false,
      isFormVisible: o.isFormVisible !== false && o.is_form_visible !== false,
      is_form_visible: o.isFormVisible !== false && o.is_form_visible !== false,
      isRequired: !!(o.isRequired || o.is_required),
      is_required: !!(o.isRequired || o.is_required),
      sortable: o.sortable !== false,
      order: typeof o.order === 'number' ? o.order : 0,
      isActive: o.isActive !== false && o.is_active !== false,
      is_active: o.isActive !== false && o.is_active !== false,
      defaultValue: o.defaultValue !== undefined ? o.defaultValue : (o.default_value !== undefined ? o.default_value : null),
      default_value: o.defaultValue !== undefined ? o.defaultValue : (o.default_value !== undefined ? o.default_value : null),
      organizationId: o.organizationId || o.organization_id || null,
      organization_id: o.organizationId || o.organization_id || null,
      workspaceId: o.workspaceId || o.workspace_id || null,
      workspace_id: o.workspaceId || o.workspace_id || null,
    };
  }

  const fieldMap = new Map();
  for (const f of rawList) {
    const key = f.field_key;
    const shaped = shapePublic(f);
    const existing = fieldMap.get(key);
    if (!existing) {
      fieldMap.set(key, shaped);
    } else {
      const existingOrg = existing.organization_id;
      const existingWs = existing.workspace_id;
      const currentOrg = f.organization_id || f.organizationId;
      const currentWs = f.workspace_id || f.workspaceId;

      const isCurrentWsMatch = wsId && currentWs === wsId;
      const isCurrentOrgMatch = orgId && currentOrg === orgId;

      const isExistingWsMatch = wsId && existingWs === wsId;
      const isExistingOrgMatch = orgId && existingOrg === orgId;

      if (isCurrentWsMatch && !isExistingWsMatch) {
        fieldMap.set(key, shaped);
      } else if (isCurrentOrgMatch && !isCurrentWsMatch && !isExistingWsMatch && !isExistingOrgMatch) {
        fieldMap.set(key, shaped);
      }
    }
  }

  return Array.from(fieldMap.values());
};

exports.findById = async (id) => ScreenField.findById(id).exec();

exports.findByScreenAndKey = async (screenId, fieldKey) =>
  ScreenField.findOne({ screen_id: screenId, field_key: String(fieldKey).trim() }).exec();

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
    screen_id: payload.screenId,
    field_key: String(payload.fieldKey || payload.field_key).trim(),
    label: String(payload.label).trim(),
    type: payload.type || 'text',
    options: Array.isArray(payload.options) ? payload.options : [],
    dropdown_source: dd.dropdownSource,
    dropdown_api: dd.dropdownApi,
    is_table_visible: (payload.isTableVisible !== undefined ? payload.isTableVisible : payload.is_table_visible) !== false,
    is_form_visible: (payload.isFormVisible !== undefined ? payload.isFormVisible : payload.is_form_visible) !== false,
    is_required: !!(payload.isRequired !== undefined ? payload.isRequired : payload.is_required),
    sortable: payload.sortable !== false,
    order: typeof payload.order === 'number' ? payload.order : 0,
    is_active: payload.isActive !== false,
    default_value: payload.defaultValue !== undefined ? payload.defaultValue : (payload.default_value !== undefined ? payload.default_value : null),
    organization_id: payload.organizationId || payload.organization_id || null,
    workspace_id: payload.workspaceId || payload.workspace_id || null,
    industry_id: payload.industryId || payload.industry_id || null,
  });
  return doc;
};

exports.update = async (id, patch) => {
  const update = {};
  const fKey = patch.fieldKey || patch.field_key;
  if (fKey !== undefined) update.field_key = String(fKey).trim();
  if (patch.label !== undefined) update.label = String(patch.label).trim();
  if (patch.type !== undefined) update.type = String(patch.type);
  if (patch.options !== undefined) update.options = Array.isArray(patch.options) ? patch.options : [];
  if (patch.dropdownSource !== undefined || patch.dropdown_source !== undefined || patch.dropdownApi !== undefined || patch.dropdown_api !== undefined) {
    const dd = normalizeDropdown({
      dropdownSource: patch.dropdownSource || patch.dropdown_source,
      dropdownApi: patch.dropdownApi || patch.dropdown_api,
    });
    update.dropdown_source = dd.dropdownSource;
    update.dropdown_api = dd.dropdownApi;
  }
  const isTableVis = patch.isTableVisible !== undefined ? patch.isTableVisible : patch.is_table_visible;
  if (isTableVis !== undefined) update.is_table_visible = !!isTableVis;
  const isFormVis = patch.isFormVisible !== undefined ? patch.isFormVisible : patch.is_form_visible;
  if (isFormVis !== undefined) update.is_form_visible = !!isFormVis;
  const isReq = patch.isRequired !== undefined ? patch.isRequired : patch.is_required;
  if (isReq !== undefined) update.is_required = !!isReq;
  if (patch.sortable !== undefined) update.sortable = !!patch.sortable;
  if (patch.order !== undefined) update.order = Number(patch.order);
  if (patch.isActive !== undefined) update.is_active = !!patch.isActive;
  const defVal = patch.defaultValue !== undefined ? patch.defaultValue : patch.default_value;
  if (defVal !== undefined) update.default_value = defVal;
  return ScreenField.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
};

exports.remove = async (id) => ScreenField.findByIdAndDelete(id).exec();

exports.removeByScreen = async (screenId) =>
  ScreenField.deleteMany({ screen_id: screenId }).exec();

exports.upsertByKey = async (screenId, fieldKey, attrs) => {
  const key = String(fieldKey).trim();
  const dd = normalizeDropdown(attrs);
  const $set = {
    label: attrs.label,
    type: attrs.type || 'text',
    options: Array.isArray(attrs.options) ? attrs.options : [],
    dropdown_source: dd.dropdownSource,
    dropdown_api: dd.dropdownApi,
    is_table_visible: (attrs.isTableVisible !== undefined ? attrs.isTableVisible : attrs.is_table_visible) !== false,
    is_form_visible: (attrs.isFormVisible !== undefined ? attrs.isFormVisible : attrs.is_form_visible) !== false,
    is_required: !!(attrs.isRequired !== undefined ? attrs.isRequired : attrs.is_required),
    sortable: attrs.sortable !== false,
    order: typeof attrs.order === 'number' ? attrs.order : 0,
    is_active: attrs.isActive !== false,
    default_value: attrs.defaultValue !== undefined ? attrs.defaultValue : (attrs.default_value !== undefined ? attrs.default_value : null),
  };
  await ScreenField.updateOne(
    { screen_id: screenId, field_key: key },
    { $set, $setOnInsert: { screen_id: screenId, field_key: key } },
    { upsert: true },
  );
  return ScreenField.findOne({ screen_id: screenId, field_key: key }).exec();
};
