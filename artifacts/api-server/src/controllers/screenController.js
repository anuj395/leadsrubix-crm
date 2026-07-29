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
    const { screen_key, industry_code, role_key, screenKey, industryCode, roleKey } = req.body || {};
    const finalScreenKey = screenKey || screen_key;
    const finalIndustryCode = industryCode || industry_code;
    const finalRoleKey = roleKey || role_key;

    const isSuperAdmin = req.user?.role === 'superAdmin';
    const isAdmin = req.user?.role === 'admin';
    const isGuestSignup = !req.user && finalScreenKey === 'organization';

    const out = await permissionService.resolve({
      screenKey: finalScreenKey,
      industryCode: (isSuperAdmin || isGuestSignup) ? finalIndustryCode : req.user?.industryId,
      roleKey: isSuperAdmin ? (finalRoleKey || 'superAdmin') : (isAdmin || isGuestSignup) ? (finalRoleKey || 'admin') : undefined,
      authedUser: req.user,
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
};
