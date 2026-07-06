const permModel = require('../models/sidebarPermissionModel');
const roleModel = require('../models/roleModel');
const industryModel = require('../models/industryModel');
const menuModel = require('../models/sidebarMenuModel');

exports.list = (opts) => permModel.list(opts);

exports.upsert = async (payload) => {
  const { roleId, industryId, menu_id } = payload || {};
  if (!roleId || !industryId || !menu_id) {
    const err = new Error('roleId, industryId and menu_id are required');
    err.status = 400;
    throw err;
  }
  const [role, industry, menu] = await Promise.all([
    roleModel.findById(roleId),
    industryModel.findById(industryId),
    menuModel.findById(menu_id),
  ]);
  if (!role || !industry || !menu) {
    const err = new Error('role, industry or menu not found');
    err.status = 404;
    throw err;
  }
  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(industry._id)) {
    const err = new Error('role does not belong to the given industry');
    err.status = 400;
    throw err;
  }
  return permModel.upsert(payload);
};

exports.bulkSet = async ({ roleId, industryId, menu_ids }) => {
  if (!roleId || !industryId) {
    const err = new Error('roleId and industryId are required');
    err.status = 400;
    throw err;
  }
  const [role, industry] = await Promise.all([
    roleModel.findById(roleId),
    industryModel.findById(industryId),
  ]);
  if (!role || !industry) {
    const err = new Error('role or industry not found');
    err.status = 404;
    throw err;
  }
  const roleIndustryId = role.industryId?._id ? String(role.industryId._id) : String(role.industryId);
  if (roleIndustryId !== String(industry._id)) {
    const err = new Error('role does not belong to the given industry');
    err.status = 400;
    throw err;
  }
  return permModel.bulkSetForRoleIndustry({ roleId, industryId, menu_ids });
};

exports.remove = async (id) => permModel.remove(id);
