const service = require('../services/screenPermissionService');

exports.list = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'superAdmin';
    const organizationId = isSuperAdmin
      ? req.query.organizationId
      : (req.user?.organizationId || null);

    const workspaceId = isSuperAdmin
      ? (req.query.workspaceId || req.query.workspace_id)
      : (req.user?.workspaceId || req.user?.workspace_id || null);

    const finalIndustryId = isSuperAdmin
      ? req.query.industryId
      : (req.user?.industryId || req.user?.industry_id || null);

    const items = await service.list({
      screenId: req.query.screenId,
      roleId: req.query.roleId,
      industryId: finalIndustryId,
      fieldId: req.query.fieldId,
      enabledOnly: req.query.enabled === 'true',
      organizationId,
      workspaceId,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.bulkSet = async (req, res, next) => {
  try {
    const body = req.body || {};
    const isSuperAdmin = req.user?.role === 'superAdmin';
    const organizationId = isSuperAdmin
      ? body.organizationId
      : (req.user?.organizationId || null);

    const workspaceId = isSuperAdmin
      ? (body.workspaceId || body.workspace_id)
      : (req.user?.workspaceId || req.user?.workspace_id || null);

    const finalIndustryId = isSuperAdmin
      ? body.industryId
      : (req.user?.industryId || req.user?.industry_id || null);

    const items = await service.bulkSet({
      ...body,
      organizationId,
      workspaceId,
      industryId: finalIndustryId,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
