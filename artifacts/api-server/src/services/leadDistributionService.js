const mongoose = require('mongoose');

/**
 * Checks if a string or array of strings matches a rule array.
 * If ruleArray is empty or undefined, it acts as a wildcard (matches all).
 */
function matchesCriteria(leadVal, ruleArray) {
  if (!ruleArray || !Array.isArray(ruleArray) || ruleArray.length === 0) {
    return true; // Wildcard
  }
  if (!leadVal) {
    return false;
  }
  const cleanLeadVal = String(leadVal).trim().toLowerCase();
  return ruleArray.some(item => {
    const cleanItem = String(item).trim().toLowerCase();
    return cleanItem === cleanLeadVal || cleanItem === 'all' || cleanItem === 'any';
  });
}

const { matchSources } = require('./sourceMatcher');

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

    let matchedRule = null;

    // 2. Evaluate rules in order
    for (const rule of rules) {
      if (!rule.users || rule.users.length === 0) continue;

      const sourceMatch = matchesSource(source, rule.source);
      if (!sourceMatch) continue;

      const projectMatch = matchesCriteria(project, rule.project);
      if (!projectMatch) continue;

      const locationMatch = matchesCriteria(location, rule.location);
      if (!locationMatch) continue;

      const budgetMatch = matchesCriteria(budget, rule.budget);
      if (!budgetMatch) continue;

      const propTypeMatch = matchesCriteria(propertyType, rule.property_type || rule.propertyType);
      if (!propTypeMatch) continue;

      // Rule matched!
      matchedRule = rule;
      break;
    }

    // 3. If a rule matched, assign according to distributionType
    if (matchedRule && matchedRule.users && matchedRule.users.length > 0) {
      const distType = matchedRule.distribution_type || matchedRule.distributionType || 'Normal';
      let selectedUser = null;
      let userDoc = null;

      if (distType === 'Roundrobin' && matchedRule.users.length > 0) {
        const currentIndex = matchedRule.user_index !== undefined ? matchedRule.user_index : (matchedRule.userIndex || 0);
        const userCount = matchedRule.users.length;
        
        // Try up to userCount candidates to find an active user
        for (let i = 0; i < userCount; i++) {
          const candidateIndex = (currentIndex + i) % userCount;
          const candidate = matchedRule.users[candidateIndex];
          if (!candidate) continue;

          const candidateDoc = await User.findOne({
            $or: [
              { _id: mongoose.Types.ObjectId.isValid(candidate.uid) ? candidate.uid : undefined },
              { email: candidate.user_email }
            ].filter(Boolean)
          }).lean().exec();

          if (candidateDoc && candidateDoc.is_active !== false && candidateDoc.status !== 'inactive') {
            selectedUser = candidate;
            userDoc = candidateDoc;
            // Advance pointer past this candidate atomically in DB
            const nextIndex = (candidateIndex + 1) % userCount;
            matchedRule.user_index = nextIndex;
            matchedRule.userIndex = nextIndex;
            try {
              await LeadDistributionRule.updateOne(
                { _id: matchedRule._id },
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
        selectedUser = matchedRule.users[0];
        if (selectedUser) {
          userDoc = await User.findOne({
            $or: [
              { _id: mongoose.Types.ObjectId.isValid(selectedUser.uid) ? selectedUser.uid : undefined },
              { email: selectedUser.user_email }
            ].filter(Boolean)
          }).lean().exec();
        }
      }

      if (selectedUser && (selectedUser.uid || selectedUser.user_email)) {
        const canonicalUid = userDoc ? String(userDoc._id) : (selectedUser.uid || null);
        const canonicalEmail = userDoc ? userDoc.email : (selectedUser.user_email || null);
        const canonicalName = userDoc ? (userDoc.name || `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || userDoc.email) : '';

        return {
          uid: canonicalUid,
          ownerEmail: canonicalEmail,
          ownerName: canonicalName,
          assignedTo: canonicalEmail,
          assigned_to: canonicalEmail,
          ruleId: String(matchedRule._id),
          distributionType: distType,
          matchedRule
        };
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
