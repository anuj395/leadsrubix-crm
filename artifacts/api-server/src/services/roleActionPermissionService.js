// src/services/roleActionPermissionService.js
const mongoose = require('mongoose');
const model = require('../models/roleActionPermissionModel');
const screenModel = require('../models/screenModel');
const roleModel = require('../models/roleModel');

const industryModel = require('../models/industryModel');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v ?? ''));

const ACTIONS = ['view', 'add', 'edit', 'delete'];

exports.ACTIONS = ACTIONS;

async function resolveIndustryId(industryId) {
  if (!industryId) return null;
  if (mongoose.Types.ObjectId.isValid(String(industryId))) {
    const doc = await industryModel.findById(industryId);
    if (doc) return doc._id;
  }
  const doc = await industryModel.findByCode(industryId);
  return doc ? doc._id : null;
}

exports.list = async ({ roleId, industryId, screenId }, authedUser) => {
  const targetIndustryId = (await resolveIndustryId(industryId)) || industryId;
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin && authedUser) {
    if (roleId) {
      const role = await roleModel.findById(roleId);
      const orgId = authedUser.organizationId || authedUser.organization_id;
      const roleOrgId = role?.organization_id || role?.organizationId;
      if (orgId && roleOrgId && String(roleOrgId) !== String(orgId)) {
        const e = new Error('Forbidden: Access denied to role'); e.status = 403; throw e;
      }
    }
  }
  return model.list({ roleId, industryId: targetIndustryId, screenId });
};

exports.upsert = async ({ roleId, industryId, screenId, can_view, can_add, can_edit, can_delete }, authedUser) => {
  if (!roleId || !industryId || !screenId) {
    const e = new Error('roleId, industryId and screenId are required'); e.status = 400; throw e;
  }
  const targetIndustryId = await resolveIndustryId(industryId);
  if (!targetIndustryId) {
    const e = new Error('Industry not found'); e.status = 404; throw e;
  }
  if (!isObjectId(roleId) || !isObjectId(targetIndustryId) || !isObjectId(screenId)) {
    const e = new Error('roleId, industryId and screenId must be valid ObjectIds'); e.status = 400; throw e;
  }
  // Ensure referenced docs actually exist
  const [role, screen] = await Promise.all([
    roleModel.findById(roleId),
    screenModel.findById(screenId),
  ]);
  if (!role)   { const e = new Error('Role not found');   e.status = 404; throw e; }
  if (!screen) { const e = new Error('Screen not found'); e.status = 404; throw e; }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  const orgId = authedUser?.organizationId || authedUser?.organization_id || null;
  if (!isSuperAdmin && authedUser) {
    const roleOrgId = role.organization_id || role.organizationId;
    if (!orgId || String(roleOrgId) !== String(orgId)) {
      const e = new Error('Forbidden: You can only edit permissions for roles belonging to your organization');
      e.status = 403;
      throw e;
    }
    if (screen.organization_id && String(screen.organization_id) !== String(orgId)) {
      const e = new Error('Forbidden: Access denied to screen');
      e.status = 403;
      throw e;
    }
  }

  return model.upsert({ roleId, industryId: targetIndustryId, screenId, can_view, can_add, can_edit, can_delete });
};

/**
 * Resolve whether the authenticated caller is allowed to perform `action` on
 * `screen_key`. SuperAdmin and admin always pass — they're the privileged
 * tier per product spec. Other roles need an explicit row.
 */
exports.userCan = async ({ authedUser, screen_key, action }) => {
  if (!authedUser) return false;
  if (!ACTIONS.includes(action)) return false;
  if (authedUser.role === 'superAdmin' || authedUser.role === 'admin') return true;
  if (!authedUser.industryId) return false;

  const screen = await screenModel.findByKey(screen_key);
  if (!screen || !screen.isActive) return false;
  const role = await roleModel.findByIndustryAndKey(authedUser.industryId, authedUser.role);
  if (!role) return false;

  const row = await model.findFor({
    roleId: role._id,
    industryId: authedUser.industryId,
    screenId: screen._id,
  });
  if (!row) return false;
  return !!row[`can_${action}`];
};

exports.getEffectiveForScreen = async ({ authedUser, screen_key }) => {
  const out = { can_view: false, can_add: false, can_edit: false, can_delete: false };
  if (authedUser?.role === 'superAdmin' || authedUser?.role === 'admin') {
    return { can_view: true, can_add: true, can_edit: true, can_delete: true };
  }
  for (const a of ACTIONS) {
    out[`can_${a}`] = await exports.userCan({ authedUser, screen_key, action: a });
  }
  return out;
};
