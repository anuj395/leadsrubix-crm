const svc = require('../services/roleActionPermissionService');

exports.list = async (req, res, next) => {
  try {
    const items = await svc.list({
      roleId: req.query.roleId,
      industryId: req.query.industryId,
      screenId: req.query.screenId,
    });
    res.json({ items });
  } catch (err) { next(err); }
};

exports.upsert = async (req, res, next) => {
  try {
    const row = await svc.upsert(req.body || {});
    res.json(row);
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const screen_key = String(req.query.screen_key || '');
    if (!screen_key) return res.status(400).json({ message: 'screen_key is required' });
    const eff = await svc.getEffectiveForScreen({ authedUser: req.user, screen_key });
    res.json({ screen_key, role: req.user?.role, ...eff });
  } catch (err) { next(err); }
};
