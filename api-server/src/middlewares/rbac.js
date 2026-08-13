// src/middlewares/rbac.js
const roles = require('../config/roles');

// Permit specific roles (exact match)
exports.permit = (...allowedRoles) => (req, res, next) => {
  const userRole = req.user && req.user.role;
  if (!userRole) return res.status(401).json({ message: 'Unauthorized' });
  if (allowedRoles.includes(userRole)) return next();
  return res.status(403).json({ message: 'Forbidden' });
};

// Permit users with a role equal or higher than `minRole` in the hierarchy
exports.permitAtLeast = (minRole) => (req, res, next) => {
  const userRole = req.user && req.user.role;
  if (!userRole) return res.status(401).json({ message: 'Unauthorized' });
  if (!roles.isValidRole(minRole)) return res.status(500).json({ message: 'Server misconfiguration: invalid role' });
  if (roles.hasAtLeast(userRole, minRole)) return next();
  return res.status(403).json({ message: 'Forbidden' });
};
