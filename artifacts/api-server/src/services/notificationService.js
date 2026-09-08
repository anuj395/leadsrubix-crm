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

async function notifyLeadAssignmentOrCreation({ contact, organizationId, title, message, type }) {
  try {
    const User = mongoose.model('User');
    
    let assignedUser = null;
    if (contact.uid) {
      assignedUser = await User.findById(contact.uid).exec();
    } else if (contact.contactOwnerEmail) {
      assignedUser = await User.findOne({ email: contact.contactOwnerEmail }).exec();
    }
    
    const belongsToOrg = assignedUser && 
      String(assignedUser.organization_id || assignedUser.organizationId) === String(organizationId);
    
    if (belongsToOrg) {
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

    // Trigger Email Notification in background
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

    let targetUser = assignedUser;
    if (!targetUser && contact.uid) {
      targetUser = await User.findById(contact.uid).lean().exec();
    }
    if (!targetUser && contact.contactOwnerEmail) {
      targetUser = await User.findOne({ email: contact.contactOwnerEmail }).lean().exec();
    }

    let recipientEmail = targetUser?.email || contact.contactOwnerEmail || contact.contact_owner_email || '';
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

module.exports = {
  createNotification,
  notifyLeadAssignmentOrCreation,
  dispatchLeadEmailNotification
};
