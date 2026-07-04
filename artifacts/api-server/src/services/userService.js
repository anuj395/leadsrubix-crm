// src/services/userService.js
// Business logic for users. Validates dynamic fields against the `users`
// screen configuration so a SuperAdmin can drive Add/Edit User entirely
// through Roles & Permissions without code changes.

const userModel = require('../models/userModel');
const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');
const permissionModel = require('../models/screenPermissionModel');
const industryModel = require('../models/industryModel');
const roleModel = require('../models/roleModel');
const roles = require('../config/roles');
const mongoose = require('mongoose');
const { sendCredentialsEmail } = require('../utils/mailer');

const USERS_SCREEN_KEY = 'users';

/**
 * Resolve which dynamic fields a (role × industry) is allowed to set on a
 * User document. SuperAdmin sees every is_form_visible field.
 */
async function resolveAllowedFields({ industry_code, role_key, isSuperAdmin }) {
  const screen = await screenModel.findByKey(USERS_SCREEN_KEY);
  if (!screen || !screen.isActive) return { fields: [], screen: null };
  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });

  if (isSuperAdmin) {
    return { screen, fields: fields.filter((f) => f.is_form_visible) };
  }

  const industry = await industryModel.findByCode(industry_code);
  if (!industry) {
    const err = new Error(`Industry "${industry_code}" not found`); err.status = 400; throw err;
  }
  const role = await roleModel.findByIndustryAndKey(industry._id, role_key);
  if (!role) return { screen, fields: [] };

  const perms = await permissionModel.list({
    screen_id: screen._id,
    roleId: role._id,
    industryId: industry._id,
    enabledOnly: true,
  });
  const allowedIds = new Set(perms.map((p) => String(p.field_id)));
  return {
    screen,
    fields: fields.filter((f) => f.is_form_visible && allowedIds.has(String(f._id))),
  };
}

function pickAllowedFields(payloadFields, allowedFieldDefs) {
  const allowedKeys = new Set(allowedFieldDefs.map((f) => f.field_key));
  const cleaned = {};
  for (const [k, v] of Object.entries(payloadFields || {})) {
    if (allowedKeys.has(k)) cleaned[k] = v;
  }
  const missing = allowedFieldDefs
    .filter((f) => f.is_required)
    .map((f) => f.field_key)
    .filter((k) => cleaned[k] === undefined || cleaned[k] === null || cleaned[k] === '');
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return cleaned;
}

/**
 * Authorisation policy for assigning roles. A non-superAdmin caller must not
 * be able to mint a user whose role is at-or-above their own (privilege
 * escalation). superAdmin role can only be granted by another superAdmin.
 */
function ensureCanAssignRole({ authedUser, targetRole }) {
  if (targetRole === 'superAdmin') {
    const e = new Error('Only one Super Admin account is allowed in the system.');
    e.status = 403;
    throw e;
  }
  // Block assigning a role strictly greater than the caller's.
  if (!isSuperAdmin && roles.hasAtLeast(targetRole, authedUser?.role)
      && targetRole !== authedUser?.role) {
    const e = new Error('Cannot assign a role higher than your own'); e.status = 403; throw e;
  }
}

/**
 * List users visible to the caller.
 *   - SuperAdmin → all users (optionally filtered by ?industryId=...)
 *   - admin/etc. → scoped to their own industry
 */
exports.fetchAll = async ({ authedUser, industryId } = {}) => {
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  const industryFilter = isSuperAdmin ? industryId : authedUser?.industryId;
  if (!isSuperAdmin && !industryFilter) {
    // Defense-in-depth: don't fall back to "no filter" for tenant callers.
    return [];
  }
  return userModel.list({ industryId: industryFilter });
};

/**
 * Paged + searchable + sortable list. Same auth/scope rules as `fetchAll`.
 * Returns `{ items, total }` so the DataGrid can drive server-side paging.
 */
exports.fetchPaged = async ({
  authedUser,
  industryId,
  q,
  page,
  pageSize,
  sortField,
  sortDir,
} = {}) => {
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  const industryFilter = isSuperAdmin ? industryId : authedUser?.industryId;
  if (!isSuperAdmin && !industryFilter) return { items: [], total: 0 };

  // Whitelist sortable columns; reject anything else to avoid arbitrary
  // mongo paths leaking through user input.
  const ALLOWED_SORT = new Set(['name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt']);
  let sort;
  if (sortField && ALLOWED_SORT.has(String(sortField))) {
    sort = { [String(sortField)]: sortDir === 'asc' ? 1 : -1 };
  }
  return userModel.listPaged({ industryId: industryFilter, q, page, pageSize, sort });
};

/**
 * Read a single user with object-level authorization.
 *   - SuperAdmin → any user
 *   - admin     → users in same industry
 *   - others    → only themselves
 */
