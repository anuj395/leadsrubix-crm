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
const organizationModel = require('../models/organizationModel');
const roles = require('../config/roles');
const mongoose = require('mongoose');
const { sendCredentialsEmail } = require('../utils/mailer');

const USERS_SCREEN_KEY = 'users';

function enrichUserFields(userDoc) {
  if (!userDoc) return null;
  const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  
  // Standard schema keys to exclude from the dynamic fields object
  const standardKeys = new Set([
    '_id', 'id', 'firstName', 'lastName', 'email', 'password', 'role', 'organizationId', 'industryId',
    'contactNumber', 'userImage', 'designation', 'team', 'branch', 'branchPermission', 'status', 'isActive',
    'reportingTo', 'reporting_to', 'fields', 'needsPasswordChange', 'needs_password_change', 'deviceId', 'uid',
    'latestUpdateProfile', 'activatedAt', 'deactivatedAt', 'createdBy', 'createdAt', 'updatedAt', '__v'
  ]);

  const dynamicFields = {};
  
  if (u.designation !== undefined) dynamicFields.designation = u.designation;
  if (u.team !== undefined) dynamicFields.team = u.team;
  if (u.branch !== undefined) dynamicFields.branch = u.branch;
  if (u.contactNumber !== undefined) {
    dynamicFields.phone = u.contactNumber;
    dynamicFields.contactNumber = u.contactNumber;
  }

  // Include any other non-standard fields stored at root level
  for (const [k, v] of Object.entries(u)) {
    if (!standardKeys.has(k)) {
      dynamicFields[k] = v;
    }
  }

  u.fields = dynamicFields;
  return u;
}

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
  const isSuperAdmin = authedUser?.role === 'superAdmin';
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
  const items = await userModel.list({
    industryId: industryFilter,
    excludeRole: ['admin', 'superAdmin'],
  });

  const orgIds = [...new Set(items.map(u => u.organizationId).filter(Boolean))];
  const Organization = mongoose.model('Organization');
  const orgs = await Organization.find({ organizationId: { $in: orgIds } }).lean().exec();
  const orgMap = {};
  orgs.forEach(o => {
    orgMap[o.organizationId] = o.organizationName || o.name || '';
  });

  return items.map(u => ({
    ...enrichUserFields(u),
    organizationName: u.organizationName || orgMap[u.organizationId] || (u.role === 'superAdmin' ? 'Global/Super Admin' : '')
  }));
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
  const { items, total } = await userModel.listPaged({
    industryId: industryFilter,
    excludeRole: ['admin', 'superAdmin'],
    q,
    page,
    pageSize,
    sort,
  });

  const orgIds = [...new Set(items.map(u => u.organizationId).filter(Boolean))];
  const Organization = mongoose.model('Organization');
  const orgs = await Organization.find({ organizationId: { $in: orgIds } }).lean().exec();
  const orgMap = {};
  orgs.forEach(o => {
    orgMap[o.organizationId] = o.organizationName || o.name || '';
  });

  const enrichedItems = items.map(u => ({
    ...enrichUserFields(u),
    organizationName: u.organizationName || orgMap[u.organizationId] || (u.role === 'superAdmin' ? 'Global/Super Admin' : '')
  }));

  return { items: enrichedItems, total };
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

  const sameIndustry = String(target.industryId) === String(authedUser?.industryId);
  const isSelf = String(target._id) === String(authedUser?.id);

  if (!isSuperAdmin) {
    if (!sameIndustry && !isSelf) {
      const e = new Error('Forbidden'); e.status = 403; throw e;
    }
    // Inside the tenant, only admins (and self) may read another user record.
    const isAdmin = roles.hasAtLeast(authedUser?.role, 'admin');
    if (!isAdmin && !isSelf) {
      const e = new Error('Forbidden'); e.status = 403; throw e;
    }
  }

  return enrichUserFields(target);
};

/**
 * Create a user. Body shape:
 *   { name, email, password, role, industryId, fields, isActive }
 */
