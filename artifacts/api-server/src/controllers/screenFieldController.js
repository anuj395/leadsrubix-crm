const service = require('../services/screenFieldService');

exports.list = async (req, res, next) => {
  try {
    const orgId = req.user?.role === 'superAdmin'
      ? req.query.organizationId
      : (req.user?.organizationId || null);

    const wsId = req.user?.role === 'superAdmin'
      ? (req.query.workspaceId || req.query.workspace_id)
      : (req.user?.workspaceId || req.user?.workspace_id || null);

    const items = await service.list({
      screenId: req.query.screenId,
      activeOnly: req.query.active === 'true',
      organizationId: orgId,
      workspaceId: wsId,
      industryCode: req.user?.role === 'superAdmin'
        ? (req.query.industryId || req.query.industryCode || req.query.industry_id || req.user?.industryId)
        : (req.user?.industryId || null),
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const item = await service.get(req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await service.create(req.body, req.user);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await service.update(req.params.id, req.body, req.user);
    res.json(item);
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
