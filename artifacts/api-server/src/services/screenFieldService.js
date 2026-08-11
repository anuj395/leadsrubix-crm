const fieldModel = require('../models/screenFieldModel');
const screenModel = require('../models/screenModel');
const permissionModel = require('../models/screenPermissionModel');

exports.list = (opts) => fieldModel.list(opts);

exports.get = async (id) => {
  const doc = await fieldModel.findById(id);
  if (!doc) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

exports.create = async (payload, authedUser) => {
  const sId = payload?.screenId || payload?.screen_id;
  const fKey = payload?.fieldKey || payload?.field_key;
  if (!sId || !fKey || !payload?.label) {
    const err = new Error('screenId, fieldKey and label are required');
    err.status = 400;
    throw err;
  }
  const screen = await screenModel.findById(sId);
  if (!screen) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  let orgId = payload.organizationId || payload.organization_id;
  let wsId = payload.workspaceId || payload.workspace_id;

  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const screenOrgId = screen.organizationId || screen.organization_id;
    if (!userOrgId || String(screenOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only create fields on screens belonging to your organization');
      err.status = 403;
      throw err;
    }
    orgId = userOrgId;
    wsId = authedUser?.workspaceId || authedUser?.workspace_id;
  }

  const dup = await fieldModel.findByScreenAndKey(sId, fKey);
  if (dup) {
    const err = new Error('Field with this key already exists for this screen');
    err.status = 409;
    throw err;
  }
  return fieldModel.create({
    ...payload,
    screenId: sId,
    fieldKey: fKey,
    organization_id: orgId,
    workspace_id: wsId
  });
};

exports.update = async (id, patch, authedUser) => {
  const current = await fieldModel.findById(id);
  if (!current) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const orgId = authedUser?.organizationId;
    const fieldOrgId = current.organizationId || current.organization_id;
    if (!orgId || String(fieldOrgId) !== String(orgId)) {
      const err = new Error('Forbidden: You can only edit fields belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  const fKey = patch?.fieldKey || patch?.field_key;
  if (fKey) {
    const dup = await fieldModel.findByScreenAndKey(current.screenId, fKey);
    if (dup && String(dup._id) !== String(id)) {
      const err = new Error('Field with this key already exists for this screen');
      err.status = 409;
      throw err;
    }
  }
  return fieldModel.update(id, patch || {});
};

// Cascade: removing a field also removes its permission rows.
exports.remove = async (id, authedUser) => {
  const doc = await fieldModel.findById(id);
  if (!doc) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const orgId = authedUser?.organizationId || authedUser?.organization_id;
    const fieldOrgId = doc.organizationId || doc.organization_id;
    if (!orgId || String(fieldOrgId) !== String(orgId)) {
      const err = new Error('Forbidden: You can only delete fields belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  await permissionModel.removeByField(id);
  await fieldModel.remove(id);
  return doc;
};
