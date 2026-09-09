const mongoose = require('mongoose');
const { matchLeadSourceAndCampaign } = require('./sourceMatcher');

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
  // ── General Config ────────────────────────────────────────────────────────
  async getConfig(organizationId) {
    if (!organizationId) {
      return {
        enabled: false,
        mode: 'ROUND_ROBIN',
        participatingUserIds: [],
        maxDailyCapPerUser: 20,
        lastAssignedIndex: 0,
        updatedAt: new Date(),
      };
    }
    const orgIdStr = String(organizationId);
    const db = mongoose.connection.db;
    const config = await db.collection('lead_distribution_configs').findOne({
      $or: [{ organizationId: orgIdStr }, { organization_id: orgIdStr }]
    });

    if (!config) {
      return {
        organizationId: orgIdStr,
        enabled: false,
        mode: 'ROUND_ROBIN', // ROUND_ROBIN | CAPACITY_BASED | MANUAL
        participatingUserIds: [],
        maxDailyCapPerUser: 20,
        lastAssignedIndex: 0,
        updatedAt: new Date(),
      };
    }
    return {
      ...config,
      _id: String(config._id),
      id: String(config._id),
      organizationId: config.organizationId || config.organization_id || orgIdStr,
    };
  },

  async updateConfig(organizationId, payload = {}) {
    if (!organizationId) throw new Error('organizationId is required');
    const orgIdStr = String(organizationId);
    const db = mongoose.connection.db;
    const filter = {
      $or: [{ organizationId: orgIdStr }, { organization_id: orgIdStr }]
    };
    const update = {
      $set: {
        organizationId: orgIdStr,
        organization_id: orgIdStr,
        enabled: Boolean(payload.enabled ?? payload.autoAssign),
        mode: payload.mode || (payload.logicType === 'manual' ? 'MANUAL' : 'ROUND_ROBIN'),
        participatingUserIds: Array.isArray(payload.participatingUserIds) ? payload.participatingUserIds : [],
        maxDailyCapPerUser: Number(payload.maxDailyCapPerUser) || 20,
        updatedAt: new Date(),
      },
    };

    await db.collection('lead_distribution_configs').updateOne(filter, update, { upsert: true });
    return this.getConfig(orgIdStr);
  },

  // ── Rules CRUD ────────────────────────────────────────────────────────────
  async listRules(organizationId) {
    const LeadDistributionRule = getModel('LeadDistributionRule', '../models/leadDistributionModel');
    const filter = {};
    if (organizationId && organizationId !== 'all') {
      const orgIdStr = String(organizationId);
      filter.$or = [{ organization_id: orgIdStr }, { organizationId: orgIdStr }];
    }
    const rules = await LeadDistributionRule.find(filter).sort({ createdAt: -1 }).lean().exec();
    return (rules || []).map(r => ({
      ...r,
      _id: String(r._id),
      id: String(r._id),
      organizationId: r.organization_id || r.organizationId,
      industryId: r.industry_id || r.industryId,
      distributionType: r.distribution_type || r.distributionType || 'Normal',
      usersQueue: r.users_queue || r.usersQueue || [],
      userIndex: r.user_index ?? r.userIndex ?? 0,
      leadDistId: r.lead_dist_id || r.leadDistId,
    }));
  },

  async getRuleById(id) {
    const LeadDistributionRule = getModel('LeadDistributionRule', '../models/leadDistributionModel');
    const rule = await LeadDistributionRule.findById(id).lean().exec();
    if (!rule) return null;
    return {
      ...rule,
      _id: String(rule._id),
      id: String(rule._id),
      organizationId: rule.organization_id || rule.organizationId,
      industryId: rule.industry_id || rule.industryId,
      distributionType: rule.distribution_type || rule.distributionType || 'Normal',
      usersQueue: rule.users_queue || rule.usersQueue || [],
      userIndex: rule.user_index ?? rule.userIndex ?? 0,
      leadDistId: rule.lead_dist_id || rule.leadDistId,
    };
  },

  async createRule(payload, authedUser) {
    const LeadDistributionRule = getModel('LeadDistributionRule', '../models/leadDistributionModel');
    const orgId = String(payload.organizationId || authedUser?.organizationId || authedUser?.organization_id || '');
    const indId = payload.industryId || authedUser?.industryId || authedUser?.industry_id || 'temp0001';

    const ruleData = {
      organization_id: orgId,
      organizationId: orgId,
      industry_id: indId,
      source: payload.source || 'All',
      project: Array.isArray(payload.project) ? payload.project : (payload.project ? [payload.project] : []),
      location: Array.isArray(payload.location) ? payload.location : (payload.location ? [payload.location] : []),
      budget: Array.isArray(payload.budget) ? payload.budget : (payload.budget ? [payload.budget] : []),
      property_type: Array.isArray(payload.propertyType || payload.property_type) ? (payload.propertyType || payload.property_type) : [],
      users: Array.isArray(payload.users) ? payload.users : [],
      users_queue: Array.isArray(payload.usersQueue || payload.users_queue) ? (payload.usersQueue || payload.users_queue) : [],
      lead_manager_users: Array.isArray(payload.leadManagerUsers || payload.lead_manager_users) ? (payload.leadManagerUsers || payload.lead_manager_users) : [],
      distribution_type: payload.distributionType || payload.distribution_type || 'Normal',
      user_index: Number(payload.userIndex ?? payload.user_index ?? 0),
      lead_dist_id: payload.leadDistId || `ld-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    const created = await LeadDistributionRule.create(ruleData);
    return {
      ...created.toObject ? created.toObject() : created,
      _id: String(created._id),
      id: String(created._id),
      organizationId: orgId,
    };
  },

  async updateRule(id, payload) {
    const LeadDistributionRule = getModel('LeadDistributionRule', '../models/leadDistributionModel');
    const update = {};
    if (payload.source !== undefined) update.source = payload.source;
    if (payload.project !== undefined) update.project = Array.isArray(payload.project) ? payload.project : [payload.project];
    if (payload.location !== undefined) update.location = Array.isArray(payload.location) ? payload.location : [payload.location];
    if (payload.budget !== undefined) update.budget = Array.isArray(payload.budget) ? payload.budget : [payload.budget];
    if (payload.propertyType !== undefined || payload.property_type !== undefined) {
      update.property_type = Array.isArray(payload.propertyType || payload.property_type) ? (payload.propertyType || payload.property_type) : [];
    }
    if (payload.users !== undefined) update.users = payload.users;
    if (payload.usersQueue !== undefined || payload.users_queue !== undefined) {
      update.users_queue = payload.usersQueue || payload.users_queue;
    }
    if (payload.leadManagerUsers !== undefined || payload.lead_manager_users !== undefined) {
      update.lead_manager_users = payload.leadManagerUsers || payload.lead_manager_users;
    }
    if (payload.distributionType !== undefined || payload.distribution_type !== undefined) {
      update.distribution_type = payload.distributionType || payload.distribution_type;
    }
    if (payload.userIndex !== undefined || payload.user_index !== undefined) {
      update.user_index = Number(payload.userIndex ?? payload.user_index);
    }

    const updated = await LeadDistributionRule.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
    return updated;
  },

  async deleteRule(id) {
    const LeadDistributionRule = getModel('LeadDistributionRule', '../models/leadDistributionModel');
    await LeadDistributionRule.findByIdAndDelete(id).exec();
  },

  // ── Rotation Rules CRUD ───────────────────────────────────────────────────
  async listRotationRules(organizationId) {
    const LeadRotationRule = getModel('LeadRotationRule', '../models/leadDistributionModel');
    const filter = {};
    if (organizationId && organizationId !== 'all') {
      const orgIdStr = String(organizationId);
      filter.$or = [{ organization_id: orgIdStr }, { organizationId: orgIdStr }];
    }
    const rules = await LeadRotationRule.find(filter).sort({ createdAt: -1 }).lean().exec();
    return (rules || []).map(r => ({
      ...r,
      _id: String(r._id),
      id: String(r._id),
      organizationId: r.organization_id || r.organizationId,
      rotationTime: r.rotation_time || r.rotationTime || 15,
      usersQueue: r.users_queue || r.usersQueue || [],
      userIndex: r.user_index ?? r.userIndex ?? 0,
      relocId: r.reloc_id || r.relocId,
    }));
  },

  async getRotationRuleById(id) {
    const LeadRotationRule = getModel('LeadRotationRule', '../models/leadDistributionModel');
    const rule = await LeadRotationRule.findById(id).lean().exec();
    if (!rule) return null;
    return {
      ...rule,
      _id: String(rule._id),
      id: String(rule._id),
      organizationId: rule.organization_id || rule.organizationId,
      rotationTime: rule.rotation_time || rule.rotationTime || 15,
      usersQueue: rule.users_queue || rule.usersQueue || [],
      userIndex: rule.user_index ?? rule.userIndex ?? 0,
      relocId: rule.reloc_id || rule.relocId,
    };
  },

  async createRotationRule(payload, authedUser) {
    const LeadRotationRule = getModel('LeadRotationRule', '../models/leadDistributionModel');
    const orgId = String(payload.organizationId || authedUser?.organizationId || authedUser?.organization_id || '');
    const indId = payload.industryId || authedUser?.industryId || authedUser?.industry_id || 'temp0001';

    const ruleData = {
      organization_id: orgId,
      organizationId: orgId,
      industry_id: indId,
      source: payload.source || 'All',
      project: Array.isArray(payload.project) ? payload.project : (payload.project ? [payload.project] : []),
      rotation_time: Number(payload.rotationTime || payload.rotation_time || 15),
      users: Array.isArray(payload.users) ? payload.users : [],
      users_queue: Array.isArray(payload.usersQueue || payload.users_queue) ? (payload.usersQueue || payload.users_queue) : [],
      lead_manager_users: Array.isArray(payload.leadManagerUsers || payload.lead_manager_users) ? (payload.leadManagerUsers || payload.lead_manager_users) : [],
      user_index: Number(payload.userIndex ?? payload.user_index ?? 0),
      reloc_id: payload.relocId || `reloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };

    const created = await LeadRotationRule.create(ruleData);
    return {
      ...created.toObject ? created.toObject() : created,
      _id: String(created._id),
      id: String(created._id),
      organizationId: orgId,
    };
  },

  async updateRotationRule(id, payload) {
    const LeadRotationRule = getModel('LeadRotationRule', '../models/leadDistributionModel');
    const update = {};
    if (payload.source !== undefined) update.source = payload.source;
    if (payload.project !== undefined) update.project = Array.isArray(payload.project) ? payload.project : [payload.project];
    if (payload.rotationTime !== undefined || payload.rotation_time !== undefined) {
      update.rotation_time = Number(payload.rotationTime || payload.rotation_time);
    }
    if (payload.users !== undefined) update.users = payload.users;
    if (payload.usersQueue !== undefined || payload.users_queue !== undefined) {
      update.users_queue = payload.usersQueue || payload.users_queue;
    }
    if (payload.leadManagerUsers !== undefined || payload.lead_manager_users !== undefined) {
      update.lead_manager_users = payload.leadManagerUsers || payload.lead_manager_users;
    }
    if (payload.userIndex !== undefined || payload.user_index !== undefined) {
      update.user_index = Number(payload.userIndex ?? payload.user_index);
    }

    const updated = await LeadRotationRule.findByIdAndUpdate(id, { $set: update }, { new: true }).lean().exec();
    return updated;
  },

  async deleteRotationRule(id) {
    const LeadRotationRule = getModel('LeadRotationRule', '../models/leadDistributionModel');
    await LeadRotationRule.findByIdAndDelete(id).exec();
  },

  // ── Reassignment History ──────────────────────────────────────────────────
  async listReassignHistory(organizationId) {
    const LeadReassignmentHistory = getModel('LeadReassignmentHistory', '../models/leadDistributionModel');
    const filter = {};
    if (organizationId && organizationId !== 'all') {
      const orgIdStr = String(organizationId);
      filter.$or = [{ organization_id: orgIdStr }, { organizationId: orgIdStr }];
    }
    const list = await LeadReassignmentHistory.find(filter).sort({ createdAt: -1 }).limit(100).lean().exec();
    return (list || []).map(item => ({
      ...item,
      _id: String(item._id),
      id: String(item._id),
      leadId: item.lead_id || item.leadId,
      customerName: item.customer_name || item.customerName,
      contactNo: item.contact_no || item.contactNo,
      fromUser: item.from_user || item.fromUser,
      toUser: item.to_user || item.toUser,
      reassignedBy: item.reassigned_by || item.reassignedBy,
      rotationTime: item.rotation_time || item.rotationTime,
      createdAt: item.created_at || item.createdAt,
    }));
  },

  async createReassignHistory(payload) {
    const LeadReassignmentHistory = getModel('LeadReassignmentHistory', '../models/leadDistributionModel');
    const created = await LeadReassignmentHistory.create({
      organization_id: String(payload.organizationId || payload.organization_id || ''),
      lead_id: String(payload.leadId || payload.lead_id || payload.contactId || ''),
      customer_name: payload.customerName || payload.customer_name || payload.contactName || '',
      contact_no: payload.contactNo || payload.contact_no || '',
      source: payload.source || '',
      from_user: payload.fromUser || payload.from_user || payload.originalOwnerName || '',
      to_user: payload.toUser || payload.to_user || payload.newOwnerName || payload.newOwnerId || '',
      reassigned_by: payload.reassignedBy || payload.reassigned_by || 'SYSTEM',
      reason: payload.reason || 'Timeout Auto Rotation',
      rotation_time: Number(payload.rotationTime || payload.rotation_time || 15),
    });
    return created;
  },

  // ── Capacity & Round-Robin Fallback ───────────────────────────────────────
  async getNextAssignedUser(organizationId) {
    const config = await this.getConfig(organizationId);
    if (!config.enabled || !config.participatingUserIds || config.participatingUserIds.length === 0) {
      return null;
    }

    const User = getModel('User', '../models/userModel');
    const Contact = getModel('Contact', '../models/contactModel');

    const orgIdStr = String(organizationId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Filter candidate list to only active users
    const activeCandidates = await User.find({
      $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }],
      is_active: { $ne: false },
      $or: [
        { email: { $in: config.participatingUserIds } },
        { uid: { $in: config.participatingUserIds } },
        ...(config.participatingUserIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => ({ _id: id })))
      ]
    }).lean().exec();

    if (!activeCandidates || activeCandidates.length === 0) {
      return null;
    }

    const candidates = activeCandidates;
    let selectedUser = null;
    let nextIndex = config.lastAssignedIndex || 0;

    for (let i = 0; i < candidates.length; i++) {
      const idx = (nextIndex + i) % candidates.length;
      const u = candidates[idx];
      const userEmail = (u.email || '').toLowerCase().trim();
      const userUid = String(u.uid || u._id || '');

      // Check daily lead cap via Mongoose Contact model
      const leadsToday = await Contact.countDocuments({
        $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }],
        $or: [
          { contact_owner_email: userEmail },
          { contactOwnerEmail: userEmail },
          { contact_owner_id: userUid },
          { contactOwnerId: userUid },
          { assigned_to: userEmail },
          { assignedTo: userEmail },
        ],
        created_at: { $gte: todayStart },
      });

      if (leadsToday < config.maxDailyCapPerUser) {
        selectedUser = u;
        nextIndex = (idx + 1) % candidates.length;
        break;
      }
    }

    if (selectedUser) {
      const db = mongoose.connection.db;
      await db.collection('lead_distribution_configs').updateOne(
        { $or: [{ organizationId: orgIdStr }, { organization_id: orgIdStr }] },
        { $set: { lastAssignedIndex: nextIndex, updatedAt: new Date() } }
      );
      return selectedUser;
    }

    return null;
  },

  // ── Inbound Lead Evaluator ────────────────────────────────────────────────
  async assignLeadByRules(params = {}) {
    const {
      organizationId,
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

      // Find distribution rules for this organization
      const rules = await LeadDistributionRule.find({
        $or: [
          { organization_id: orgIdStr },
          { organizationId: orgIdStr }
        ]
      }).sort({ createdAt: -1 }).lean().exec();

      if (rules && rules.length > 0) {
        // Fetch all active users for this tenant to eliminate inactive/deleted reps
        const activeUsers = await User.find({
          $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }],
          is_active: { $ne: false },
        }).lean().exec();

        const activeUserMap = new Map();
        for (const u of activeUsers) {
          const idStr = String(u._id || u.uid || u.id || '').toLowerCase();
          const emailStr = String(u.email || '').toLowerCase().trim();
          if (idStr) activeUserMap.set(idStr, u);
          if (emailStr) activeUserMap.set(emailStr, u);
          if (u.uid) activeUserMap.set(String(u.uid).toLowerCase(), u);
        }

        for (const rule of rules) {
          // 1. Source & Campaign Matching
          if (rule.source && rule.source.toLowerCase() !== 'all' && rule.source.toLowerCase() !== 'any') {
            const matchesSource = matchLeadSourceAndCampaign(source, campaign, rule.source);
            if (!matchesSource) {
              continue;
            }
          }

          // 2. Project Matching (if specified)
          if (rule.project && Array.isArray(rule.project) && rule.project.length > 0) {
            const hasWildcard = rule.project.some(p => ['all', 'any'].includes(String(p).trim().toLowerCase()));
            if (!hasWildcard && project) {
              const lProject = String(project).trim().toLowerCase();
              const matchesProj = rule.project.some(p => String(p).trim().toLowerCase() === lProject);
              if (!matchesProj) continue;
            }
          }

          // 3. Location Matching (if specified)
          if (rule.location && Array.isArray(rule.location) && rule.location.length > 0) {
            const hasWildcard = rule.location.some(l => ['all', 'any'].includes(String(l).trim().toLowerCase()));
            if (!hasWildcard && location) {
              const lLoc = String(location).trim().toLowerCase();
              const matchesLoc = rule.location.some(l => String(l).trim().toLowerCase() === lLoc);
              if (!matchesLoc) continue;
            }
          }

          // 4. Extract assigned users / queue
          const rawQueue = (rule.users_queue && rule.users_queue.length > 0)
            ? rule.users_queue
            : (rule.users || []).map(u => u.user_email || u.email || u.uid);

          // Filter queue to ONLY active reps in this organization
          const activeQueue = rawQueue.filter(candidate => {
            const key = typeof candidate === 'string'
              ? candidate.toLowerCase().trim()
              : String(candidate.user_email || candidate.email || candidate.uid || '').toLowerCase().trim();
            return activeUserMap.has(key);
          });

          if (activeQueue.length === 0) {
            continue;
          }

          const distType = (rule.distribution_type || rule.distributionType || 'Normal');
          let selectedCandidate = null;

          if (distType === 'Normal') {
            // Assign to the single designated rep
            selectedCandidate = activeQueue[0];
          } else {
            // Round-robin rotation across active reps
            const currentIndex = typeof rule.user_index === 'number' ? rule.user_index : 0;
            const nextIdx = currentIndex % activeQueue.length;
            selectedCandidate = activeQueue[nextIdx];

            // Advance pointer atomically
            const nextPointer = (nextIdx + 1) % activeQueue.length;
            await LeadDistributionRule.updateOne(
              { _id: rule._id },
              { $set: { user_index: nextPointer, userIndex: nextPointer } }
            ).exec();
          }

          if (selectedCandidate) {
            const key = typeof selectedCandidate === 'string'
              ? selectedCandidate.toLowerCase().trim()
              : String(selectedCandidate.user_email || selectedCandidate.email || selectedCandidate.uid || '').toLowerCase().trim();

            const userDoc = activeUserMap.get(key);
            if (userDoc) {
              return {
                uid: String(userDoc._id || userDoc.uid || userDoc.id || ''),
                ownerEmail: userDoc.email || '',
              };
            }
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
  },

  // ── Automated Lead Rotation & Timeout Engine ──────────────────────────────
  async executeLeadRotation(organizationId) {
    if (!organizationId) return { rotatedCount: 0 };
    const orgIdStr = String(organizationId);

    const LeadRotationRule = getModel('LeadRotationRule', '../models/leadDistributionModel');
    const LeadReassignmentHistory = getModel('LeadReassignmentHistory', '../models/leadDistributionModel');
    const Contact = getModel('Contact', '../models/contactModel');
    const User = getModel('User', '../models/userModel');

    const rules = await LeadRotationRule.find({
      $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }]
    }).lean().exec();

    if (!rules || rules.length === 0) return { rotatedCount: 0 };

    const activeUsers = await User.find({
      $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }],
      is_active: { $ne: false },
    }).lean().exec();

    const activeUserMap = new Map();
    for (const u of activeUsers) {
      const idStr = String(u._id || u.uid || u.id || '').toLowerCase();
      const emailStr = String(u.email || '').toLowerCase().trim();
      if (idStr) activeUserMap.set(idStr, u);
      if (emailStr) activeUserMap.set(emailStr, u);
    }

    let totalRotated = 0;

    for (const rule of rules) {
      const rotationMinutes = Number(rule.rotation_time || rule.rotationTime || 15);
      const cutoffTime = new Date(Date.now() - rotationMinutes * 60 * 1000);

      const rawQueue = (rule.users_queue && rule.users_queue.length > 0)
        ? rule.users_queue
        : (rule.users || []).map(u => u.user_email || u.email || u.uid);

      const activeQueue = rawQueue.filter(candidate => {
        const key = typeof candidate === 'string'
          ? candidate.toLowerCase().trim()
          : String(candidate.user_email || candidate.email || candidate.uid || '').toLowerCase().trim();
        return activeUserMap.has(key);
      });

      if (activeQueue.length <= 1) continue;

      // Find untouched leads older than cutoffTime
      const query = {
        $or: [{ organization_id: orgIdStr }, { organizationId: orgIdStr }],
        stage: { $in: ['FRESH', 'Fresh', 'New', 'Inquiry'] },
        created_at: { $lte: cutoffTime },
        transfer_status: { $ne: 'REASSIGNED' },
      };

      if (rule.source && rule.source.toLowerCase() !== 'all' && rule.source.toLowerCase() !== 'any') {
        query.source = new RegExp(rule.source, 'i');
      }

      const staleLeads = await Contact.find(query).limit(50).exec();

      let currentIndex = rule.user_index ?? 0;

      for (const lead of staleLeads) {
        const nextIdx = currentIndex % activeQueue.length;
        const targetCandidate = activeQueue[nextIdx];
        const key = typeof targetCandidate === 'string'
          ? targetCandidate.toLowerCase().trim()
          : String(targetCandidate.user_email || targetCandidate.email || targetCandidate.uid || '').toLowerCase().trim();

        const newUserDoc = activeUserMap.get(key);
        if (!newUserDoc) continue;

        const previousOwner = lead.contact_owner_email || lead.contactOwnerEmail || 'Unassigned';

        // Reassign
        lead.contact_owner_email = newUserDoc.email;
        lead.contactOwnerEmail = newUserDoc.email;
        lead.contact_owner_id = String(newUserDoc._id);
        lead.contactOwnerId = String(newUserDoc._id);
        lead.assigned_to = newUserDoc.email;
        lead.assignedTo = newUserDoc.email;
        lead.transfer_status = 'REASSIGNED';
        lead.transferStatus = 'REASSIGNED';
        await lead.save();

        // Record history
        await LeadReassignmentHistory.create({
          organization_id: orgIdStr,
          lead_id: String(lead._id),
          customer_name: lead.customer_name || lead.customerName || 'Inquiry',
          contact_no: lead.contact_number || lead.contactNumber || '',
          source: lead.source || rule.source,
          from_user: previousOwner,
          to_user: newUserDoc.email,
          reassigned_by: 'SYSTEM_ROTATION',
          reason: `Auto Timeout Reassignment (${rotationMinutes} mins)`,
          rotation_time: rotationMinutes,
        });

        currentIndex = (currentIndex + 1) % activeQueue.length;
        totalRotated++;
      }

      await LeadRotationRule.updateOne(
        { _id: rule._id },
        { $set: { user_index: currentIndex, userIndex: currentIndex } }
      ).exec();
    }

    return { rotatedCount: totalRotated };
  },
};

module.exports = leadDistributionService;
