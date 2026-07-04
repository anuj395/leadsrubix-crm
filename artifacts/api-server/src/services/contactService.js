const contactModel = require('../models/contactModel');
const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');
const permissionModel = require('../models/screenPermissionModel');
const userModel = require('../models/userModel');
const industryModel = require('../models/industryModel');
const roleModel = require('../models/roleModel');
const { getVisibleUserIds } = require('./userHierarchyService');

/**
 * List contacts visible to the authenticated user.
 *   - SuperAdmin → sees all contacts across all industries.
 *   - Everyone else → scoped to their own industry only (multi-tenant isolation).
 */
exports.listForUser = async ({ authedUser, limit = 200 }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }
  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';
  const filter = isSuperAdmin ? {} : { industryId: user.industryId };

  // Apply the lead-visibility hierarchy:
  //   superAdmin → all
  //   admin      → all in own industry (no uid restriction; null returned)
  //   leadManager / teamLead / sales → uid IN getVisibleUserIds(...)
  // contactModel stores ownership in `createdBy` (ObjectId), so we filter
  // there. `null` from the helper means "do not add a uid filter".
  const visibleIds = await getVisibleUserIds({
    id: String(user._id),
    role,
    industryId: user.industryId,
  });
  if (visibleIds !== null) {
    filter.createdBy = { $in: visibleIds };
  }
  return contactModel.list({ filter, limit });
};

/**
 * Create a contact, validating the payload against the dynamic form config
 * the caller is allowed to see. Required fields must be present; unknown
 * fields are rejected so a malicious client can't smuggle data the SuperAdmin
 * never enabled.
 */
exports.createForUser = async ({ payload, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }

  const screen = await screenModel.findByKey('contacts');
  if (!screen || !screen.isActive) {
    const err = new Error('Contacts screen is not configured'); err.status = 404; throw err;
  }

  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';

  const industry = await industryModel.findByCode(user.industryId);
  if (!industry) {
    const err = new Error(`Industry "${user.industryId}" not found`); err.status = 400; throw err;
  }

  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
  let allowedFormFields;
  if (isSuperAdmin) {
    // SuperAdmin can use every form-visible field on the screen.
    allowedFormFields = fields.filter((f) => f.is_form_visible);
  } else {
    const role = await roleModel.findByIndustryAndKey(industry._id, user.role || authedUser.role);
    if (!role) {
      const err = new Error(`Role "${user.role}" not found for this industry`); err.status = 400; throw err;
    }
    const perms = await permissionModel.list({
      screen_id: screen._id,
      roleId: role._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedIds = new Set(perms.map((p) => String(p.field_id)));
    allowedFormFields = fields.filter(
      (f) => f.is_form_visible && allowedIds.has(String(f._id)),
    );
  }
  const allowedKeys = new Set(allowedFormFields.map((f) => f.field_key));

  const data = payload && typeof payload === 'object' ? payload : {};
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowedKeys.has(k)) cleaned[k] = v;
  }

  // Required-field validation
  const missing = allowedFormFields
    .filter((f) => f.is_required)
    .map((f) => f.field_key)
    .filter((k) => cleaned[k] === undefined || cleaned[k] === null || cleaned[k] === '');
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  return contactModel.create({
    ...cleaned,
    industryId: user.industryId,
    roleId: user.role,
    createdBy: user._id,
  });
};

exports.updateForUser = async ({ id, payload, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }

  const existing = await contactModel.findById(id);
  if (!existing) {
    const err = new Error('Contact not found'); err.status = 404; throw err;
  }

  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  if (!isSuperAdmin && existing.industryId !== user.industryId) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  const screen = await screenModel.findByKey('contacts');
  if (!screen || !screen.isActive) {
    const err = new Error('Contacts screen is not configured'); err.status = 404; throw err;
  }

  const industry = await industryModel.findByCode(user.industryId);
  if (!industry && !isSuperAdmin) {
    const err = new Error(`Industry "${user.industryId}" not found`); err.status = 400; throw err;
  }

  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
  let allowedFormFields;
  if (isSuperAdmin) {
    allowedFormFields = fields.filter((f) => f.is_form_visible);
  } else {
    const roleDoc = await roleModel.findByIndustryAndKey(industry._id, role);
    if (!roleDoc) {
      const err = new Error(`Role "${role}" not found for this industry`); err.status = 400; throw err;
    }
    const perms = await permissionModel.list({
      screen_id: screen._id,
      roleId: roleDoc._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedIds = new Set(perms.map((p) => String(p.field_id)));
    allowedFormFields = fields.filter(
      (f) => f.is_form_visible && allowedIds.has(String(f._id)),
    );
  }
  const allowedKeys = new Set(allowedFormFields.map((f) => f.field_key));

  const data = payload && typeof payload === 'object' ? payload : {};
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowedKeys.has(k)) cleaned[k] = v;
  }

  // Required-field validation on update if the field is present
  const presentKeys = new Set(Object.keys(cleaned));
  const missing = allowedFormFields
    .filter((f) => f.is_required)
    .map((f) => f.field_key)
    .filter((k) => presentKeys.has(k) && (cleaned[k] === undefined || cleaned[k] === null || cleaned[k] === ''));
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const updated = await contactModel.findByIdAndUpdate(id, { $set: cleaned }, { new: true });
  return updated;
};

exports.deleteForUser = async ({ id, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }

  const existing = await contactModel.findById(id);
  if (!existing) {
    const err = new Error('Contact not found'); err.status = 404; throw err;
  }

  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  if (!isSuperAdmin && existing.industryId !== user.industryId) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  await contactModel.findByIdAndDelete(id);
};
