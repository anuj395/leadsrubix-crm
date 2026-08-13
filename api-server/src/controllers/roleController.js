const service = require('../services/roleService');

exports.list = async (req, res, next) => {
  try {
    const { industryId, active } = req.query;
    const organizationId = req.user?.role === 'superAdmin'
      ? req.query.organizationId
      : (req.user?.organizationId || null);
    const excludeRole = req.user?.role === 'admin' ? 'admin' : undefined;
    const docs = await service.list({
      industryId,
      organizationId: organizationId || null,
      activeOnly: active === 'true',
      excludeRole,
    });
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
