const service = require('../services/screenService');
const permissionService = require('../services/screenPermissionService');

exports.list = async (req, res, next) => {
  try {
    const items = await service.list({ activeOnly: req.query.active === 'true' });
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
    const item = await service.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await service.update(req.params.id, req.body);
    res.json(item);
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

exports.resolve = async (req, res, next) => {
  try {
    const { screen_key, industry_code, role_key } = req.body || {};

    const isSuperAdmin = req.user?.role === 'superAdmin';
    const isAdmin = req.user?.role === 'admin';
    const isGuestSignup = !req.user && screen_key === 'organization';

    const out = await permissionService.resolve({
      screen_key,
      industry_code: (isSuperAdmin || isGuestSignup) ? industry_code : req.user?.industryId,
      role_key: (isSuperAdmin || isAdmin || isGuestSignup) ? (role_key || 'admin') : undefined,
      authedUser: req.user,
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
};
