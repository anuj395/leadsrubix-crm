const menuModel = require('../models/sidebarMenuModel');
const permissionModel = require('../models/sidebarPermissionModel');

exports.list = (opts) => menuModel.list(opts);

exports.get = async (id) => {
  const doc = await menuModel.findById(id);
  if (!doc) {
    const err = new Error('Menu not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

exports.create = async (payload, authedUser) => {
  if (!payload?.key || !payload?.name) {
    const err = new Error('key and name are required');
    err.status = 400;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  let orgId = payload.organizationId || payload.organization_id;
  let wsId = payload.workspaceId || payload.workspace_id;
  let indId = payload.industryId || payload.industry_id;

  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    if (!userOrgId) {
      const err = new Error('Forbidden: You must belong to an organization to create custom menus');
      err.status = 403;
      throw err;
    }
    orgId = userOrgId;
    wsId = authedUser?.workspaceId || authedUser?.workspace_id;
    indId = authedUser?.industryId || authedUser?.industry_id;
  } else if (orgId) {
    wsId = 'ws_' + orgId;
    const mongoose = require('mongoose');
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({
      $or: [{ organization_id: orgId }, { organizationId: orgId }]
    }).lean().exec();
    if (org) {
      indId = org.industryId || org.industry_id;
    }
  }

  // Scope key uniqueness check to organization
  const dup = await menuModel.findByKey(payload.key, orgId || undefined);
  if (dup && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
    const err = new Error('Menu with this key already exists');
    err.status = 409;
    throw err;
  }

  if (payload.parent_id || payload.parentId) {
    const pId = payload.parent_id || payload.parentId;
    const parent = await menuModel.findById(pId);
    if (!parent) {
      const err = new Error('Parent menu not found');
      err.status = 404;
      throw err;
    }
  }

  return menuModel.create({
    ...payload,
    organization_id: orgId || null,
    workspace_id: wsId || null,
    industry_id: indId || null,
  });
};

exports.update = async (id, patch, authedUser) => {
  const current = await menuModel.findById(id);
  if (!current) {
    const err = new Error('Menu not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const menuOrgId = current.organization_id || current.organizationId;
    if (!userOrgId || String(menuOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only update menus belonging to your organization');
      err.status = 403;
      throw err;
    }
    if (patch.organizationId) delete patch.organizationId;
    if (patch.organization_id) delete patch.organization_id;
  }

  if (patch?.key) {
    const orgId = current.organization_id || current.organizationId || null;
    const dup = await menuModel.findByKey(patch.key, orgId || undefined);
    if (dup && String(dup._id) !== String(id) && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
      const err = new Error('Menu with this key already exists');
      err.status = 409;
      throw err;
    }
  }
  if (patch?.parent_id && String(patch.parent_id) === String(id)) {
    const err = new Error('Menu cannot be its own parent');
    err.status = 400;
    throw err;
  }
  if (patch?.parentId && String(patch.parentId) === String(id)) {
    const err = new Error('Menu cannot be its own parent');
    err.status = 400;
    throw err;
  }

  const doc = await menuModel.update(id, patch || {});
  if (!doc) {
    const err = new Error('Menu not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

// Cascade: deleting a menu also removes any permission rows referencing it,
// and detaches its direct children (parent_id → null) so they aren't orphaned
// and pointing at a missing record.
exports.remove = async (id, authedUser) => {
  const doc = await menuModel.findById(id);
  if (!doc) {
    const err = new Error('Menu not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const menuOrgId = doc.organization_id || doc.organizationId;
    if (!userOrgId || String(menuOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only delete menus belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  // Detach children (best-effort; if model exposes deleteMany, we still leave
  // children in place but with parent_id=null so they remain visible).
  const children = await menuModel.list({ parent_id: id });
  for (const child of children) {
    await menuModel.update(child._id, { parent_id: null });
  }

  // Remove permissions that reference this menu.
  if (typeof permissionModel.removeByMenu === 'function') {
    await permissionModel.removeByMenu(id);
  } else if (typeof permissionModel.deleteMany === 'function') {
    await permissionModel.deleteMany({ menu_id: id });
  }

  await menuModel.remove(id);
  return doc;
};
