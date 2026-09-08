const mongoose = require('mongoose');

async function isNotificationEnabled({ userId, organizationId, type }) {
  try {
    const NotificationSetting = mongoose.model('NotificationSetting');
    const Organization = mongoose.model('Organization');

    const org = await Organization.findOne({
      $or: [
        { organization_id: organizationId },
        { _id: mongoose.Types.ObjectId.isValid(organizationId) ? organizationId : null }
      ].filter(Boolean)
    }).lean().exec();
    const industryId = org ? org.industry_id || org.industryId : null;

    if (industryId) {
      const industrySetting = await NotificationSetting.findOne({
        organization_id: `industry_${industryId}`,
        user_id: null,
        notification_type: type
      }).lean().exec();
      if (industrySetting && industrySetting.is_enabled === false) {
        return false;
      }
    }

    if (userId) {
      const userSetting = await NotificationSetting.findOne({
        organization_id: organizationId,
        user_id: String(userId),
        notification_type: type
      }).lean().exec();
      if (userSetting !== null && userSetting !== undefined && userSetting.is_enabled !== undefined) {
        return userSetting.is_enabled;
      }
    }

    const orgSetting = await NotificationSetting.findOne({
      organization_id: organizationId,
      user_id: null,
      notification_type: type
    }).lean().exec();
    if (orgSetting !== null && orgSetting !== undefined && orgSetting.is_enabled !== undefined) {
      return orgSetting.is_enabled;
    }

    return true;
  } catch (err) {
    console.error('[NotificationService] Error checking settings:', err.message);
    return true;
  }
}

async function createNotification({ userId, organizationId, workspaceId, title, message, type, relatedId }) {
  try {
    const enabled = await isNotificationEnabled({ userId, organizationId, type });
    if (!enabled) {
      console.log(`[NotificationService] Suppressing notification of type "${type}" as it is disabled in settings.`);
      return null;
    }

    const Notification = mongoose.model('Notification');
    const notification = await Notification.create({
      user_id: String(userId),
      organization_id: String(organizationId),
      workspace_id: workspaceId ? String(workspaceId) : null,
      title,
      message,
      type,
      is_read: false,
      related_id: relatedId ? String(relatedId) : null
    });
    return notification;
  } catch (err) {
    console.error('[NotificationService] Failed to create in-app notification:', err.stack || err.message);
  }
}

async function resolveUserFromContact(contact) {
  if (!contact) return null;
  const User = mongoose.model('User');
  let targetUser = null;

  // 1. Prioritize contactOwnerEmail / assignedTo email lookup
  const ownerEmail = contact.contactOwnerEmail || contact.contact_owner_email || contact.assignedTo || contact.assigned_to;
  if (ownerEmail && String(ownerEmail).trim() !== '') {
    targetUser = await User.findOne({ email: String(ownerEmail).toLowerCase().trim() }).exec();
  }

  // 2. Fallback to UID / Mongo ObjectId lookup
  const candidateUid = contact.uid || contact.contactOwnerId || contact.contact_owner_id || contact.createdBy;
  if (!targetUser && candidateUid) {
    if (mongoose.Types.ObjectId.isValid(candidateUid)) {
      targetUser = await User.findById(candidateUid).exec();
    }
    if (!targetUser) {
      targetUser = await User.findOne({ uid: String(candidateUid) }).exec();
    }
  }

  return targetUser;
}

async function notifyLeadAssignmentOrCreation({ contact, organizationId, title, message, type }) {
  try {
    const User = mongoose.model('User');
    
    let assignedUser = await resolveUserFromContact(contact);
    
    const belongsToOrg = assignedUser && 
      (!organizationId || String(assignedUser.organization_id || assignedUser.organizationId) === String(organizationId) || assignedUser.role === 'superAdmin');
    
    if (belongsToOrg && assignedUser) {
      await createNotification({
        userId: assignedUser._id,
        organizationId,
        workspaceId: contact.workspaceId || contact.workspace_id || null,
        title: title || 'New Lead Assigned',
        message: message || `A new lead "${contact.customerName || contact.name || 'Unnamed'}" has been assigned to you.`,
        type: type || 'LEAD_ASSIGNED',
        relatedId: contact._id
      });
    } else {
      const orgAdmins = await User.find({
        $or: [
          { organization_id: organizationId },
          { organizationId: organizationId }
        ],
        role: 'admin'
      }).exec();
      
      for (const admin of orgAdmins) {
        await createNotification({
          userId: admin._id,
          organizationId,
          workspaceId: contact.workspaceId || contact.workspace_id || null,
          title: 'New Lead Created',
          message: `A new lead "${contact.customerName || contact.name || 'Unnamed'}" has been added to your organization.`,
          relatedId: contact._id
        });
      }
    }

    // Trigger Email Notification in background to the assigned user
    dispatchLeadEmailNotification({
      type: type || 'LEAD_CREATED',
      contact,
      organizationId,
      assignedUser,
      source: contact.source
    }).catch(err => console.error('[NotificationService] Email dispatch error:', err));
  } catch (err) {
    console.error('[NotificationService] Failed to notify lead assignment/creation:', err.stack || err.message);
  }
}

