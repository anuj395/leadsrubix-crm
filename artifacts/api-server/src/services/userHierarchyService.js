// src/services/userHierarchyService.js
// Walks the `reporting_to` tree downward to compute the set of user IDs a
// given user is allowed to see. Used by the visibility filter for leads /
// contacts and any other user-owned record.
//
// Hierarchy (existing role keys in this project):
//   superAdmin   → all
//   admin        → all users in own industry (no uid restriction)
//   leadManager  → self + teamLeads reporting to self + sales reporting to those teamLeads
//   teamLead     → self + sales reporting to self
//   sales        → self only

const { User } = require('../models/userModel');

/**
 * Returns the array of `_id` strings the requesting user is allowed to see
 * records for. `null` means "no uid restriction" (super-admin or industry-
 * level admin) — callers should NOT add a uid filter when they get null.
 */
async function getVisibleUserIds(authedUser) {
  if (!authedUser?.id) return [];
  const role = authedUser.role;
  if (role === 'superAdmin' || role === 'admin') return null;

  const selfId = String(authedUser.id);
  const selfUid = authedUser.uid;

  if (role === 'sales') return [selfId];

  // Walk the tree hierarchy using both Mongoose _id and Firebase uid values
  const MAX_DEPTH = 10;
  const visited = new Set([selfId]);
  let frontierIds = [selfId];
  let frontierUids = selfUid ? [selfUid] : [];
  let depth = 0;

  while ((frontierIds.length > 0 || frontierUids.length > 0) && depth < MAX_DEPTH) {
    depth += 1;
    const filter = {
      $or: [
        { reportingTo: { $in: frontierUids } },
        { reportingTo: { $in: frontierIds } },
        { reporting_to: { $in: frontierUids } },
        { reporting_to: { $in: frontierIds } }
      ],
      ...(authedUser.industryId ? { industryId: authedUser.industryId } : {}),
    };
    const reports = await User.find(filter).select('_id uid').lean().exec();
    const nextFrontierIds = [];
    const nextFrontierUids = [];
    for (const r of reports) {
      const id = String(r._id);
      if (!visited.has(id)) {
        visited.add(id);
        nextFrontierIds.push(id);
        if (r.uid) {
          nextFrontierUids.push(r.uid);
        }
      }
    }
    frontierIds = nextFrontierIds;
    frontierUids = nextFrontierUids;
  }

  return Array.from(visited);
}

/**
 * Returns the list of users that may be selected as a manager for someone
 * with the given role. Mirrors the spec's reporting_to dynamic dropdown:
 *
 *   sales         → teamLead
 *   teamLead      → leadManager
 *   leadManager   → admin
 *   admin         → superAdmin
 */
const MANAGER_OF = {
  sales: ['teamLead', 'leadManager'],
  teamLead: ['leadManager', 'admin'],
  leadManager: ['admin'],
  admin: ['superAdmin'],
};

async function listManagerCandidates({ role, industryId, organizationId }) {
  const managerRoles = MANAGER_OF[role];
  if (!managerRoles) return [];
  const filter = { role: { $in: managerRoles }, isActive: { $ne: false } };
  if (organizationId) {
    filter.organizationId = organizationId;
  }
  // If any manager role is not superAdmin, we need to scope to the industry
  const hasNonSuperAdmin = managerRoles.some(r => r !== 'superAdmin');
  if (hasNonSuperAdmin) {
    if (industryId) {
      const mongoose = require('mongoose');
      const Industry = mongoose.model('Industry');
      const ind = await Industry.findOne({
        $or: [
          { code: industryId },
          ...(mongoose.Types.ObjectId.isValid(industryId) ? [{ _id: industryId }] : [])
        ]
      }).lean().exec();
      if (ind) {
        filter.industryId = { $in: [String(ind._id), ind.code] };
      } else {
        filter.industryId = industryId;
      }
    } else {
      filter.industryId = 'NONE';
    }
  }
  const list = await User.find(filter).select('_id name email role').lean().exec();
  return list.map((u) => ({
    _id: String(u._id),
    id: String(u._id),
    name: u.name || u.email,
    email: u.email,
    role: u.role,
  }));
}

module.exports = { getVisibleUserIds, listManagerCandidates, MANAGER_OF };
