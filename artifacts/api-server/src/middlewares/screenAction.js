// src/middlewares/screenAction.js
// Express middleware factory that enforces per-role View/Add/Edit/Delete
// permissions on a given screen. SuperAdmin and admin are implicit allow.
const svc = require('../services/roleActionPermissionService');

exports.requireScreenAction = (screen_key, action) => async (req, res, next) => {
  try {
    // If a user is editing their own user document, bypass screen-level RBAC and let service layer handle field-level permissions.
    if (screen_key === 'users' && action === 'edit' && req.params.id && String(req.user?.id || req.user?._id) === String(req.params.id)) {
      return next();
    }
    const ok = await svc.userCan({ authedUser: req.user, screen_key, action });
    if (!ok) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch (err) {
    next(err);
  }
};
