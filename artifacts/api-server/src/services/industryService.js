const industryModel = require('../models/industryModel');
const roleModel = require('../models/roleModel');
const permissionModel = require('../models/sidebarPermissionModel');
const screenPermissionModel = require('../models/screenPermissionModel');
const roleActionPermissionModel = require('../models/roleActionPermissionModel');

exports.list = (opts) => industryModel.list(opts);

exports.get = async (id) => {
  const doc = await industryModel.findById(id);
  if (!doc) {
    const err = new Error('Industry not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

exports.create = async (payload) => {
  if (!payload?.name) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }
  
  // Find all industries to determine the next serial number
  const all = await industryModel.list();
  let maxSeq = 0;
  for (const item of all) {
    const match = /^temp(\d+)$/i.exec(item.code);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }
  const nextSeq = maxSeq + 1;
  const nextCode = `temp${String(nextSeq).padStart(4, '0')}`;

  const existing = await industryModel.findByCode(nextCode);
  if (existing) {
    const err = new Error('Generated industry code already exists');
    err.status = 409;
    throw err;
  }

  return industryModel.create({
    code: nextCode,
    name: payload.name,
    description: payload.description,
    isActive: payload.isActive,
    status: payload.status,
  });
};

exports.update = async (id, patch) => {
  if (patch?.code) {
    const existing = await industryModel.findByCode(patch.code);
    if (existing && String(existing._id) !== String(id)) {
      const err = new Error('Industry code already exists');
      err.status = 409;
      throw err;
    }
  }
  const doc = await industryModel.update(id, patch || {});
  if (!doc) {
    const err = new Error('Industry not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

// Removing an industry cascades to all its roles and the permission rows
// that reference either the industry or those roles. We do this in best-effort
// sequence rather than a transaction because the in-memory mongo we use in
// development doesn't support multi-doc transactions — but the steps are
// idempotent and order-safe.
exports.remove = async (id) => {
  const doc = await industryModel.findById(id);
  if (!doc) {
    const err = new Error('Industry not found');
    err.status = 404;
    throw err;
  }

  const roles = await roleModel.list({ industryId: id });
  const roleIds = roles.map((r) => String(r._id));

  // 1. delete every permission row for this industry (covers all roles + menus).
  if (typeof permissionModel.removeByIndustry === 'function') {
    await permissionModel.removeByIndustry(id);
  } else if (typeof permissionModel.deleteMany === 'function') {
    await permissionModel.deleteMany({ industryId: id });
  } else {
    // Fallback: per-role cleanup
    for (const rid of roleIds) {
      if (typeof permissionModel.removeByRole === 'function') {
        // eslint-disable-next-line no-await-in-loop
        await permissionModel.removeByRole(rid);
      }
    }
  }

  // 1b. cascade screen-permissions for this industry too.
  if (typeof screenPermissionModel.removeByIndustry === 'function') {
    await screenPermissionModel.removeByIndustry(id);
  } else if (typeof screenPermissionModel.deleteMany === 'function') {
    await screenPermissionModel.deleteMany({ industryId: id });
  }

  // 1c. cascade role-action permissions for this industry.
  if (typeof roleActionPermissionModel.removeByIndustry === 'function') {
    await roleActionPermissionModel.removeByIndustry(id);
  }

  // 2. delete the roles themselves.
  for (const rid of roleIds) {
    // eslint-disable-next-line no-await-in-loop
    await roleModel.remove(rid);
  }

  // 3. finally remove the industry.
  await industryModel.remove(id);
  return doc;
};
