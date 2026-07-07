// src/controllers/headersController.js
// Spec-compliant `/api/headers/:organizationId/:module` compat layer.
// Internally proxies the existing screen-config system (Screens + ScreenFields
// + ScreenPermissions), which is the single source of truth for dynamic
// table/form configuration in this project. READ shape matches the spec
// exactly; WRITE methods return 501 with a hint pointing to the canonical
// `/api/screen-fields` endpoints (which already power the SuperAdmin Field
// Manager UI and prevent two parallel sources of truth from drifting).

const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');

// `module` (URL path segment) → screen `key` in the screen-config DB.
const MODULE_TO_SCREEN = {
  leads: 'contacts',
  contacts: 'contacts',
  tasks: 'tasks',
  users: 'users',
  bookings: 'bookings',
  organization: 'organization',
  organizations: 'organization',
  leadDistribution: 'leadDistribution',
  reassign: 'leadRotation',
};

function projectColumns(fields) {
  return [...fields]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((f, idx) => ({
      key: f.field_key,
      label: f.label,
      visible: f.is_table_visible !== false,
      order: f.order || idx,
      width: f.width || '150px',
      sortable: f.sortable !== false,
      filterable: !!f.filterable,
      pinned: !!f.pinned,
    }));
}

exports.get = async (req, res, next) => {
  try {
    const { organizationId, module } = req.params;
    // Tenant isolation: non-super-admins may only read their own org's config.
    // Super-admin can pass any organizationId and is treated as a system op.
    if (req.user?.role !== 'superAdmin' && organizationId !== req.user?.industryId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const screenKey = MODULE_TO_SCREEN[module];
    if (!screenKey) {
      return res.status(404).json({ message: `Unknown module "${module}"` });
    }
    const screen = await screenModel.findByKey(screenKey);
    if (!screen) {
      // Spec: "If none exists, returns default column config for that module"
      // Our defaults live in seed.js — when the screen hasn't been seeded yet
      // we return an empty columns array rather than fabricating one.
      return res.json({ organizationId, module, columns: [] });
    }
    const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
    res.json({
      organizationId,
      module,
      columns: projectColumns(fields),
    });
  } catch (err) {
    next(err);
  }
};

function notImplemented(req, res) {
  res.status(501).json({
    message:
      'Header writes go through the canonical screen-config API. ' +
      'Use POST/PUT/DELETE on /api/screen-fields and /api/screens (the SuperAdmin Field Manager UI uses these). ' +
      'GET /api/headers/:org/:module is the read-only compat alias for the spec.',
  });
}

exports.create = notImplemented;
exports.replace = notImplemented;
exports.patchColumn = notImplemented;
exports.remove = notImplemented;
