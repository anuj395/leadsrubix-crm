const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');
const notificationService = require('./notificationService');

/**
 * Service for SLA Timeout Tracking & Automated Escalation Alerts
 */
const slaTriggerService = {
  async getSlaConfig(organizationId) {
    const db = getDb();
    const config = await db.collection('sla_configs').findOne({ organizationId: String(organizationId) });
    if (!config) {
      return {
        organizationId: String(organizationId),
        enabled: true,
        freshLeadTimeoutMinutes: 60, // Default 1 hour SLA
        escalateToManager: true,
        autoReassignOnBreach: false,
        updatedAt: new Date(),
      };
    }
    return { ...config, id: config._id.toString() };
  },

  async updateSlaConfig(organizationId, payload) {
    const db = getDb();
    const filter = { organizationId: String(organizationId) };
    const update = {
      $set: {
        organizationId: String(organizationId),
        enabled: Boolean(payload.enabled),
        freshLeadTimeoutMinutes: Number(payload.freshLeadTimeoutMinutes) || 60,
        escalateToManager: Boolean(payload.escalateToManager),
        autoReassignOnBreach: Boolean(payload.autoReassignOnBreach),
        updatedAt: new Date(),
      },
    };

    await db.collection('sla_configs').updateOne(filter, update, { upsert: true });
    return this.getSlaConfig(organizationId);
  },

  async checkAndTriggerBreachedSlas() {
    const db = getDb();
    const configs = await db.collection('sla_configs').find({ enabled: true }).toArray();

    for (const cfg of configs) {
      const timeoutMs = (cfg.freshLeadTimeoutMinutes || 60) * 60 * 1000;
      const cutoff = new Date(Date.now() - timeoutMs);

      // Untouched fresh leads created before cutoff date
      const breachedLeads = await db.collection('contacts').find({
        organizationId: String(cfg.organizationId),
        stage: { $regex: /fresh/i },
        slaBreached: { $ne: true },
        createdAt: { $lte: cutoff },
      }).toArray();

      for (const lead of breachedLeads) {
        // Mark lead as SLA breached
        await db.collection('contacts').updateOne(
          { _id: lead._id },
          { $set: { slaBreached: true, slaBreachedAt: new Date() } }
        );

        // Notify Lead Owner & Manager
        if (lead.contactOwnerEmail) {
          await notificationService.createInAppNotification({
            userId: lead.contactOwnerEmail,
            organizationId: cfg.organizationId,
            title: '⚠️ SLA Breach Warning',
            message: `Lead "${lead.name || 'Inquiry'}" has exceeded SLA response time of ${cfg.freshLeadTimeoutMinutes} minutes.`,
            type: 'SLA_BREACH',
            metadata: { leadId: lead._id.toString() },
          }).catch(() => null);
        }
      }
    }
  },
};

module.exports = slaTriggerService;
