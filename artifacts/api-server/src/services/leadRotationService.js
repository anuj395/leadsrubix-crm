const mongoose = require('mongoose');
const { matchLeadSourceAndCampaign } = require('./sourceMatcher');

/**
 * Converts a Date object to local time components based on timezone (Default Asia/Kolkata / IST).
 */
function getLocalTimeComponents(now = new Date(), timeZone = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const partMap = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const dayName = partMap.weekday; // 'Monday', 'Tuesday', etc.
    const hours = Number(partMap.hour === '24' ? 0 : partMap.hour);
    const minutes = Number(partMap.minute);

    return { dateStr, dayName, hours, minutes, totalMinutes: hours * 60 + minutes };
  } catch (err) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      dateStr: now.toISOString().split('T')[0],
      dayName: dayNames[now.getDay()],
      hours: now.getHours(),
      minutes: now.getMinutes(),
      totalMinutes: now.getHours() * 60 + now.getMinutes()
    };
  }
}

/**
 * Checks if the current timestamp falls within the organization's configured working hours
 * and is not a scheduled company holiday.
 */
async function isWithinWorkingHours(organizationId, now = new Date()) {
  try {
    const WorkingDay = mongoose.model('WorkingDay');
    const Holiday = mongoose.model('Holiday');
    const Organization = mongoose.model('Organization');

    const orgFilter = {
      $or: [
        { organization_id: organizationId },
        { organizationId: organizationId }
      ]
    };

    const org = await Organization.findOne(orgFilter).lean().exec();
    const orgTimeZone = org?.timezone || org?.time_zone || org?.timeZone || 'Asia/Kolkata';
    const localTime = getLocalTimeComponents(now, orgTimeZone);

    // 1. Check if today is a scheduled Holiday in the organization
    const holidayDoc = await Holiday.findOne(orgFilter).lean().exec();
    if (holidayDoc && Array.isArray(holidayDoc.holidays)) {
      const isHoliday = holidayDoc.holidays.some(h => {
        const hDate = String(h.date || '').split('T')[0];
        return hDate === localTime.dateStr;
      });
      if (isHoliday) {
        return false; // Today is a scheduled company holiday
      }
    }

    // 2. Check Working Days configuration
    const workingDaysDoc = await WorkingDay.findOne(orgFilter).lean().exec();
    if (!workingDaysDoc || !Array.isArray(workingDaysDoc.days) || workingDaysDoc.days.length === 0) {
      // Default to 24/7 if no working days configuration is defined
      return true;
    }

    const dayConfig = workingDaysDoc.days.find(d => 
      String(d.day).trim().toLowerCase() === localTime.dayName.toLowerCase()
    );

    if (!dayConfig) return true;
    if (dayConfig.closed === true) return false;

    const opensAt = dayConfig.opens_at || dayConfig.opensAt || '00:00';
    const closesAt = dayConfig.closes_at || dayConfig.closesAt || '23:59';

    const [openH, openM] = opensAt.split(':').map(Number);
    const [closeH, closeM] = closesAt.split(':').map(Number);

    const openTotalMins = (openH || 0) * 60 + (openM || 0);
    const closeTotalMins = (closeH || 23) * 60 + (closeM || 59);

    return localTime.totalMinutes >= openTotalMins && localTime.totalMinutes <= closeTotalMins;
  } catch (err) {
    console.error('[LeadRotation] Error checking working hours:', err);
    return true; // Fallback to allowing rotation on unexpected error
  }
}

/**
 * Evaluates unattended fresh leads across active rotation rules for an organization.
 */
