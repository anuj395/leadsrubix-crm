const sidebarService = require('../services/sidebarService');

exports.upsert = async (req, res, next) => {
  try {
    const { industryId, role, menus } = req.body || {};
    const result = await sidebarService.upsertRole({ industryId, role, menus });
    return res.status(200).json({
      message: 'Sidebar role updated',
      industryId: result.industryId,
      roles: result.roles,
      is_ready_to_launch: result.is_ready_to_launch,
    });
  } catch (err) {
    next(err);
  }
};

exports.getByIndustry = async (req, res, next) => {
  try {
    const { industryId } = req.params;
    const doc = await sidebarService.getByIndustry(industryId);
    if (!doc) return res.status(404).json({ message: 'Sidebar config not found' });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.getForUser = async (req, res, next) => {
  try {
    const { industryId, role } = req.body || {};
    const menus = await sidebarService.getRoleMenus(industryId, role);
    return res.json({ industryId, role, menus });
  } catch (err) {
    next(err);
  }
};

exports.resolve = async (req, res, next) => {
  try {
    const body = req.body || {};
    const industry_code = body.industry_code || body.industryId;
    const role_key = body.role_key || body.role;
    const result = await sidebarService.resolveSidebar({ industry_code, role_key });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
