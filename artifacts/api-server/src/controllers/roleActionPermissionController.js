const svc = require('../services/roleActionPermissionService');

exports.list = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'superAdmin';
    const finalIndustryId = isSuperAdmin
      ? req.query.industryId
      : (req.user?.industryId || req.user?.industry_id || null);
    
    const orgId = isSuperAdmin
      ? (req.query.organizationId || req.query.organization_id)
      : (req.user?.organizationId || req.user?.organization_id || null);
      
    const wsId = isSuperAdmin
      ? (req.query.workspaceId || req.query.workspace_id)
      : (req.user?.workspaceId || req.user?.workspace_id || null);

    const items = await svc.list({
      roleId: req.query.roleId,
      industryId: finalIndustryId,
      screenId: req.query.screenId,
      organizationId: orgId,
      workspaceId: wsId,
    }, req.user);
    res.json({ items });
  } catch (err) { next(err); }
};

exports.upsert = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role === 'superAdmin';
    const body = req.body || {};
    
    if (!isSuperAdmin && req.user) {
      body.organizationId = req.user.organizationId || req.user.organization_id;
      body.workspaceId = req.user.workspaceId || req.user.workspace_id;
    }

    const row = await svc.upsert(body, req.user);
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
