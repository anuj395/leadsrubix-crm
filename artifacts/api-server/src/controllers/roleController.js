const service = require('../services/roleService');

exports.list = async (req, res, next) => {
  try {
    const { industryId, active } = req.query;
    const excludeRole = req.user?.role === 'admin' ? 'admin' : undefined;
    const docs = await service.list({
      industryId,
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
    const doc = await service.create(req.body || {});
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const doc = await service.update(req.params.id, req.body || {});
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
