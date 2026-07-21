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

exports.create = async (payload) => {
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
  const dup = await fieldModel.findByScreenAndKey(sId, fKey);
  if (dup) {
    const err = new Error('Field with this key already exists for this screen');
    err.status = 409;
    throw err;
  }
  return fieldModel.create({ ...payload, screenId: sId, fieldKey: fKey });
};

exports.update = async (id, patch) => {
  const current = await fieldModel.findById(id);
  if (!current) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
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
exports.remove = async (id) => {
  const doc = await fieldModel.findById(id);
  if (!doc) {
    const err = new Error('Field not found');
    err.status = 404;
    throw err;
  }
  await permissionModel.removeByField(id);
  await fieldModel.remove(id);
  return doc;
};
