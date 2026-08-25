const service = require('../services/sidebarMenuService');

exports.list = async (req, res, next) => {
  try {
    const { active, organizationId, industryId } = req.query;
    const orgId = req.user?.role === 'superAdmin'
      ? organizationId
      : (req.user?.organizationId || null);
    const indId = req.user?.role === 'superAdmin'
      ? (industryId || req.query.industry_id)
      : (req.user?.industryId || req.user?.industry_id || null);
    const docs = await service.list({ activeOnly: active === 'true', organizationId: orgId, industryId: indId });
    res.json({ items: docs });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const doc = await service.get(req.params.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const doc = await service.create(req.body || {}, req.user);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const doc = await service.update(req.params.id, req.body || {}, req.user);
    res.json(doc);
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
