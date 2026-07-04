const service = require('../services/organizationService');

exports.list = async (req, res, next) => {
  try {
    const { items, total } = await service.listPaged({
      authedUser: req.user,
      industryId: req.query.industryId,
      q: req.query.q,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortField: req.query.sortField,
      sortDir: req.query.sortDir,
    });
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const item = await service.fetchById({ id: req.params.id, authedUser: req.user });
    if (!item) return res.status(404).json({ message: 'Organization not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await service.create({ payload: req.body, authedUser: req.user });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await service.update({
      id: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove({ id: req.params.id, authedUser: req.user });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
