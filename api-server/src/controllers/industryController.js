const service = require('../services/industryService');

exports.list = async (req, res, next) => {
  try {
    const { active } = req.query;
    const docs = await service.list({ activeOnly: active === 'true' });
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