exports.fetchById = async ({ id, authedUser }) => {
  const target = await userModel.findById(id);
  if (!target) return null;
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (isSuperAdmin) return target;

  const sameIndustry = String(target.industryId) === String(authedUser?.industryId);
  const isSelf = String(target._id) === String(authedUser?.id);
  if (!sameIndustry && !isSelf) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  // Inside the tenant, only admins (and self) may read another user record.
  const isAdmin = roles.hasAtLeast(authedUser?.role, 'admin');
  if (!isAdmin && !isSelf) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  return target;
};

/**
 * Create a user. Body shape:
 *   { name, email, password, role, industryId, fields, isActive }
 */
exports.create = async ({ payload, authedUser }) => {
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  const email = String(payload.email || '').trim().toLowerCase();
  let password = String(payload.password || '').trim();
  if (!password) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  const role = String(payload.role || 'sales');
  const name = payload.name ? String(payload.name).trim() : '';
  const industryId = isSuperAdmin
    ? String(payload.industryId || authedUser?.industryId || '').trim()
    : authedUser?.industryId;

  if (!email) { const e = new Error('email is required'); e.status = 400; throw e; }
  if (!industryId) { const e = new Error('industryId is required'); e.status = 400; throw e; }

  ensureCanAssignRole({ authedUser, targetRole: role });

  const existing = await userModel.findByEmail(email);
  if (existing) { const e = new Error('Email already in use'); e.status = 409; throw e; }

  const { fields: allowed } = await resolveAllowedFields({
    industry_code: industryId,
    role_key: role,
    isSuperAdmin: false, // honour the *new user's* role permissions
  });
  const cleanedFields = pickAllowedFields(payload.fields, allowed);

  const createdUser = await userModel.create({
    name,
    email,
    password,
    role,
    industryId,
    isActive: payload.isActive !== false,
    fields: cleanedFields,
    needs_password_change: true,
  });

  // Fetch organization to get organization name
  void (async () => {
    try {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ industryId: industryId }).exec();
      const orgName = org ? (org.name || org.organizationName) : 'Leads Rubix Workspace';
      await sendCredentialsEmail({
        orgName,
        userName: name,
        emailAddress: email,
        tempPassword: password
      });
    } catch (err) {
      console.error('[userService] Failed to send credentials email on create:', err);
    }
  })();

  return createdUser;
};

exports.update = async ({ id, payload, authedUser }) => {
  const target = await userModel.findById(id);
  if (!target) { const e = new Error('User not found'); e.status = 404; throw e; }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin && String(target.industryId) !== String(authedUser?.industryId)) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }

  const nextRole = payload.role || target.role;
  const nextIndustry = isSuperAdmin && payload.industryId ? payload.industryId : target.industryId;

  // Block privilege escalation. Also prevent a non-superAdmin from editing an
  // existing superAdmin record (target promotion vector).
  if (!isSuperAdmin && target.role === 'superAdmin') {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  if (payload.role !== undefined) {
    ensureCanAssignRole({ authedUser, targetRole: nextRole });
  }

  const patch = {};
  if (payload.name !== undefined) patch.name = String(payload.name).trim();
  if (payload.role !== undefined) patch.role = String(payload.role);
  if (payload.isActive !== undefined) patch.isActive = !!payload.isActive;
  if (isSuperAdmin && payload.industryId !== undefined) patch.industryId = String(payload.industryId);
  if (payload.password) patch.password = String(payload.password);

  // Always re-validate required dynamic fields against the *next* role's
  // configuration. Merge any newly-supplied fields onto the existing record so
  // a role change without an explicit `fields` payload still gets caught.
  const roleOrIndustryChanging =
    payload.role !== undefined || (isSuperAdmin && payload.industryId !== undefined);
  if (payload.fields !== undefined || roleOrIndustryChanging) {
    const merged = { ...(target.fields || {}), ...(payload.fields || {}) };
    const { fields: allowed } = await resolveAllowedFields({
      industry_code: nextIndustry,
      role_key: nextRole,
      isSuperAdmin: false,
    });
    patch.fields = pickAllowedFields(merged, allowed);
  }

  return userModel.update(id, patch);
};

exports.remove = async ({ id, authedUser }) => {
  const target = await userModel.findById(id);
  if (!target) { const e = new Error('User not found'); e.status = 404; throw e; }
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin && String(target.industryId) !== String(authedUser?.industryId)) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  if (!isSuperAdmin && target.role === 'superAdmin') {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  if (String(target._id) === String(authedUser?.id)) {
    const e = new Error('You cannot delete your own account'); e.status = 400; throw e;
  }
  await userModel.remove(id);
};

exports.changePasswordByEmail = async ({ email, password, authedUser }) => {
  if (authedUser?.role !== 'superAdmin') {
    const err = new Error('Forbidden: Only Super Admin can change organization user passwords.');
    err.status = 403;
    throw err;
  }
  const User = mongoose.model('User');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) {
    const err = new Error(`User with email "${email}" not found.`);
    err.status = 404;
    throw err;
  }
  user.password = password;
  await user.save();
  return { success: true, message: 'Password updated successfully' };
};
