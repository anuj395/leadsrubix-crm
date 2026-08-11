const roleModel = require('../models/roleModel');
const industryModel = require('../models/industryModel');
const permissionModel = require('../models/sidebarPermissionModel');
const screenPermissionModel = require('../models/screenPermissionModel');
const roleActionPermissionModel = require('../models/roleActionPermissionModel');

exports.list = (opts) => roleModel.list(opts);

exports.get = async (id) => {
  const doc = await roleModel.findById(id);
  if (!doc) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

exports.create = async (payload, authedUser) => {
  if (!payload?.industryId || !payload?.key || !payload?.name) {
    const err = new Error('industryId, key and name are required');
    err.status = 400;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  let orgId = payload.organizationId || payload.organization_id;
  let wsId = payload.workspaceId || payload.workspace_id;

  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    if (!userOrgId) {
      const err = new Error('Forbidden: You must belong to an organization to create custom roles');
      err.status = 403;
      throw err;
    }
    orgId = userOrgId;
    wsId = authedUser?.workspaceId || authedUser?.workspace_id;
  }

  const industry = await industryModel.findById(payload.industryId);
  if (!industry) {
    const err = new Error('Industry not found');
    err.status = 404;
    throw err;
  }
  const dup = await roleModel.findByIndustryAndKey(payload.industryId, payload.key, orgId || undefined);
  if (dup && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
    const err = new Error('Role with this key already exists for this industry');
    err.status = 409;
    throw err;
  }
  return roleModel.create({
    ...payload,
    organization_id: orgId || null,
    workspace_id: wsId || null
  });
};

exports.update = async (id, patch, authedUser) => {
  const existing = await roleModel.findById(id);
  if (!existing) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  if (existing.key === 'superAdmin') {
    const err = new Error('Forbidden: The Super Admin role cannot be edited or deactivated.');
    err.status = 403;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const roleOrgId = existing.organization_id || existing.organizationId;
    if (!userOrgId || String(roleOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only update roles belonging to your organization');
      err.status = 403;
      throw err;
    }
    if (patch.organizationId) delete patch.organizationId;
    if (patch.organization_id) delete patch.organization_id;
  }

  if (patch?.industryId && patch?.key) {
    const orgId = existing.organization_id || existing.organizationId || null;
    const dup = await roleModel.findByIndustryAndKey(patch.industryId, patch.key, orgId || undefined);
    if (dup && String(dup._id) !== String(id) && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
      const err = new Error('Role with this key already exists for this industry');
      err.status = 409;
      throw err;
    }
  }
  const doc = await roleModel.update(id, patch || {});
  if (!doc) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

// Cascade: removing a role wipes its permission rows so we don't leave orphans.
exports.remove = async (id, authedUser) => {
  const doc = await roleModel.findById(id);
  if (!doc) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  if (doc.key === 'superAdmin') {
    const err = new Error('Forbidden: The Super Admin role cannot be deleted.');
    err.status = 403;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const roleOrgId = doc.organization_id || doc.organizationId;
    if (!userOrgId || String(roleOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only delete roles belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  if (typeof permissionModel.removeByRole === 'function') {
    await permissionModel.removeByRole(id);
  } else if (typeof permissionModel.deleteMany === 'function') {
    await permissionModel.deleteMany({ role_id: id });
  }

  // Cascade: also wipe screen-permission rows for this role so the normalized
  // screen-config tables don't keep orphans either.
  if (typeof screenPermissionModel.removeByRole === 'function') {
    await screenPermissionModel.removeByRole(id);
  } else if (typeof screenPermissionModel.deleteMany === 'function') {
    await screenPermissionModel.deleteMany({ role_id: id });
  }

  // Cascade: also wipe role-action permission rows for this role.
  if (typeof roleActionPermissionModel.removeByRole === 'function') {
    await roleActionPermissionModel.removeByRole(id);
  }

  await roleModel.remove(id);
  return doc;
};
