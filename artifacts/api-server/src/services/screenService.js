const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');
const permissionModel = require('../models/screenPermissionModel');

exports.list = (opts) => screenModel.list(opts);

exports.get = async (id) => {
  const doc = await screenModel.findById(id);
  if (!doc) {
    const err = new Error('Screen not found');
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
      const err = new Error('Forbidden: You must belong to an organization to create screens');
      err.status = 403;
      throw err;
    }
    orgId = userOrgId;
    wsId = authedUser?.workspaceId || authedUser?.workspace_id;
    indId = authedUser?.industryId || authedUser?.industry_id;
  }

  const dup = await screenModel.findByKey(payload.key, orgId || undefined);
  if (dup && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
    const err = new Error('Screen with this key already exists');
    err.status = 409;
    throw err;
  }

  return screenModel.create({
    ...payload,
    organization_id: orgId || null,
    workspace_id: wsId || null,
    industry_id: indId || null
  });
};

exports.update = async (id, patch, authedUser) => {
  const current = await screenModel.findById(id);
  if (!current) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const screenOrgId = current.organization_id || current.organizationId;
    if (!userOrgId || String(screenOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only update screens belonging to your organization');
      err.status = 403;
      throw err;
    }
    if (patch.organizationId) delete patch.organizationId;
    if (patch.organization_id) delete patch.organization_id;
  }

  if (patch?.key) {
    const orgId = current.organization_id || current.organizationId || null;
    const dup = await screenModel.findByKey(patch.key, orgId || undefined);
    if (dup && String(dup._id) !== String(id) && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
      const err = new Error('Screen with this key already exists');
      err.status = 409;
      throw err;
    }
  }

  const doc = await screenModel.update(id, patch || {});
  if (!doc) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

// Cascade: deleting a screen wipes all of its fields and any permission rows
// referencing the screen (which transitively covers the deleted fields).
exports.remove = async (id, authedUser) => {
  const doc = await screenModel.findById(id);
  if (!doc) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const screenOrgId = doc.organization_id || doc.organizationId;
    if (!userOrgId || String(screenOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only delete screens belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  await permissionModel.removeByScreen(id);
  await fieldModel.removeByScreen(id);
  try {
    const roleActionPermissionModel = require('../models/roleActionPermissionModel');
    if (typeof roleActionPermissionModel.removeByScreen === 'function') {
      await roleActionPermissionModel.removeByScreen(id);
    }
  } catch { /* model not loaded — nothing to cascade */ }

  try {
    const sidebarMenuModel = require('../models/sidebarMenuModel');
    const sidebarPermissionModel = require('../models/sidebarPermissionModel');
    const orgId = doc.organization_id || doc.organizationId || null;
    
    const matchingMenus = await sidebarMenuModel.SidebarMenu.find({
      key: doc.key,
      organization_id: orgId
    }).exec();

    for (const menu of matchingMenus) {
      await sidebarPermissionModel.removeByMenu(menu._id);
      await sidebarMenuModel.SidebarMenu.updateMany(
        { parent_id: menu._id },
        { $set: { parent_id: null } }
      ).exec();
      await sidebarMenuModel.remove(menu._id);
    }
  } catch (err) {
    console.error('Error cascading sidebar menu cleanup on screen deletion:', err);
  }

  await screenModel.remove(id);
  return doc;
};