async function dispatchLeadEmailNotification({ type, contact, organizationId, assignedUser, transferredBy, reason, source }) {
  try {
    require('../models/organizationModel');
    require('../models/userModel');
    const Organization = mongoose.model('Organization');
    const User = mongoose.model('User');
    const {
      sendNewLeadEmail,
      sendLeadTransferredEmail,
      sendThirdPartyLeadEmail
    } = require('../utils/mailer');

    let orgName = '';
    let orgDoc = null;
    if (organizationId) {
      const filterOr = [{ organization_id: organizationId }, { organizationId: organizationId }];
      if (mongoose.Types.ObjectId.isValid(organizationId)) {
        filterOr.push({ _id: organizationId });
      }
      orgDoc = await Organization.findOne({ $or: filterOr }).lean().exec();
      if (orgDoc) orgName = orgDoc.name || orgDoc.organization_name || orgDoc.organizationName || '';
    }

    let targetUser = assignedUser || await resolveUserFromContact(contact);

    let recipientEmail = targetUser?.email || contact.contactOwnerEmail || contact.contact_owner_email || contact.assignedTo || contact.assigned_to || '';
    if (!recipientEmail && orgDoc) {
      recipientEmail = orgDoc.email_id || orgDoc.emailId || orgDoc.email || '';
    }
    if (!recipientEmail && organizationId) {
      const orgAdmin = await User.findOne({
        $or: [
          { organization_id: organizationId },
          { organizationId: organizationId }
        ],
        role: 'admin'
      }).lean().exec();
      if (orgAdmin?.email) {
        recipientEmail = orgAdmin.email;
      }
    }

    if (!recipientEmail) {
      console.log('[NotificationService] No recipient email found for lead email notification.');
      return;
    }

    const customerName = contact.customerName || contact.customer_name || contact.name || 'Unnamed';
    const contactNumber = contact.contactNumber || contact.contact_no || contact.phone || '';
    const email = contact.email || contact.email_address || '';
    const leadSource = source || contact.source || 'Direct';
    const agentName = targetUser?.name || targetUser?.userName || recipientEmail.split('@')[0];

    if (type === 'LEAD_TRANSFERRED') {
      await sendLeadTransferredEmail({
        toEmail: recipientEmail,
        agentName,
        customerName,
        contactNumber,
        email,
        source: leadSource,
        leadId: contact._id,
        orgName,
        transferredBy: transferredBy || 'Admin',
        reason: reason || '',
        organizationId
      });
    } else if (type === 'THIRD_PARTY_LEAD') {
      await sendThirdPartyLeadEmail({
        toEmail: recipientEmail,
        agentName,
        customerName,
        contactNumber,
        email,
        source: leadSource,
        leadId: contact._id,
        orgName,
        campaign: contact.campaign || '',
        adset: contact.adset || '',
        organizationId
      });
    } else {
      await sendNewLeadEmail({
        toEmail: recipientEmail,
        agentName,
        customerName,
        contactNumber,
        email,
        source: leadSource,
        leadId: contact._id,
        orgName,
        leadType: contact.leadType || 'Leads',
        specialtyOrDepartment: contact.projectName || contact.propertyType || contact.department || '',
        organizationId
      });
    }
  } catch (err) {
    console.error('[NotificationService] Failed to dispatch email notification:', err.message);
  }
}

async function notifyBulkLeadAssignment({ contacts = [], organizationId, assignedUser, transferredBy, reason }) {
  if (!Array.isArray(contacts) || contacts.length === 0) return;

  // Single lead fallback -> use single notification flow
  if (contacts.length === 1) {
    return notifyLeadAssignmentOrCreation({
      contact: contacts[0],
      organizationId,
      title: 'Lead Transferred',
      message: `A lead "${contacts[0].customerName || contacts[0].name || 'Unnamed'}" has been transferred to you.`,
      type: 'LEAD_TRANSFERRED'
    });
  }

  try {
    const User = mongoose.model('User');
    const Organization = mongoose.model('Organization');
    const { sendBulkLeadTransferredEmail } = require('../utils/mailer');

    let targetUser = assignedUser;
    const firstContact = contacts[0];
    if (!targetUser && firstContact?.uid) {
      targetUser = await User.findById(firstContact.uid).lean().exec();
    }
    if (!targetUser && firstContact?.contactOwnerEmail) {
      targetUser = await User.findOne({ email: firstContact.contactOwnerEmail }).lean().exec();
    }

    let orgDoc = null;
    let orgName = '';
    if (organizationId) {
      const filterOr = [{ organization_id: organizationId }, { organizationId: organizationId }];
      if (mongoose.Types.ObjectId.isValid(organizationId)) {
        filterOr.push({ _id: organizationId });
      }
      orgDoc = await Organization.findOne({ $or: filterOr }).lean().exec();
      if (orgDoc) orgName = orgDoc.name || orgDoc.organization_name || orgDoc.organizationName || '';
    }

    let recipientEmail = targetUser?.email || firstContact?.contactOwnerEmail || '';
    if (!recipientEmail && orgDoc) {
      recipientEmail = orgDoc.email_id || orgDoc.emailId || orgDoc.email || '';
    }

    // 1. Create a SINGLE aggregated in-app notification
    if (targetUser?._id) {
      await createNotification({
        userId: targetUser._id,
        organizationId,
        workspaceId: firstContact.workspaceId || firstContact.workspace_id || null,
        title: `📊 ${contacts.length} Leads Transferred`,
        message: `${transferredBy || 'Admin'} transferred ${contacts.length} new leads to your pipeline.`,
        type: 'LEAD_TRANSFERRED',
        relatedId: null
      });
    }

    // 2. Dispatch a SINGLE consolidated digest email
    if (recipientEmail) {
      await sendBulkLeadTransferredEmail({
        toEmail: recipientEmail,
        agentName: targetUser?.name || targetUser?.userName || recipientEmail.split('@')[0],
        leads: contacts,
        orgName,
        transferredBy: transferredBy || 'Admin',
        reason: reason || '',
        organizationId
      });
    }
  } catch (err) {
    console.error('[NotificationService] Failed to notify bulk lead assignment:', err.stack || err.message);
  }
}

module.exports = {
  createNotification,
  notifyLeadAssignmentOrCreation,
  dispatchLeadEmailNotification,
  notifyBulkLeadAssignment
};
