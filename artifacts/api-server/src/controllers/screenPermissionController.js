const service = require('../services/screenPermissionService');

exports.list = async (req, res, next) => {
  try {
    const items = await service.list({
      screenId: req.query.screenId,
      roleId: req.query.roleId,
      industryId: req.query.industryId,
      fieldId: req.query.fieldId,
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
