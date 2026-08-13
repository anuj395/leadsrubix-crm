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
    let industryCode = industryId || req.user?.industryId;
    if (!industryCode && req.user?.role === 'superAdmin') {
      industryCode = 'temp0001';
    }
    const roleKey = role || req.user?.role;
    const organizationId = req.user?.organizationId;
    const menus = await sidebarService.getRoleMenus(industryCode, roleKey, organizationId);
    return res.json({ industryId: industryCode, role: roleKey, menus });
  } catch (err) {
    next(err);
  }
};

exports.resolve = async (req, res, next) => {
  try {
    const body = req.body || {};
    let industryCode = body.industryCode || body.industryId || body.industry_code || req.user?.industryId;
    if (!industryCode && req.user?.role === 'superAdmin') {
      industryCode = 'temp0001';
    }
    const roleKey = body.roleKey || body.role || body.role_key || req.user?.role;
    const result = await sidebarService.resolveSidebar({
      industryCode,
      roleKey,
      organizationId: req.user?.organizationId,
      workspaceId: req.user?.workspaceId,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