exports.create = async ({ payload, authedUser }) => {
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (isSuperAdmin) {
    const e = new Error('Forbidden: Super Admin cannot create users. Only Organization Admin can add users.');
    e.status = 403;
    throw e;
  }
  const email = String(payload.email || '').trim().toLowerCase();
  let password = String(payload.password || '').trim();
  if (!password) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  const role = String(payload.role || (payload.fields && payload.fields.designation) || 'sales');
  const firstName = payload.firstName ? String(payload.firstName).trim() : '';
  const lastName = payload.lastName ? String(payload.lastName).trim() : '';
  const industryId = isSuperAdmin
    ? String(payload.industryId || authedUser?.industryId || '').trim()
    : authedUser?.industryId;

  if (!email) { const e = new Error('email is required'); e.status = 400; throw e; }
  if (!industryId) { const e = new Error('industryId is required'); e.status = 400; throw e; }

  const targetOrgId = authedUser?.organizationId || '';
  if (payload.isActive !== false && targetOrgId) {
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({
      $or: [
        { industryId: industryId },
        { organizationId: targetOrgId }
      ]
    }).lean().exec();
    const limitVal = org ? (org.no_of_employees || org.numEmployees || org.num_employees || (org.fields && (org.fields.no_of_employees || org.fields.numEmployees || org.fields.num_employees))) : null;
    const limit = limitVal ? Number(limitVal) : null;
    if (limit !== null && limit !== undefined && !isNaN(limit)) {
      const activeCount = await userModel.User.countDocuments({
        organizationId: targetOrgId,
        isActive: true
      });
      if (activeCount >= limit) {
        const err = new Error(`Organization active employee limit (${limit}) has been reached.`);
        err.status = 400;
        throw err;
      }
    }
  }

  ensureCanAssignRole({ authedUser, targetRole: role });

  const existing = await userModel.findByEmail(email);
  if (existing) { const e = new Error('Email already in use'); e.status = 409; throw e; }

  if (payload.reporting_to) {
    const manager = await userModel.findById(payload.reporting_to);
    if (manager) {
      const allowedManagers = {
        sales: ['teamLead', 'leadManager'],
        teamLead: ['leadManager', 'admin'],
        leadManager: ['admin'],
        admin: ['superAdmin']
      };
      const allowed = allowedManagers[role];
      if (allowed && !allowed.includes(manager.role)) {
        const err = new Error(`A user with role "${role}" cannot report to a manager with role "${manager.role}".`);
        err.status = 400;
        throw err;
      }
    }
  }

  const { fields: allowed } = await resolveAllowedFields({
    industry_code: industryId,
    role_key: role,
    isSuperAdmin: false, // honour the *new user's* role permissions
  });
  const payloadFields = { ...(payload.fields || {}) };
  if (authedUser?.role !== 'superAdmin' && authedUser?.organizationId) {
    payloadFields.organizationId = authedUser.organizationId;
  }
  const cleanedFields = pickAllowedFields(payloadFields, allowed);
  const designation = cleanedFields.designation || '';
  const team = cleanedFields.team || '';
  const branch = cleanedFields.branch || '';
  const rawContact = cleanedFields.phone || cleanedFields.contactNumber || payload.contactNumber || payload.contact_no || (payload.fields && (payload.fields.contactNumber || payload.fields.contact_no || payload.fields.phone)) || '';
  if (rawContact) {
    const cleanNum = String(rawContact).trim();
    const rawDigits = cleanNum.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 15) {
      const err = new Error('Invalid contact number format. Contact number must contain between 7 and 15 digits.');
      err.status = 400;
      throw err;
    }
    const existingPhone = await userModel.User.findOne({
      $or: [
        { contactNumber: cleanNum },
        { contact_no: cleanNum },
        { 'fields.contactNumber': cleanNum },
        { 'fields.phone': cleanNum }
      ]
    }).lean().exec();

    if (existingPhone) {
      const err = new Error('User Contact Number Already Exists!!');
      err.status = 400;
      throw err;
    }
  }

  const payloadData = {
    firstName,
    lastName,
    email,
    password,
    role,
    industryId,
    organizationId: authedUser?.organizationId || '',
    organizationName: authedUser?.organizationName || '',
    isActive: payload.isActive !== false,
    status: payload.isActive !== false ? 'ACTIVE' : 'INACTIVE',
    reporting_to: payload.reporting_to || '',
    designation,
    team,
    branch,
    contactNumber: rawContact,
    needs_password_change: true,
    ...cleanedFields,
  };
  delete payloadData.fields;

  const createdUser = await userModel.create(payloadData);

  // Fetch organization to get organization name
  void (async () => {
    try {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({ industryId: industryId }).exec();
      let orgName = org ? (org.name || org.organizationName) : '';
      if (!orgName) {
        const Industry = mongoose.model('Industry');
        const ind = await Industry.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(industryId) ? industryId : null }, { code: industryId }] }).lean().exec();
        orgName = ind ? `${ind.name} Workspace` : 'CRM Workspace';
      }
      await sendCredentialsEmail({
        orgName,
        userName: `${firstName} ${lastName}`.trim() || email,
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

  // Active status limit check
  if (payload.isActive === true && !target.isActive) {
    const Organization = mongoose.model('Organization');
    const targetOrgId = target.organizationId || authedUser?.organizationId;
    if (targetOrgId) {
      const org = await Organization.findOne({
        $or: [
          { industryId: target.industryId || authedUser?.industryId },
          { organizationId: targetOrgId }
        ]
      }).lean().exec();
      const limitVal = org ? (org.no_of_employees || org.numEmployees || org.num_employees || (org.fields && (org.fields.no_of_employees || org.fields.numEmployees || org.fields.num_employees))) : null;
      const limit = limitVal ? Number(limitVal) : null;
      if (limit !== null && limit !== undefined && !isNaN(limit)) {
        const activeCount = await userModel.User.countDocuments({
          organizationId: targetOrgId,
          isActive: true
        });
        if (activeCount >= limit) {
          const err = new Error(`Organization active employee limit (${limit}) has been reached.`);
          err.status = 400;
          throw err;
        }
      }
    }
  }

  const nextRole = payload.role || (payload.fields && payload.fields.designation) || target.role;
  const nextIndustry = isSuperAdmin && payload.industryId ? payload.industryId : target.industryId;

  // Block privilege escalation. Also prevent a non-superAdmin from editing an
  // existing superAdmin record (target promotion vector).
  if (!isSuperAdmin && target.role === 'superAdmin') {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  if ((payload.fields && payload.fields.designation) !== undefined || payload.role !== undefined) {
    ensureCanAssignRole({ authedUser, targetRole: nextRole });
  }

  const nextReportingTo = payload.reporting_to !== undefined ? payload.reporting_to : target.reportingTo;

  if (nextReportingTo) {
    const manager = await userModel.findById(nextReportingTo);
    if (manager) {
      const allowedManagers = {
        sales: ['teamLead', 'leadManager'],
        teamLead: ['leadManager', 'admin'],
        leadManager: ['admin'],
        admin: ['superAdmin']
      };
      const allowed = allowedManagers[nextRole];
      if (allowed && !allowed.includes(manager.role)) {
        const err = new Error(`A user with role "${nextRole}" cannot report to a manager with role "${manager.role}".`);
        err.status = 400;
        throw err;
      }
    }
  }

  const patch = {};
  if (payload.firstName !== undefined) patch.firstName = String(payload.firstName).trim();
  if (payload.lastName !== undefined) patch.lastName = String(payload.lastName).trim();
  if ((payload.fields && payload.fields.designation) !== undefined || payload.role !== undefined) patch.role = nextRole;
  if (payload.isActive !== undefined) {
    patch.isActive = !!payload.isActive;
    patch.status = payload.isActive ? 'ACTIVE' : 'INACTIVE';
  }
  if (isSuperAdmin && payload.industryId !== undefined) patch.industryId = String(payload.industryId);
  if (payload.password) patch.password = String(payload.password);
  if (payload.reporting_to !== undefined) patch.reporting_to = String(payload.reporting_to).trim();

  // Always re-validate required dynamic fields against the *next* role's
  // configuration. Merge any newly-supplied fields onto the existing record so
  // a role change without an explicit `fields` payload still gets caught.
  const roleOrIndustryChanging =
    (payload.fields && payload.fields.designation) !== undefined || payload.role !== undefined || (isSuperAdmin && payload.industryId !== undefined);
  if (payload.fields !== undefined || roleOrIndustryChanging) {
    const targetObj = target.toObject ? target.toObject() : target;
    const standardKeys = new Set([
      '_id', 'id', 'firstName', 'lastName', 'email', 'password', 'role', 'organizationId', 'industryId',
      'contactNumber', 'userImage', 'designation', 'team', 'branch', 'branchPermission', 'status', 'isActive',
      'reportingTo', 'reporting_to', 'fields', 'needsPasswordChange', 'needs_password_change', 'deviceId', 'uid',
      'latestUpdateProfile', 'activatedAt', 'deactivatedAt', 'createdBy', 'createdAt', 'updatedAt', '__v'
    ]);

    const existingDynamicFields = {};
    if (target.contactNumber) {
      existingDynamicFields.phone = target.contactNumber;
      existingDynamicFields.contactNumber = target.contactNumber;
    }
    if (target.designation) existingDynamicFields.designation = target.designation;
    if (target.team) existingDynamicFields.team = target.team;
    if (target.branch) existingDynamicFields.branch = target.branch;

    for (const [k, v] of Object.entries(targetObj)) {
      if (!standardKeys.has(k)) {
        existingDynamicFields[k] = v;
      }
    }

    const merged = {
      ...existingDynamicFields,
      ...(payload.fields || {})
    };

    const { fields: allowed } = await resolveAllowedFields({
      industry_code: nextIndustry,
      role_key: nextRole,
      isSuperAdmin: false,
    });
    const cleaned = pickAllowedFields(merged, allowed);

    if (cleaned.phone !== undefined || cleaned.contactNumber !== undefined) {
      patch.contactNumber = cleaned.phone || cleaned.contactNumber;
    }
    if (cleaned.designation !== undefined) patch.designation = cleaned.designation;
    if (cleaned.team !== undefined) patch.team = cleaned.team;
    if (cleaned.branch !== undefined) patch.branch = cleaned.branch;

    delete cleaned.designation;
    delete cleaned.team;
    delete cleaned.branch;
    delete cleaned.phone;
    delete cleaned.contactNumber;

    for (const [k, v] of Object.entries(cleaned)) {
      patch[k] = v;
    }

    patch.$unset = { fields: 1 };
  }

  const targetContact = patch.contactNumber || (payload.fields && (payload.fields.contactNumber || payload.fields.phone || payload.fields.contact_no)) || payload.contactNumber || payload.contact_no;
  if (targetContact !== undefined && targetContact !== null && targetContact !== '') {
    const cleanNum = String(targetContact).trim();
    const rawDigits = cleanNum.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 15) {
      const err = new Error('Invalid contact number format. Contact number must contain between 7 and 15 digits.');
      err.status = 400;
      throw err;
    }
    const existingPhone = await userModel.User.findOne({
      _id: { $ne: id },
      $or: [
        { contactNumber: cleanNum },
        { contact_no: cleanNum },
        { 'fields.contactNumber': cleanNum },
        { 'fields.phone': cleanNum }
      ]
    }).lean().exec();

    if (existingPhone) {
      const err = new Error('User Contact Number Already Exists!!');
      err.status = 400;
      throw err;
    }
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
