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

  if (role === 'sales') return [selfId];

  // For team leads and lead managers we walk down the reporting_to tree
  // breadth-first, scoped to the same industry (defensive — managers should
  // never see across tenants even if their reports were mis-assigned).
  // The `visited` Set prevents reprocessing on a cycle, and MAX_DEPTH is a
  // belt-and-suspenders cap so a pathological reporting graph cannot run the
  // request to OOM even if visited tracking were bypassed.
  const MAX_DEPTH = 10;
  const visited = new Set([selfId]);
  let frontier = [selfId];
  let depth = 0;

  while (frontier.length > 0 && depth < MAX_DEPTH) {
    depth += 1;
    const filter = {
      reporting_to: { $in: frontier },
      ...(authedUser.industryId ? { industryId: authedUser.industryId } : {}),
    };
    const reports = await User.find(filter).select('_id').lean().exec();
    const nextFrontier = [];
    for (const r of reports) {
      const id = String(r._id);
      if (!visited.has(id)) {
        visited.add(id);
        nextFrontier.push(id);
      }
    }
    frontier = nextFrontier;
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
  sales: 'teamLead',
  teamLead: 'leadManager',
  leadManager: 'admin',
  admin: 'superAdmin',
};

async function listManagerCandidates({ role, industryId, organizationId }) {
  const managerRole = MANAGER_OF[role];
  if (!managerRole) return [];
  const filter = { role: managerRole, isActive: { $ne: false } };
  if (organizationId) {
    filter.organizationId = organizationId;
  }
  // SuperAdmin is global; all other roles are tenant-scoped.
  if (managerRole !== 'superAdmin') {
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
