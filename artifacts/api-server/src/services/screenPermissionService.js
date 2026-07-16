const permissionModel = require('../models/screenPermissionModel');
const fieldModel = require('../models/screenFieldModel');
const screenModel = require('../models/screenModel');
const roleModel = require('../models/roleModel');
const industryModel = require('../models/industryModel');
const userModel = require('../models/userModel');

exports.list = async (opts) => {
  const items = await permissionModel.list(opts);
  const q = { activeOnly: true };
  if (opts && opts.screen_id) {
    q.screen_id = opts.screen_id;
  }
  const fields = await fieldModel.list(q);
  const validFieldIds = new Set(fields.map((f) => String(f._id)));
  return items.filter((item) => validFieldIds.has(String(item.field_id)));
};

exports.bulkSet = async ({ screen_id, roleId, industryId, field_ids }) => {
  if (!screen_id || !roleId || !industryId) {
    const err = new Error('screen_id, roleId and industryId are required');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(field_ids)) {
    const err = new Error('field_ids must be an array');
    err.status = 400;
    throw err;
  }

  // Verify the (screen, role, industry) triple is internally consistent before
  // we write rows that would otherwise drift from real FKs.
  const [screen, role, industry] = await Promise.all([
    screenModel.findById(screen_id),
    roleModel.findById(roleId),
    industryModel.findById(industryId),
  ]);
  if (!screen) {
    const err = new Error('Screen not found'); err.status = 404; throw err;
  }
  if (!industry) {
    const err = new Error('Industry not found'); err.status = 404; throw err;
  }
  if (!role) {
    const err = new Error('Role not found'); err.status = 404; throw err;
  }
  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(industryId)) {
    const err = new Error('Role does not belong to the given industry');
    err.status = 400;
    throw err;
  }

  // Verify every requested field belongs to this screen.
  if (field_ids.length > 0) {
    const fields = await fieldModel.list({ screen_id });
    const validIds = new Set(fields.map((f) => String(f._id)));
    const invalid = field_ids.filter((id) => !validIds.has(String(id)));
    if (invalid.length > 0) {
      const err = new Error(
        `field_ids contains entries that do not belong to this screen: ${invalid.join(', ')}`,
      );
      err.status = 400;
      throw err;
    }
  }

  return permissionModel.bulkSetForCombo({ screen_id, roleId, industryId, field_ids });
};

/**
 * Compose the screen view for a (screen, industry, role) triple.
 * If `industry_code`/`role_key` aren't given, falls back to the authenticated
 * user. Returns:
 *   {
 *     screen: { _id, key, name },
 *     industryId, roleId,
 *     table_headers: [{ key, label, type, sortable, order, options }],
 *     form_fields:   [{ key, label, type, required, options, order }]
 *   }
 *
 * Visibility rules:
 *   - Field must have isActive=true and screen.isActive=true.
 *   - A permission row with is_enabled=true must exist for (screen, role, industry, field).
 *   - is_table_visible / is_form_visible on the field decide which buckets it goes into.
 */
exports.resolve = async ({ screen_key, industry_code, role_key, authedUser }) => {
  if (!screen_key) {
    const err = new Error('screen_key is required');
    err.status = 400;
    throw err;
  }

  const screen = await screenModel.findByKey(screen_key);
  if (!screen || !screen.isActive) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  // Resolve industry — explicit code wins; else fall back to user's industryId.
  let industryCode = industry_code;
  let resolvedRoleKey = role_key;
  if ((!industryCode || !resolvedRoleKey) && authedUser?.id) {
    const u = await userModel.findById(authedUser.id);
    if (!industryCode) industryCode = u?.industryId;
    if (!resolvedRoleKey) resolvedRoleKey = u?.role || authedUser?.role;
  }

  const isSuperAdmin = resolvedRoleKey === 'superAdmin' || authedUser?.role === 'superAdmin';
  const bypassPermissions = isSuperAdmin;

  if (!bypassPermissions && !industryCode) {
    const err = new Error('industry_code is required (none found on user)');
    err.status = 400;
    throw err;
  }
  if (!resolvedRoleKey) {
    const err = new Error('role_key is required (none found on user)');
    err.status = 400;
    throw err;
  }

  let industry = null;
  if (industryCode) {
    industry = await industryModel.findByCode(industryCode);
    if (!industry && !bypassPermissions) {
      const err = new Error(`Industry with code "${industryCode}" not found`);
      err.status = 404;
      throw err;
    }
  }

  let role = null;
  if (!bypassPermissions) {
    role = await roleModel.findByIndustryAndKey(industry._id, resolvedRoleKey);
    if (!role && resolvedRoleKey === 'superAdmin') {
      try {
        role = await roleModel.create({
          industryId: industry._id,
          key: 'superAdmin',
          name: 'Super Administrator',
          isActive: true
        });
      } catch (e) {
        // ignore
      }
    }
    if (!role) {
      const err = new Error(`Role "${resolvedRoleKey}" not found for industry "${industryCode}"`);
      err.status = 404;
      throw err;
    }
  }

  // Active fields for this screen.
  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
  if (fields.length === 0) {
    return {
      screen: { _id: screen._id, key: screen.key, name: screen.name },
      industryId: industry ? industry._id : null,
      roleId: role ? role._id : null,
      table_headers: [],
      form_fields: [],
    };
  }

  let allowed;
  if (bypassPermissions) {
    // SuperAdmin sees every active field on the screen.
    allowed = fields;
  } else {
    // Enabled permissions for this triple.
    const perms = await permissionModel.list({
      screen_id: screen._id,
      roleId: role._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedFieldIds = new Set(perms.map((p) => String(p.field_id)));
    allowed = fields.filter((f) => allowedFieldIds.has(String(f._id)));
  }

  if (!isSuperAdmin) {
    allowed = allowed.filter((f) => f.field_key !== 'organizationId');
  }

  const table_headers = allowed
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      key: f.field_key,
      label: f.label,
      type: f.type,
      sortable: f.sortable,
      order: f.order,
      options: f.options || [],
      visible: f.is_table_visible,
    }));

  const form_fields = allowed
    .filter((f) => f.is_form_visible)
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      key: f.field_key,
      label: f.label,
      type: f.type,
      required: f.is_required,
      options: f.options || [],
      dropdown_source: f.dropdown_source || 'none',
      dropdown_api: f.dropdown_api || '',
      order: f.order,
    }));

  return {
    screen: { _id: screen._id, key: screen.key, name: screen.name },
    industryId: industry ? industry._id : null,
    roleId: role ? role._id : null,
    table_headers,
    form_fields,
  };
};
