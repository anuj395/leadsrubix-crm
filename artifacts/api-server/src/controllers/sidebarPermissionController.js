const service = require('../services/sidebarPermissionService');

exports.list = async (req, res, next) => {
  try {
    const { roleId, industryId, menu_id, visible } = req.query;
    const docs = await service.list({
      roleId,
      industryId,
      menu_id,
      visibleOnly: visible === 'true',
    });
    res.json({ items: docs });
  } catch (err) {
    next(err);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const doc = await service.upsert(req.body || {}, req.user);
    res.status(200).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.bulkSet = async (req, res, next) => {
  try {
    const { roleId, industryId, menu_ids, menuIds } = req.body || {};
    const docs = await service.bulkSet({ roleId, industryId, menu_ids: menu_ids || menuIds }, req.user);
    res.json({ items: docs });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
