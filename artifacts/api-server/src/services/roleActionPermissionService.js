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

exports.list = async ({ roleId, industryId, screenId, organizationId, organization_id, workspaceId, workspace_id }, authedUser) => {
  const targetIndustryId = (await resolveIndustryId(industryId)) || industryId;
  const isSuperAdmin = authedUser?.role === 'superAdmin';
  
  let orgId = organizationId !== undefined ? organizationId : organization_id;
  let wsId = workspaceId !== undefined ? workspaceId : workspace_id;

  if (!isSuperAdmin && authedUser) {
    orgId = authedUser.organizationId || authedUser.organization_id || null;
    wsId = authedUser.workspaceId || authedUser.workspace_id || null;
    if (roleId) {
      const role = await roleModel.findById(roleId);
      const roleOrgId = role?.organization_id || role?.organizationId;
      if (orgId && roleOrgId && String(roleOrgId) !== String(orgId)) {
        const e = new Error('Forbidden: Access denied to role'); e.status = 403; throw e;
      }
    }
  }
  return model.list({ roleId, industryId: targetIndustryId, screenId, organizationId: orgId, workspaceId: wsId });
};

exports.upsert = async ({ roleId, industryId, screenId, organizationId, organization_id, workspaceId, workspace_id, can_view, can_add, can_edit, can_delete }, authedUser) => {
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
  let orgId = organizationId !== undefined ? organizationId : organization_id;
  let wsId = workspaceId !== undefined ? workspaceId : workspace_id;

  if (!isSuperAdmin && authedUser) {
    orgId = authedUser.organizationId || authedUser.organization_id || null;
    wsId = authedUser.workspaceId || authedUser.workspace_id || null;
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

  return model.upsert({
    roleId,
    industryId: targetIndustryId,
    screenId,
    organizationId: orgId,
    workspaceId: wsId,
    can_view,
    can_add,
    can_edit,
    can_delete,
  });
};

/**
 * Resolve whether the authenticated caller is allowed to perform `action` on
 * `screen_key`. SuperAdmin and admin always pass — they're the privileged
 * tier per product spec. Other roles need an explicit row.
 */
exports.userCan = async ({ authedUser, screen_key, action }) => {
  if (!authedUser) return false;
  if (!ACTIONS.includes(action)) return false;

  // Strict restriction: leadDistribution and leadRotation are only accessible by Admin & Super Admin
  if (screen_key === 'leadDistribution' || screen_key === 'leadRotation') {
    return authedUser.role === 'admin' || authedUser.role === 'superAdmin';
  }

  if (authedUser.role === 'superAdmin' || authedUser.role === 'admin') return true;

  const orgId = authedUser.organizationId || authedUser.organization_id || null;
  const wsId = authedUser.workspaceId || authedUser.workspace_id || (orgId ? 'ws_' + orgId : null);
  const targetIndustryId = (await resolveIndustryId(authedUser.industryId || authedUser.industry_id)) || authedUser.industryId;

  // 1. Try resolving with organization-scoped permissions
  if (orgId) {
    const orgRow = await model.findFor({
      screen_key,
      role_key: authedUser.role,
      industryId: targetIndustryId,
      organizationId: orgId,
      workspaceId: wsId,
    });
    if (orgRow) return !!orgRow[`can_${action}`];
  }

  // 2. Fallback to industry-level template permissions
  const globalRow = await model.findFor({
    screen_key,
    role_key: authedUser.role,
    industryId: targetIndustryId,
    organizationId: null,
  });
  if (globalRow) return !!globalRow[`can_${action}`];

  return false;
};

exports.getEffectiveForScreen = async ({ authedUser, screen_key }) => {
  const out = { can_view: false, can_add: false, can_edit: false, can_delete: false };
  if (screen_key === 'leadDistribution' || screen_key === 'leadRotation') {
    const isAdmin = authedUser?.role === 'admin' || authedUser?.role === 'superAdmin';
    return { can_view: isAdmin, can_add: isAdmin, can_edit: isAdmin, can_delete: isAdmin };
  }
  if (authedUser?.role === 'superAdmin' || authedUser?.role === 'admin') {
    return { can_view: true, can_add: true, can_edit: true, can_delete: true };
  }
  for (const a of ACTIONS) {
    out[`can_${a}`] = await exports.userCan({ authedUser, screen_key, action: a });
  }
  return out;
};
