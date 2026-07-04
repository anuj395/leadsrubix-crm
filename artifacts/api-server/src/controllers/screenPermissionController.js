const service = require('../services/screenPermissionService');

exports.list = async (req, res, next) => {
  try {
    const items = await service.list({
      screen_id: req.query.screen_id,
      roleId: req.query.roleId,
      industryId: req.query.industryId,
      field_id: req.query.field_id,
      enabledOnly: req.query.enabled === 'true',
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.bulkSet = async (req, res, next) => {
  try {
    const items = await service.bulkSet(req.body || {});
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
