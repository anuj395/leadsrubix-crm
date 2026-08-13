const permModel = require('../models/sidebarPermissionModel');
const roleModel = require('../models/roleModel');
const industryModel = require('../models/industryModel');
const menuModel = require('../models/sidebarMenuModel');

exports.list = async (opts) => {
  if (opts && opts.industryId) {
    const indDoc = await industryModel.findByCode(opts.industryId);
    if (indDoc) {
      opts.industryId = indDoc._id;
    }
  }
  return permModel.list(opts);
};

exports.upsert = async (payload, authedUser) => {
  const { roleId, industryId, menu_id } = payload || {};
  if (!roleId || !industryId || !menu_id) {
    const err = new Error('roleId, industryId and menu_id are required');
    err.status = 400;
    throw err;
  }
  const industry = await industryModel.findByCode(industryId);
  if (!industry) {
    const err = new Error('industry not found');
    err.status = 404;
    throw err;
  }
  const [role, menu] = await Promise.all([
    roleModel.findById(roleId),
    menuModel.findById(menu_id),
  ]);
  if (!role || !menu) {
    const err = new Error('role or menu not found');
    err.status = 404;
    throw err;
  }
  if (role.key === 'superAdmin') {
    const err = new Error('Sidebar structure for Super Admin cannot be changed');
    err.status = 403;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  const orgId = authedUser?.organizationId || authedUser?.organization_id || null;
  if (!isSuperAdmin) {
    const roleOrgId = role.organization_id || role.organizationId;
    if (!orgId || String(roleOrgId) !== String(orgId)) {
      const err = new Error('Forbidden: You can only edit permissions for roles belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(industry._id)) {
    const err = new Error('role does not belong to the given industry');
    err.status = 400;
    throw err;
  }
  payload.industryId = industry._id;
  payload.organizationId = isSuperAdmin ? (payload.organizationId || payload.organization_id || null) : orgId;
  return permModel.upsert(payload);
};

exports.bulkSet = async ({ roleId, industryId, menu_ids, menuIds, organizationId }, authedUser) => {
  if (!roleId || !industryId) {
    const err = new Error('roleId and industryId are required');
    err.status = 400;
    throw err;
  }
  const industry = await industryModel.findByCode(industryId);
  if (!industry) {
    const err = new Error('industry not found');
    err.status = 404;
    throw err;
  }
  const role = await roleModel.findById(roleId);
  if (!role) {
    const err = new Error('role not found');
    err.status = 404;
    throw err;
  }
  if (role.key === 'superAdmin') {
    const err = new Error('Sidebar structure for Super Admin cannot be changed');
    err.status = 403;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  const orgId = authedUser?.organizationId || authedUser?.organization_id || null;
  if (!isSuperAdmin) {
    const roleOrgId = role.organization_id || role.organizationId;
    if (!orgId || String(roleOrgId) !== String(orgId)) {
      const err = new Error('Forbidden: You can only edit permissions for roles belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(industry._id)) {
    const err = new Error('role does not belong to the given industry');
    err.status = 400;
    throw err;
  }
  return permModel.bulkSetForRoleIndustry({
    roleId,
    industryId: industry._id,
    menu_ids: menu_ids || menuIds,
    organizationId: isSuperAdmin ? (organizationId || null) : orgId
  });
};

exports.remove = async (id, authedUser) => {
  const doc = await permModel.findById(id);
  if (!doc) {
    const err = new Error('Permission not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const permOrgId = doc.organization_id || doc.organizationId;
    if (!userOrgId || String(permOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only delete permissions belonging to your organization');
      err.status = 403;
      throw err;
    }
  }
  return permModel.remove(id);
};
