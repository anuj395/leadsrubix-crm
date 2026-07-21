// src/services/roleActionPermissionService.js
const mongoose = require('mongoose');
const model = require('../models/roleActionPermissionModel');
const screenModel = require('../models/screenModel');
const roleModel = require('../models/roleModel');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v ?? ''));

const ACTIONS = ['view', 'add', 'edit', 'delete'];

exports.ACTIONS = ACTIONS;

exports.list = ({ roleId, industryId, screenId }) =>
  model.list({ roleId, industryId, screenId });

exports.upsert = async ({ roleId, industryId, screenId, can_view, can_add, can_edit, can_delete }) => {
  if (!roleId || !industryId || !screenId) {
    const e = new Error('roleId, industryId and screenId are required'); e.status = 400; throw e;
  }
  if (!isObjectId(roleId) || !isObjectId(industryId) || !isObjectId(screenId)) {
    const e = new Error('roleId, industryId and screenId must be valid ObjectIds'); e.status = 400; throw e;
  }
  // Ensure referenced docs actually exist and that the role belongs to the
  // requested industry — prevents orphan / cross-industry rows from direct API calls.
  const [role, screen] = await Promise.all([
    roleModel.findById(roleId),
    screenModel.findById(screenId),
  ]);
  if (!role)   { const e = new Error('Role not found');   e.status = 404; throw e; }
  if (!screen) { const e = new Error('Screen not found'); e.status = 404; throw e; }
  if (String(role.industryId) !== String(industryId)) {
    const e = new Error('Role does not belong to the specified industry'); e.status = 400; throw e;
  }
  return model.upsert({ roleId, industryId, screenId, can_view, can_add, can_edit, can_delete });
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
