const permissionModel = require('../models/screenPermissionModel');
const fieldModel = require('../models/screenFieldModel');
const screenModel = require('../models/screenModel');
const roleModel = require('../models/roleModel');
const industryModel = require('../models/industryModel');
const userModel = require('../models/userModel');

exports.list = async (opts) => {
  if (opts && opts.industryId) {
    const indDoc = await industryModel.findByCode(opts.industryId);
    if (indDoc) {
      opts.industryId = indDoc._id;
    }
  }
  const items = await permissionModel.list(opts);
  const q = { activeOnly: true };
  if (opts) {
    if (opts.screenId) q.screenId = opts.screenId;
    if (opts.organizationId) q.organizationId = opts.organizationId;
    if (opts.organization_id) q.organization_id = opts.organization_id;
  }
  const fields = await fieldModel.list(q);
  const validFieldIds = new Set(fields.map((f) => String(f._id)));
  return items.filter((item) => validFieldIds.has(String(item.fieldId)));
};

exports.bulkSet = async ({ screenId, roleId, industryId, fieldIds, organizationId, organization_id }) => {
  if (!screenId || !roleId || !industryId) {
    const err = new Error('screenId, roleId and industryId are required');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(fieldIds)) {
    const err = new Error('fieldIds must be an array');
    err.status = 400;
    throw err;
  }

  // Resolve industry by code or ID
  const industry = await industryModel.findByCode(industryId);
  if (!industry) {
    const err = new Error('Industry not found'); err.status = 404; throw err;
  }
  const resolvedIndustryId = industry._id;

  // Verify the (screen, role, industry) triple is internally consistent before
  // we write rows that would otherwise drift from real FKs.
  const orgId = organizationId !== undefined ? organizationId : (organization_id !== undefined ? organization_id : null);
  const mongoose = require('mongoose');
  const RoleModel = mongoose.model('Role');
  const [screen, role] = await Promise.all([
    screenModel.findById(screenId),
    RoleModel.findOne({
      _id: roleId,
      $or: [{ organization_id: orgId }, { organization_id: null }]
    }).exec(),
  ]);
  if (!screen) {
    const err = new Error('Screen not found'); err.status = 404; throw err;
  }
  if (screen.organization_id && orgId && String(screen.organization_id) !== String(orgId)) {
    const err = new Error('Screen not found or access forbidden');
    err.status = 403;
    throw err;
  }
  if (!role) {
    const err = new Error('Role not found'); err.status = 404; throw err;
  }
  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(resolvedIndustryId)) {
    const err = new Error('Role does not belong to the given industry');
    err.status = 400;
    throw err;
  }

  // Admin must not grant permissions that are not allowed by the Industry-level configuration.
  if (orgId) {
    const baselineRole = await RoleModel.findOne({
      industry_id: resolvedIndustryId,
      key: role.key,
      organization_id: null
    }).exec();

    if (baselineRole) {
      const ScreenModel = mongoose.model('Screen');
      const baseScreen = await ScreenModel.findOne({
        key: screen.key,
        organization_id: null
      }).exec();

      if (baseScreen) {
        const ScreenPermissionModel = mongoose.model('ScreenPermission');
        const baselinePerms = await ScreenPermissionModel.find({
          screen_id: baseScreen._id,
          role_id: baselineRole._id,
          industry_id: resolvedIndustryId,
          organization_id: null,
          is_enabled: true
        }).lean().exec();

        const ScreenFieldModel = mongoose.model('ScreenField');
        const baselineFields = await ScreenFieldModel.find({
          _id: { $in: baselinePerms.map(p => p.field_id) }
        }).lean().exec();
        const allowedFieldKeys = new Set(baselineFields.map(f => f.field_key));

        const targetFields = await ScreenFieldModel.find({
          _id: { $in: fieldIds }
        }).lean().exec();

        const invalidFields = targetFields.filter(f => !allowedFieldKeys.has(f.field_key));
        if (invalidFields.length > 0) {
          const err = new Error(`Cannot grant permissions for field(s) [${invalidFields.map(f => f.label).join(', ')}] because they are not allowed by the Industry-level configuration.`);
          err.status = 400;
          throw err;
        }
      }
    }
  }

  // Verify every requested field belongs to this screen.
  if (fieldIds.length > 0) {
    const fields = await fieldModel.list({ screenId, organizationId: orgId });
    const validIds = new Set(fields.map((f) => String(f._id)));
    const invalid = fieldIds.filter((id) => !validIds.has(String(id)));
    if (invalid.length > 0) {
      const err = new Error(
        `fieldIds contains entries that do not belong to this screen: ${invalid.join(', ')}`,
      );
      err.status = 400;
      throw err;
    }
  }

  return permissionModel.bulkSetForCombo({
    screenId,
    roleId,
    industryId: resolvedIndustryId,
    fieldIds,
    organizationId: orgId
  });
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
exports.resolve = async ({ screen_key, industry_code, role_key, screenKey, industryCode: inputIndustryCode, roleKey: inputRoleKey, authedUser, organizationId }) => {
  const finalScreenKey = screenKey || screen_key;
  if (!finalScreenKey) {
    const err = new Error('screenKey is required');
    err.status = 400;
    throw err;
  }

  const mongoose = require('mongoose');
  const orgId = organizationId || authedUser?.organizationId || authedUser?.organization_id || null;

  const ScreenModel = mongoose.model('Screen');
  let screen = null;
  if (orgId) {
    screen = await ScreenModel.findOne({
      key: finalScreenKey,
      organization_id: orgId
    }).exec();
  }
  if (!screen) {
    screen = await ScreenModel.findOne({
      key: finalScreenKey,
      organization_id: null
    }).exec();
  }

  if (!screen || !screen.is_active) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  // Resolve industry — explicit code wins; else fall back to user's industryId.
  let industryCode = inputIndustryCode || industry_code;
  let resolvedRoleKey = inputRoleKey || role_key;
  if ((!industryCode || !resolvedRoleKey) && authedUser?.id) {
    const u = await userModel.findById(authedUser.id);
    if (!industryCode) industryCode = u?.industryId;
    if (!resolvedRoleKey) resolvedRoleKey = u?.role || authedUser?.role;
  }

  const isSuperAdmin = resolvedRoleKey === 'superAdmin';
  const isGuestSignup = !authedUser && screen.key === 'organization';
  const bypassPermissions = isSuperAdmin || isGuestSignup;

  if (!industryCode && bypassPermissions) {
    industryCode = 'temp0001';
  }

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
    if (mongoose.Types.ObjectId.isValid(industryCode)) {
      const IndustryModel = mongoose.model('Industry');
      industry = await IndustryModel.findById(industryCode).exec();
    } else {
      industry = await industryModel.findByCode(industryCode);
    }
    if (!industry && !bypassPermissions) {
      const err = new Error(`Industry with code/id "${industryCode}" not found`);
      err.status = 404;
      throw err;
    }
  }

  let role = null;
  if (!bypassPermissions) {
    const RoleModel = mongoose.model('Role');
    if (orgId) {
      role = await RoleModel.findOne({
        organization_id: orgId,
        industry_id: industry._id,
        key: resolvedRoleKey
      }).exec();
    }
    if (!role) {
      role = await RoleModel.findOne({
        organization_id: null,
        industry_id: industry._id,
        key: resolvedRoleKey
      }).exec();
    }

    if (!role && resolvedRoleKey === 'superAdmin') {
      try {
        role = await RoleModel.create({
          industry_id: industry._id,
          organization_id: orgId,
          key: 'superAdmin',
          name: 'Super Administrator',
          is_active: true
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
  const ScreenFieldModel = mongoose.model('ScreenField');
  const fields = await ScreenFieldModel.find({
    screen_id: screen._id,
    $or: [{ organization_id: orgId }, { organization_id: null }],
    is_active: true
  }).lean().exec();

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
  if (bypassPermissions || finalScreenKey === 'users') {
    allowed = fields;
  } else {
    const ScreenPermissionModel = mongoose.model('ScreenPermission');
    let perms = await ScreenPermissionModel.find({
      organization_id: orgId,
      screen_id: screen._id,
      role_id: role._id,
      industry_id: industry._id,
      is_enabled: true
    }).lean().exec();

    if (!perms.length && orgId) {
      perms = await ScreenPermissionModel.find({
        organization_id: null,
        screen_id: screen._id,
        role_id: role._id,
        industry_id: industry._id,
        is_enabled: true
      }).lean().exec();
    }

    const allowedFieldIds = new Set(perms.map((p) => String(p.field_id)));
    allowed = fields.filter((f) => allowedFieldIds.has(String(f._id)));
  }

  if (!isSuperAdmin) {
    allowed = allowed.filter((f) => f.field_key !== 'organizationId' && f.field_key !== 'organization_id');
  }

  const tableHeaders = allowed
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

  const formFields = allowed
    .filter((f) => f.is_form_visible)
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      key: f.field_key,
      label: f.label,
      type: f.type,
      required: f.is_required,
      options: f.options || [],
      dropdownSource: f.dropdown_source || 'none',
      dropdownApi: f.dropdown_api || '',
      dropdown_source: f.dropdown_source || 'none',
      dropdown_api: f.dropdown_api || '',
      order: f.order,
    }));

  return {
    screen: { _id: screen._id, key: screen.key, name: screen.name },
    industryId: industry ? industry._id : null,
    roleId: role ? role._id : null,
    tableHeaders,
    table_headers: tableHeaders,
    formFields,
    form_fields: formFields,
  };
};
