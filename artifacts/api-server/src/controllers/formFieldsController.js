// src/controllers/formFieldsController.js
// Spec-compliant `/api/formFields/:organizationId/:form_name` compat layer.
// Same approach as headersController: READ projects the existing screen-config
// into the spec's shape; WRITE methods return 501 with a pointer to the
// canonical `/api/screen-fields` endpoints (avoiding two parallel sources of
// truth). For role × industry-aware field lists, callers should keep using
// `POST /api/screens/resolve` directly, which already returns `form_fields`
// in this project's richer shape.

const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');

// Spec form_name → screen `key`. The spec calls the lead form `lead_create`
// while this project's screen for the same data is `contacts` — the mapping
// table makes the alias work regardless of which name the caller uses.
const FORM_TO_SCREEN = {
  lead_create: 'contacts',
  lead_edit: 'contacts',
  contact_create: 'contacts',
  contact_edit: 'contacts',
  user_create: 'users',
  user_edit: 'users',
  booking_create: 'bookings',
  booking_edit: 'bookings',
  organization_create: 'organization',
  organization_edit: 'organization',
};

function projectFields(fields) {
  return [...fields]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((f, idx) => ({
      key: f.field_key,
      label: f.label,
      field_type: f.type,
      placeholder: f.placeholder || '',
      required: !!f.is_required,
      visible: f.is_form_visible !== false,
      order: f.order || idx,
      options: Array.isArray(f.options) ? f.options : [],
      default_value: f.default_value || '',
      validation: f.validation || {},
      grid_cols: f.grid_cols || 6,
    }));
}

exports.get = async (req, res, next) => {
  try {
    const { organizationId, form_name } = req.params;
    // Tenant isolation: non-super-admins may only read their own org's config.
    if (req.user?.role !== 'superAdmin' && organizationId !== req.user?.industryId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const screenKey = FORM_TO_SCREEN[form_name];
    if (!screenKey) {
      return res.status(404).json({ message: `Unknown form "${form_name}"` });
    }
    const screen = await screenModel.findByKey(screenKey);
    if (!screen) {
      return res.json({ organizationId, form_name, fields: [] });
    }
    const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
    res.json({
      organizationId,
      form_name,
      fields: projectFields(fields),
    });
  } catch (err) {
    next(err);
  }
};

function notImplemented(req, res) {
  res.status(501).json({
    message:
      'Form-field writes go through the canonical screen-config API. ' +
      'Use POST/PUT/DELETE on /api/screen-fields and /api/screens. ' +
      'GET /api/formFields/:org/:form_name is the read-only compat alias for the spec.',
  });
}

exports.create = notImplemented;
exports.replace = notImplemented;
exports.patchField = notImplemented;
exports.remove = notImplemented;
