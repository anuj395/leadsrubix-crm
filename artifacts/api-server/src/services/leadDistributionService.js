const mongoose = require('mongoose');

/**
 * Checks if a string or array of strings matches a rule array.
 * If ruleArray is empty or undefined, it acts as a wildcard (matches all).
 */
function matchesCriteria(leadVal, ruleArray) {
  if (!ruleArray || !Array.isArray(ruleArray) || ruleArray.length === 0) {
    return true; // Wildcard
  }
  const hasWildcard = ruleArray.some(item => {
    const cleanItem = String(item).trim().toLowerCase();
    return cleanItem === 'all' || cleanItem === 'any';
  });
  if (hasWildcard) {
    return true;
  }
  if (!leadVal) {
    return false;
  }
  const cleanLeadVal = String(leadVal).trim().toLowerCase();
  return ruleArray.some(item => {
    const cleanItem = String(item).trim().toLowerCase();
    return cleanItem === cleanLeadVal;
  });
}

const { matchSources } = require('./sourceMatcher');

function hasSpecificValues(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return false;
  return arr.some(item => {
    const clean = String(item).trim().toLowerCase();
    return clean !== '' && clean !== 'all' && clean !== 'any';
  });
}

function getRuleSpecificity(rule) {
  const r = rule._doc || rule.data || rule;
  let score = 0;
  const src = r.source || rule.source;
  if (src && !['all', 'any'].includes(String(src).trim().toLowerCase())) score += 1;

  const proj = r.project || rule.project;
  if (hasSpecificValues(proj)) score += 10;

  const loc = r.location || rule.location;
  if (hasSpecificValues(loc)) score += 10;

  const bdg = r.budget || rule.budget;
  if (hasSpecificValues(bdg)) score += 10;

  const pType = r.property_type || r.propertyType || rule.property_type || rule.propertyType;
  if (hasSpecificValues(pType)) score += 10;

  return score;
}

/**
 * Evaluates active lead distribution rules for an organization and returns the assigned user.
 * 
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} [params.industryId]
 * @param {string} [params.workspaceId]
 * @param {string} [params.source]
 * @param {string} [params.project]
 * @param {string} [params.location]
 * @param {string} [params.budget]
 * @param {string} [params.propertyType]
 * @returns {Promise<{ uid: string|null, ownerEmail: string|null, ownerName: string, ruleId: string|null, distributionType: string|null, matchedRule: Object|null }>}
 */