async function processUnattendedLeadsRotation(organizationId = null) {
  try {
    const LeadRotationRule = mongoose.model('LeadRotationRule');
    const LeadReassignmentHistory = mongoose.model('LeadReassignmentHistory');
    const Contact = mongoose.model('Contact');
    const User = mongoose.model('User');
    const Notification = mongoose.model('Notification');

    const query = {};
    if (organizationId) {
      query.$or = [{ organization_id: organizationId }, { organizationId: organizationId }];
    }

    const rules = await LeadRotationRule.find(query).lean().exec();
    if (!rules || rules.length === 0) return { rotatedCount: 0, checkedRules: 0 };

    let totalRotated = 0;
    const now = new Date();

    for (const rule of rules) {
      const orgId = rule.organization_id || rule.organizationId;
      if (!orgId) continue;

      const usersList = rule.users || [];
      const userQueue = rule.users_queue || rule.usersQueue || usersList.map(u => u.user_email || u.email);
      if (userQueue.length <= 1) continue; // Rotation requires at least 2 users in queue

      // Check if within working hours
      const inWorkingHours = await isWithinWorkingHours(orgId, now);
      if (!inWorkingHours) {
        continue;
      }

      const rotationMins = Number(rule.rotation_time || rule.rotationTime || 15);
      const timeoutThresholdMs = rotationMins * 60 * 1000;

      // Fetch leads for this organization
      const allOrgLeads = await Contact.find({
        $or: [
          { organization_id: orgId },
          { organizationId: orgId }
        ]
      }).lean().exec();

      if (!allOrgLeads || allOrgLeads.length === 0) continue;

      // Filter unattended leads matching criteria
      const unattendedLeads = allOrgLeads.filter(lead => {
        // 1. Stage Check: untouched fresh lead
        const stage = String(lead.stage || '').trim().toUpperCase();
        const isFresh = !stage || ['FRESH', 'NEW', ''].includes(stage);
        if (!isFresh) return false;

        // 2. Universal Dynamic Source Matching (works for all sources: Website, Housing.com, 99 Acres, Magicbricks, etc.)
        if (rule.source && rule.source.toLowerCase() !== 'all' && rule.source.toLowerCase() !== 'any') {
          const lSource = lead.source || '';
          const lCampaign = lead.campaign || '';
          if (!matchLeadSourceAndCampaign(lSource, lCampaign, rule.source)) {
            return false;
          }
        }

        // 3. Project Matching
        if (rule.project && Array.isArray(rule.project) && rule.project.length > 0) {
          const lProject = String(lead.projectName || lead.project_name || lead.project || '').trim().toLowerCase();
          const matchesProj = rule.project.some(p => String(p).trim().toLowerCase() === lProject);
          if (!matchesProj) return false;
        }

        // 4. Inactivity Timeout Check
        const lastActiveTime = new Date(
          lead.last_rotation_at ||
          lead.lastRotationAt ||
          lead.assigned_at ||
          lead.assignedAt ||
          lead.updatedAt ||
          lead.updated_at ||
          lead.createdAt ||
          lead.created_at ||
          0
        ).getTime();

        return (now.getTime() - lastActiveTime) >= timeoutThresholdMs;
      });

      if (unattendedLeads.length === 0) continue;

      let currentIndex = rule.user_index !== undefined ? rule.user_index : (rule.userIndex || 0);

      for (const lead of unattendedLeads) {
        const currentOwner = lead.contact_owner_email || lead.contactOwnerEmail || lead.assigned_to || lead.assignedTo || '';

        // Find next active candidate in queue who is not the same current owner
        let nextCandidate = null;
        let nextCandidateDoc = null;
        let nextIndex = currentIndex;

        for (let step = 1; step <= userQueue.length; step++) {
          const candidateIdx = (currentIndex + step) % userQueue.length;
          const candidateEmail = userQueue[candidateIdx];
          if (!candidateEmail) continue;

          const candidateDoc = await User.findOne({
            $or: [
              { organization_id: orgId },
              { organizationId: orgId }
            ],
            email: candidateEmail,
            is_active: { $ne: false },
            status: { $ne: 'inactive' }
          }).lean().exec();

          if (candidateDoc) {
            nextCandidate = candidateEmail;
            nextCandidateDoc = candidateDoc;
            nextIndex = candidateIdx;
            break;
          }
        }

        if (!nextCandidate || nextCandidate.toLowerCase() === currentOwner.toLowerCase()) continue;

        // Perform atomic lead reassignment
        const leadId = lead._id || lead.id;
        const candidateUid = String(nextCandidateDoc._id || nextCandidateDoc.uid || '');

        await Contact.updateOne(
          { _id: leadId },
          {
            $set: {
              contact_owner_email: nextCandidate,
              contactOwnerEmail: nextCandidate,
              assigned_to: nextCandidate,
              assignedTo: nextCandidate,
              uid: candidateUid,
              contact_owner_id: candidateUid,
              contactOwnerId: candidateUid,
              last_rotation_at: now,
              lastRotationAt: now,
              updatedAt: now
            }
          }
        ).exec();

        // Advance rule pointer in database
        currentIndex = nextIndex;
        await LeadRotationRule.updateOne(
          { _id: rule._id },
          { $set: { user_index: nextIndex, userIndex: nextIndex } }
        ).exec();

        const leadCustomerName = lead.customer_name || lead.customerName || lead.name || 'Unnamed Lead';
        const leadContactNo = lead.contact_no || lead.contactNo || lead.phone || '';
        const leadSource = lead.source || lead.campaign || rule.source || '';

        // Write Audit Reassignment History Log
        try {
          await LeadReassignmentHistory.create({
            organization_id: orgId,
            organizationId: orgId,
            lead_id: String(leadId),
            leadId: String(leadId),
            customer_name: leadCustomerName,
            customerName: leadCustomerName,
            contact_no: leadContactNo,
            contactNo: leadContactNo,
            source: leadSource,
            from_user: currentOwner || 'Unassigned',
            fromUser: currentOwner || 'Unassigned',
            to_user: nextCandidate,
            toUser: nextCandidate,
            reassigned_by: 'SYSTEM (Auto Rotation)',
            reassignedBy: 'SYSTEM (Auto Rotation)',
            reason: `Timeout Unattended (${rotationMins} mins)`,
            rotation_time: rotationMins,
            rotationTime: rotationMins,
            created_at: now,
            createdAt: now
          });
        } catch (hErr) {
          console.error('[LeadRotation] Error writing reassignment history:', hErr);
        }

        // Dispatch WhatsApp Notification for Lead Rotation Transfer to New Owner
        try {
          const { sendNotification } = require('./whatsappService');
          sendNotification({
            organizationId: orgId,
            contact: {
              ...lead,
              customer_name: leadCustomerName,
              customerName: leadCustomerName,
              contact_no: leadContactNo,
              contactNumber: leadContactNo,
              contact_owner_email: nextCandidate,
              contactOwnerEmail: nextCandidate,
              assigned_to: nextCandidate,
              assignedTo: nextCandidate,
              uid: candidateUid,
              contact_owner_id: candidateUid,
              contactOwnerId: candidateUid
            },
            eventType: 'transfer'
          }).catch(wErr => console.error('[LeadRotation] WhatsApp rotation notification error:', wErr.message));
        } catch (wErr2) {
          // ignore
        }

        // Create In-App Notification for New Owner
        try {
          await Notification.create({
            organization_id: orgId,
            organizationId: orgId,
            recipient_email: nextCandidate,
            recipientEmail: nextCandidate,
            title: 'Lead Reassigned (Timeout)',
            message: `Lead "${leadCustomerName}" (${leadContactNo}) was auto-reassigned to you after ${rotationMins} mins unattended.`,
            type: 'LEAD_REASSIGN',
            read: false,
            created_at: now,
            createdAt: now
          });
        } catch (nErr) {
          // notification ignore
        }

        // Create In-App Notification for Old Owner
        if (currentOwner && currentOwner !== 'Unassigned') {
          try {
            await Notification.create({
              organization_id: orgId,
              organizationId: orgId,
              recipient_email: currentOwner,
              recipientEmail: currentOwner,
              title: 'Lead Reallocated (Timeout)',
              message: `Lead "${leadCustomerName}" was reallocated to ${nextCandidate} due to SLA timeout (${rotationMins} mins unattended).`,
              type: 'LEAD_REASSIGN',
              read: false,
              created_at: now,
              createdAt: now
            });
          } catch (nErr2) {
            // notification ignore
          }
        }

        // Notify Lead Managers if configured
        const managersList = rule.lead_manager_users || rule.leadManagerUsers || [];
        for (const manager of managersList) {
          const mgrEmail = manager.user_email || manager.email;
          if (mgrEmail && mgrEmail !== nextCandidate && mgrEmail !== currentOwner) {
            try {
              await Notification.create({
                organization_id: orgId,
                organizationId: orgId,
                recipient_email: mgrEmail,
                recipientEmail: mgrEmail,
                title: 'Lead Auto-Rotated Alert',
                message: `Lead "${leadCustomerName}" was rotated from ${currentOwner || 'None'} to ${nextCandidate} (${rotationMins}m timeout).`,
                type: 'LEAD_REASSIGN',
                read: false,
                created_at: now,
                createdAt: now
              });
            } catch (mErr) {
              // manager notification ignore
            }
          }
        }

        totalRotated++;
      }
    }

    return { rotatedCount: totalRotated, checkedRules: rules.length };
  } catch (err) {
    console.error('[LeadRotation] Error processing unattended lead rotation:', err);
    throw err;
  }
}

/**
 * Starts periodic background cron evaluation for lead rotation.
 */
function startLeadRotationCron(intervalMs = 60 * 1000) { // Every 1 minute
  console.log('[LeadRotation] Starting automated lead rotation background cron job (1 min interval)...');
  setInterval(async () => {
    try {
      await processUnattendedLeadsRotation();
    } catch (e) {
      // background error handled
    }
  }, intervalMs);
}

module.exports = {
  getLocalTimeComponents,
  isWithinWorkingHours,
  processUnattendedLeadsRotation,
  startLeadRotationCron,
};
