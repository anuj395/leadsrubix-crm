const mongoose = require('mongoose');
const { matchLeadSourceAndCampaign } = require('./sourceMatcher');

const getDb = () => mongoose.connection.db;
const ObjectId = mongoose.Types.ObjectId;

function getModel(name, relativePath) {
  try {
    return mongoose.model(name);
  } catch (e) {
    if (relativePath) {
      try { require(relativePath); } catch (err) {}
    }
    return mongoose.model(name);
  }
}

/**
 * Automated Lead Distribution Engine (Round-Robin & Capacity Routing)
 */
const leadDistributionService = {
  async getConfig(organizationId) {
    const db = getDb();
    const config = await db.collection('lead_distribution_configs').findOne({ organizationId: String(organizationId) });
    if (!config) {
      return {
        organizationId: String(organizationId),
        enabled: false,
        mode: 'ROUND_ROBIN', // ROUND_ROBIN | CAPACITY_BASED | MANUAL
        participatingUserIds: [],
        maxDailyCapPerUser: 20,
        lastAssignedIndex: 0,
        updatedAt: new Date(),
      };
    }
    return { ...config, id: config._id.toString() };
  },

  async updateConfig(organizationId, payload) {
    const db = getDb();
    const filter = { organizationId: String(organizationId) };
    const update = {
      $set: {
        organizationId: String(organizationId),
        enabled: Boolean(payload.enabled),
        mode: payload.mode || 'ROUND_ROBIN',
        participatingUserIds: Array.isArray(payload.participatingUserIds) ? payload.participatingUserIds : [],
        maxDailyCapPerUser: Number(payload.maxDailyCapPerUser) || 20,
        updatedAt: new Date(),
      },
    };

    await db.collection('lead_distribution_configs').updateOne(filter, update, { upsert: true });
    return this.getConfig(organizationId);
  },

  async getNextAssignedUser(organizationId) {
    const config = await this.getConfig(organizationId);
    if (!config.enabled || !config.participatingUserIds || config.participatingUserIds.length === 0) {
      return null;
    }

    const db = getDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const candidates = config.participatingUserIds;
    let selectedUserId = null;
    let nextIndex = config.lastAssignedIndex || 0;

    for (let i = 0; i < candidates.length; i++) {
      const idx = (nextIndex + i) % candidates.length;
      const userId = candidates[idx];

      // Check daily lead cap for this user
      const leadsToday = await db.collection('contacts').countDocuments({
        organizationId: String(organizationId),
        contactOwnerEmail: userId, // or ownerId
        createdAt: { $gte: todayStart },
      });

      if (leadsToday < config.maxDailyCapPerUser) {
        selectedUserId = userId;
        nextIndex = (idx + 1) % candidates.length;
        break;
      }
    }

    if (selectedUserId) {
      await db.collection('lead_distribution_configs').updateOne(
        { organizationId: String(organizationId) },
        { $set: { lastAssignedIndex: nextIndex, updatedAt: new Date() } }
      );

      // Fetch user details
      const user = await db.collection('users').findOne({
        $or: [{ email: selectedUserId }, { _id: ObjectId.isValid(selectedUserId) ? new ObjectId(selectedUserId) : null }],
      });

      return user || { email: selectedUserId };
    }

    return null;
  },

  /**
   * Evaluates configured Lead Distribution Rules for incoming webhooks/leads
   */
  async assignLeadByRules(params = {}) {
    const {
      organizationId,
      industryId,
      workspaceId,
      source = '',
      campaign = '',
      project = '',
      location = '',
      budget = '',
      propertyType = ''
    } = params;

    if (!organizationId) {
      return { uid: '', ownerEmail: '' };
    }

    try {
      const LeadDistributionRule = getModel('LeadDistributionRule', '../models/leadDistributionModel');
      const User = getModel('User', '../models/userModel');

      const orgIdStr = String(organizationId);

      // Find distribution rules matching organization
      const rules = await LeadDistributionRule.find({
        $or: [
          { organization_id: orgIdStr },
          { organizationId: orgIdStr }
        ]
      }).lean().exec();

      if (rules && rules.length > 0) {
        for (const rule of rules) {
          // 1. Source & Campaign Matching
          if (rule.source && rule.source.toLowerCase() !== 'all' && rule.source.toLowerCase() !== 'any') {
            const matchesSource = matchLeadSourceAndCampaign(source, campaign, rule.source);
            if (!matchesSource) {
              continue;
            }
          }

          // 2. Project Matching (if specified in rule)
          if (rule.project && Array.isArray(rule.project) && rule.project.length > 0) {
            const hasWildcard = rule.project.some(p => ['all', 'any'].includes(String(p).trim().toLowerCase()));
            if (!hasWildcard && project) {
              const lProject = String(project).trim().toLowerCase();
              const matchesProj = rule.project.some(p => String(p).trim().toLowerCase() === lProject);
              if (!matchesProj) continue;
            }
          }

          // 3. Location Matching (if specified in rule)
          if (rule.location && Array.isArray(rule.location) && rule.location.length > 0) {
            const hasWildcard = rule.location.some(l => ['all', 'any'].includes(String(l).trim().toLowerCase()));
            if (!hasWildcard && location) {
              const lLoc = String(location).trim().toLowerCase();
              const matchesLoc = rule.location.some(l => String(l).trim().toLowerCase() === lLoc);
              if (!matchesLoc) continue;
            }
          }

          // 4. Extract assigned users or user queue
          const usersList = rule.users || [];
          const userQueue = (rule.users_queue && rule.users_queue.length > 0)
            ? rule.users_queue
            : usersList.map(u => u.user_email || u.email);

          if (userQueue.length === 0 && usersList.length === 0) continue;

          let selectedEmail = '';
          let selectedUid = '';
          let currentIndex = rule.user_index !== undefined ? rule.user_index : 0;

          if (userQueue.length > 0) {
            const nextIdx = currentIndex % userQueue.length;
            const candidate = userQueue[nextIdx];
            selectedEmail = typeof candidate === 'string' ? candidate : (candidate.user_email || candidate.email || '');

            // Round-robin pointer increment
            const nextPointer = (nextIdx + 1) % userQueue.length;
            await LeadDistributionRule.updateOne(
              { _id: rule._id },
              { $set: { user_index: nextPointer, userIndex: nextPointer } }
            ).exec();
          } else if (usersList.length > 0) {
            const candidate = usersList[0];
            selectedEmail = candidate.user_email || candidate.email || '';
            selectedUid = candidate.uid || candidate._id || '';
          }

          if (selectedEmail || selectedUid) {
            if (!selectedUid && selectedEmail && User) {
              const uDoc = await User.findOne({
                $or: [
                  { organization_id: orgIdStr },
                  { organizationId: orgIdStr }
                ],
                email: selectedEmail
              }).lean().exec();
              if (uDoc) {
                selectedUid = String(uDoc._id || uDoc.uid || '');
              }
            }
            return { uid: selectedUid, ownerEmail: selectedEmail };
          }
        }
      }

      // Fallback: Use config-based round-robin distribution if no rule matched
      const fallbackUser = await this.getNextAssignedUser(orgIdStr);
      if (fallbackUser) {
        const email = fallbackUser.email || fallbackUser.user_email || '';
        const uid = String(fallbackUser._id || fallbackUser.uid || fallbackUser.id || '');
        return { uid, ownerEmail: email };
      }
    } catch (err) {
      console.error('[leadDistributionService.assignLeadByRules] Error:', err.message || err);
    }

    return { uid: '', ownerEmail: '' };
  }
};

module.exports = leadDistributionService;