async function assignLeadByRules({
  organizationId,
  industryId,
  workspaceId,
  source,
  project,
  location,
  budget,
  propertyType
}) {
  if (!organizationId) {
    return { uid: null, ownerEmail: null, ownerName: '', ruleId: null, distributionType: null, matchedRule: null };
  }

  try {
    const LeadDistributionRule = mongoose.model('LeadDistributionRule');
    const User = mongoose.model('User');

    // 1. Fetch all rules for the tenant organization
    const query = {
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId }
      ]
    };

    const rules = await LeadDistributionRule.find(query).exec();
    rules.sort((a, b) => getRuleSpecificity(b) - getRuleSpecificity(a));

    let matchedRule = null;

    // 2. Evaluate rules in order (most specific rules first)
    for (const rule of rules) {
      const r = rule._doc || rule.data || rule;
      const usersList = r.users || rule.users || [];
      if (!usersList || usersList.length === 0) continue;

      const sourceMatch = matchSources(source, r.source || rule.source);
      if (!sourceMatch) continue;

      const projectMatch = matchesCriteria(project, r.project || rule.project);
      if (!projectMatch) continue;

      const locationMatch = matchesCriteria(location, r.location || rule.location);
      if (!locationMatch) continue;

      const budgetMatch = matchesCriteria(budget, r.budget || rule.budget);
      if (!budgetMatch) continue;

      const propTypeMatch = matchesCriteria(propertyType, r.property_type || r.propertyType || rule.property_type || rule.propertyType);
      if (!propTypeMatch) continue;

      // Rule matched!
      matchedRule = rule;
      break;
    }

    // 3. If a rule matched, assign according to distributionType
    if (matchedRule) {
      const r = matchedRule._doc || matchedRule.data || matchedRule;
      const usersList = r.users || matchedRule.users || [];

      if (usersList && usersList.length > 0) {
        const distType = r.distribution_type || r.distributionType || matchedRule.distribution_type || matchedRule.distributionType || 'Normal';
        let selectedUser = null;
        let userDoc = null;

        if (distType === 'Roundrobin' && usersList.length > 0) {
          const currentIndex = r.user_index !== undefined ? r.user_index : (r.userIndex !== undefined ? r.userIndex : 0);
          const userCount = usersList.length;
          
          // Try up to userCount candidates to find an active user
          for (let i = 0; i < userCount; i++) {
            const candidateIndex = (currentIndex + i) % userCount;
            const candidate = usersList[candidateIndex];
            if (!candidate) continue;

            const candidateUid = candidate.uid || candidate._id || candidate.id || undefined;
            const candidateEmail = candidate.user_email || candidate.userEmail || candidate.email || undefined;

            const candidateDoc = await User.findOne({
              $or: [
                { _id: (candidateUid && mongoose.Types.ObjectId.isValid(candidateUid)) ? candidateUid : undefined },
                { email: candidateEmail }
              ].filter(Boolean)
            }).lean().exec();

            if (candidateDoc && candidateDoc.is_active !== false && candidateDoc.status !== 'inactive') {
              selectedUser = candidate;
              userDoc = candidateDoc;
              // Advance pointer past this candidate atomically in DB
              const nextIndex = (candidateIndex + 1) % userCount;
              r.user_index = nextIndex;
              r.userIndex = nextIndex;
              const ruleTargetId = String(matchedRule._id || r.id || r._id || matchedRule.id || '');
              try {
                await LeadDistributionRule.updateOne(
                  { $or: [{ _id: ruleTargetId }, { id: ruleTargetId }] },
                  { $set: { user_index: nextIndex, userIndex: nextIndex } }
                ).exec();
              } catch (err) {
                console.error('[LeadDistribution] Pointer update error:', err);
              }
              break;
            }
          }
        } else {
          // Normal distribution: assign first user in the configured rule
          selectedUser = usersList[0];
          if (selectedUser) {
            const selectedUid = selectedUser.uid || selectedUser._id || selectedUser.id || undefined;
            const selectedEmail = selectedUser.user_email || selectedUser.userEmail || selectedUser.email || undefined;

            userDoc = await User.findOne({
              $or: [
                { _id: (selectedUid && mongoose.Types.ObjectId.isValid(selectedUid)) ? selectedUid : undefined },
                { email: selectedEmail }
              ].filter(Boolean)
            }).lean().exec();
          }
        }

        if (selectedUser && (selectedUser.uid || selectedUser.user_email || selectedUser.email || userDoc)) {
          const canonicalUid = userDoc ? String(userDoc._id) : (selectedUser.uid || null);
          const canonicalEmail = userDoc ? userDoc.email : (selectedUser.user_email || selectedUser.email || null);
          const canonicalName = userDoc ? (userDoc.name || `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || userDoc.email) : '';

          return {
            uid: canonicalUid,
            ownerEmail: canonicalEmail,
            ownerName: canonicalName,
            assignedTo: canonicalEmail,
            assigned_to: canonicalEmail,
            ruleId: String(matchedRule._id || r.id || r._id || ''),
            distributionType: distType,
            matchedRule: r
          };
        }
      }
    }

    // 4. Fallback if no rule matched: assign to the Organization Admin
    const adminUser = await User.findOne({
      $or: [
        { organizationId: organizationId },
        { organization_id: organizationId }
      ],
      role: 'admin'
    }).lean().exec();

    if (adminUser) {
      return {
        uid: String(adminUser._id),
        ownerEmail: adminUser.email,
        ownerName: adminUser.name || adminUser.firstName || 'Admin',
        assignedTo: adminUser.email,
        assigned_to: adminUser.email,
        ruleId: null,
        distributionType: 'Fallback_Admin',
        matchedRule: null
      };
    }

    return { uid: null, ownerEmail: null, ownerName: '', ruleId: null, distributionType: null, matchedRule: null };
  } catch (err) {
    console.error('[LeadDistributionService] Error evaluating lead distribution rules:', err);
    return { uid: null, ownerEmail: null, ownerName: '', ruleId: null, distributionType: null, matchedRule: null };
  }
}

module.exports = {
  assignLeadByRules
};
