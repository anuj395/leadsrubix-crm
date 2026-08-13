const service = require('../services/screenPermissionService');

exports.list = async (req, res, next) => {
  try {
    const organizationId = req.user?.role === 'superAdmin'
      ? req.query.organizationId
      : (req.user?.organizationId || null);

    const items = await service.list({
      screenId: req.query.screenId,
      roleId: req.query.roleId,
      industryId: req.query.industryId,
      fieldId: req.query.fieldId,
      enabledOnly: req.query.enabled === 'true',
      organizationId,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.bulkSet = async (req, res, next) => {
  try {
    const body = req.body || {};
    const organizationId = req.user?.role === 'superAdmin'
      ? body.organizationId
      : (req.user?.organizationId || null);

    const items = await service.bulkSet({
      ...body,
      organizationId,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
