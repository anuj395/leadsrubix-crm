const mongoose = require('mongoose');
const getDb = () => mongoose.connection.db;
const ObjectId = mongoose.Types.ObjectId;

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
};

module.exports = leadDistributionService;
