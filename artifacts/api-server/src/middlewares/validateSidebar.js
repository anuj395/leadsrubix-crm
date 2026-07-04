// Validation for new sidebar APIs
const ALLOWED_ROLES = ['superAdmin', 'admin', 'leadManager', 'teamLead', 'sales'];

function isMenuItemValid(m) {
  if (!m || typeof m !== 'object') return false;
  if (typeof m.key !== 'string' || m.key.length === 0) return false;
  if (typeof m.name !== 'string' || m.name.length === 0) return false;
  if (m.route !== undefined && typeof m.route !== 'string') return false;
  if (m.icon !== undefined && typeof m.icon !== 'string') return false;
  if (m.module !== undefined && typeof m.module !== 'string') return false;
  return true;
}

module.exports.validateUpsert = (req, res, next) => {
  const { industryId, role, menus } = req.body || {};
  if (!industryId || typeof industryId !== 'string') {
    const err = new Error('industryId is required and must be a string');
    err.status = 400;
    return next(err);
  }
  if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
    const err = new Error(`role is required and must be one of: ${ALLOWED_ROLES.join(', ')}`);
    err.status = 400;
    return next(err);
  }
  if (menus !== undefined) {
    if (!Array.isArray(menus)) {
      const err = new Error('menus must be an array of menu objects');
      err.status = 400;
      return next(err);
    }
    for (const m of menus) {
      if (!isMenuItemValid(m)) {
        const err = new Error('each menu must be an object with string "key" and "name"');
        err.status = 400;
        return next(err);
      }
    }
  }
  next();
};

module.exports.validateGet = (req, res, next) => {
  const { industryId } = req.params || {};
  if (!industryId || typeof industryId !== 'string') {
    const err = new Error('industryId param is required');
    err.status = 400;
    return next(err);
  }
  next();
};

module.exports.validateUserRequest = (req, res, next) => {
  const { industryId, role } = req.body || {};
  if (!industryId || typeof industryId !== 'string') {
    const err = new Error('industryId is required and must be a string');
    err.status = 400;
    return next(err);
  }
  if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
    const err = new Error(`role is required and must be one of: ${ALLOWED_ROLES.join(', ')}`);
    err.status = 400;
    return next(err);
  }
  next();
};

// Validator for the new POST /sidebar/resolve endpoint, which accepts either
// {industry_code, role_key} (preferred) or {industryId, role} (legacy).
module.exports.validateResolve = (req, res, next) => {
  const body = req.body || {};
  const industry = body.industry_code || body.industryId;
  const role = body.role_key || body.role;
  if (!industry || typeof industry !== 'string') {
    const err = new Error('industry_code (or industryId) is required and must be a string');
    err.status = 400;
    return next(err);
  }
  if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
    const err = new Error(`role_key (or role) must be one of: ${ALLOWED_ROLES.join(', ')}`);
    err.status = 400;
    return next(err);
  }
  next();
};
