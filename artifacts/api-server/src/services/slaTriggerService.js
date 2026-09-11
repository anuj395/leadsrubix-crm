const mongoose = require('mongoose');
const getDb = () => mongoose.connection.db;

/**
 * Service for SLA Timeout Tracking & Automated Escalation Alerts
 */
const slaTriggerService = {
  async getSlaConfig(organizationId) {
    const db = getDb();
    if (!db) return null;
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
    if (!db) return null;
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
    try {
      const db = getDb();
      if (!db) return;
      const Contact = mongoose.model('Contact');
      const { dispatchCrmEvent } = require('./notificationDispatcherService');

      const configs = await db.collection('sla_configs').find({ enabled: true }).toArray();

      for (const cfg of configs) {
        const timeoutMs = (cfg.freshLeadTimeoutMinutes || 60) * 60 * 1000;
        const cutoff = new Date(Date.now() - timeoutMs);

        // Untouched fresh leads created before cutoff date
        const breachedLeads = await Contact.find({
          $or: [
            { organization_id: String(cfg.organizationId) },
            { organizationId: String(cfg.organizationId) }
          ],
          stage: { $regex: /fresh/i },
          slaBreached: { $ne: true },
          createdAt: { $lte: cutoff },
        }).limit(25).exec();

        for (const lead of breachedLeads) {
          // Mark lead as SLA breached
          lead.slaBreached = true;
          lead.slaBreachedAt = new Date();
          await lead.save().catch(e => console.warn('[SlaTriggerService] Save error:', e.message));

          console.log(`[SlaTriggerService] SLA breached for lead "${lead.name || lead.customerName || lead._id}". Triggering task.sla_breach.`);

          // Dispatch unified omnichannel task.sla_breach event
          await dispatchCrmEvent({
            eventKey: 'task.sla_breach',
            organizationId: cfg.organizationId,
            entityType: 'contact',
            entityData: {
              _id: lead._id,
              id: lead._id,
              name: lead.name || lead.customerName || lead.customer_name || 'Inquiry',
              customerName: lead.name || lead.customerName || lead.customer_name || 'Inquiry',
              contactNumber: lead.contactNumber || lead.contact_number || lead.phone || '',
              contactOwnerEmail: lead.contactOwnerEmail || lead.contact_owner_email || lead.assignedTo || lead.assigned_to || '',
              slaTimeoutMinutes: cfg.freshLeadTimeoutMinutes || 60
            }
          }).catch(err => console.error('[SlaTriggerService] dispatch error:', err.message));
        }
      }
    } catch (err) {
      console.error('[SlaTriggerService] Error in checkAndTriggerBreachedSlas:', err.message);
    }
  },
};

module.exports = slaTriggerService;
