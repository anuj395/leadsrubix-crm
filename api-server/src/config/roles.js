// src/config/roles.js
// Role definitions and hierarchy utilities

const ROLES = ['sales','teamLead','leadManager','admin','superAdmin'];

const indexOf = (role) => ROLES.indexOf(role);

function isValidRole(role) {
  return ROLES.includes(role);
}

// returns true if user's role is equal or higher than minimumRole
function hasAtLeast(userRole, minimumRole) {
  const u = indexOf(userRole);
  const m = indexOf(minimumRole);
  if (u === -1 || m === -1) return false;
  return u >= m;
}

module.exports = { ROLES, isValidRole, hasAtLeast };
