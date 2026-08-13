const express = require('express');
const mongoose = require('mongoose');
const { fillExtraFields } = require('../services/contactService');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Helper to normalize phone numbers (legacy parser style)
function parsePhoneNumber(rawContact, inputCountryCode, defaultCountryCode = '+91') {
  if (!rawContact) {
    return { contactNumber: '', countryCode: defaultCountryCode || '+91' };
  }
  const rawStr = String(rawContact);
  let contact = rawStr.replace(/\D/g, "");
  if (contact.startsWith("0")) {
    contact = contact.slice(1);
  }
  
  const tokenCountryCode = defaultCountryCode || "+91";
  
  if (tokenCountryCode === "+91") {
    return {
      countryCode: "+91",
      contactNumber: contact.slice(-10),
    };
  } else if (inputCountryCode && inputCountryCode !== "") {
    let code = String(inputCountryCode);
    if (!code.startsWith("+")) {
      code = "+" + code;
    }
    return {
      countryCode: code,
      contactNumber: contact,
    };
  } else {
    if (rawStr.startsWith("+")) {
      return {
        countryCode: "+" + contact.slice(0, 2),
        contactNumber: contact.slice(2),
      };
    } else {
      return {
        countryCode: tokenCountryCode,
        contactNumber: contact,
      };
    }
  }
}

// Helper to log API transaction details dynamically
const logApiTransaction = async (reqData, tokenData, status, failReason, leadId = '') => {
  try {
    const ApiData = mongoose.model('ApiData');
    
    // Spread all request data to store dynamically
    const logDoc = {
      ...reqData,
      organization_id: tokenData?.organizationId || tokenData?.organization_id || reqData?.organizationId || reqData?.organization_id || 'unknown',
      status: status,
      fail_reason: failReason,
      lead_id: leadId || reqData.leadId || reqData.lead_id || '',
      created_at: new Date()
    };
    
    await ApiData.create(logDoc);
  } catch (err) {
    console.error('Failed to log API transaction:', err);
  }
};

// GET API logs (scoped by Organization)
router.get('/api-data', authenticate, async (req, res, next) => {
  try {
    const ApiData = mongoose.model('ApiData');
    const role = req.user.role;
    const isSuperAdmin = role === 'superAdmin';

    const filter = {};
    if (!isSuperAdmin) {
      filter.organization_id = req.user.organizationId || req.user.organization_id || req.user.industryId;
    } else {
      const orgId = req.query.organizationId || req.query.organization_id;
      if (orgId && orgId !== 'all') {
        filter.organization_id = orgId;
      }
    }

    const { startDate, endDate, apiFilter } = req.query;
    const dateFilter = {};
    let start = null;
    let end = new Date();

    if (startDate) {
      start = new Date(startDate);
    } else if (apiFilter === '7') {
      start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (apiFilter === '30') {
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    if (endDate) {
      end = new Date(endDate);
    }

    if (start) {
      dateFilter.$gte = start;
    }
    dateFilter.$lte = end;
    
    if (start || endDate) {
      filter.created_at = dateFilter;
    }

    const items = await ApiData.find(filter).sort({ created_at: -1 }).lean().exec();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// DELETE API logs (purge logs)
router.delete('/api-data', authenticate, async (req, res, next) => {
  try {
    const ApiData = mongoose.model('ApiData');
    const role = req.user.role;
    const isSuperAdmin = role === 'superAdmin';

    const filter = {};
    if (!isSuperAdmin) {
      filter.organization_id = req.user.organizationId || req.user.organization_id || req.user.industryId;
    } else {
      const orgId = req.query.organizationId || req.query.organization_id;
      if (orgId && orgId !== 'all') {
        filter.organization_id = orgId;
      }
    }

    await ApiData.deleteMany(filter).exec();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/createContacts', async (req, res, next) => {
  let reqData = req.body || {};
  let tokenData = null;
  
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const Contact = mongoose.model('Contact');
    const User = mongoose.model('User');

    const token = reqData.token || req.query.token;

    if (!token) {
      return res.status(200).json({ message: "Token Not Found" });
    }

    tokenData = await ApiToken.findOne({ api_key: token }).exec();
    if (!tokenData) {
      return res.status(200).json({ message: "Invalid Token" });
    }

    if (tokenData.status === "INACTIVE") {
      await logApiTransaction(reqData, tokenData, "FAILED", "Token is Inactive");
      return res.status(200).json({ message: "Token is Inactive" });
    }

    const contactNo = reqData.contactNumber || reqData.contact_number || reqData.contact_no;
    if (!contactNo) {
      await logApiTransaction(reqData, tokenData, "FAILED", "Mobile Empty");
      return res.status(200).json({ message: "Mobile Empty" });
    }

    const customerName = reqData.customerName || reqData.customer_name || reqData.name;
    if (!customerName) {
      await logApiTransaction(reqData, tokenData, "FAILED", "Invalid Customer Name");
      return res.status(200).json({ message: "Invalid Customer Name" });
    }

    const propertyType = reqData.propertyType || reqData.property_type;
    if (propertyType !== undefined && typeof propertyType !== "string") {
      await logApiTransaction(reqData, tokenData, "FAILED", "Invalid Property Type");
      return res.status(200).json({ message: "Invalid Property Type" });
    }

    // Phone parsing
    const phoneResult = parsePhoneNumber(
      contactNo,
      reqData.countryCode || reqData.country_code,
      tokenData.countryCode || tokenData.country_code || '+91'
    );

    // Duplicate check
    const organizationData = await Organization.findOne({ organizationId: tokenData.organizationId }).exec();
    if (organizationData && organizationData.allowDuplicateLeads === false) {
      const existing = await Contact.findOne({
        organizationId: tokenData.organizationId,
        $or: [
          { contactNumber: phoneResult.contactNumber },
          { alternateNo: phoneResult.contactNumber }
        ]
      }).exec();

      if (existing) {
        await logApiTransaction(reqData, tokenData, "FAILED", "Duplicate Lead");
        // Send success message to simulate obfuscation/avoid enumeration
        return res.status(200).json({ message: "Thank You! We will get back to you soon" });
      }
    }

    // Owner Resolution
    let uid = '';
    let ownerUser = null;
    const ownerEmail = reqData.ownerEmail || reqData.owner_email || reqData.contact_owner_email;
    if (ownerEmail) {
      const userDoc = await User.findOne({
        organizationId: tokenData.organizationId,
        email: String(ownerEmail).toLowerCase()
      }).exec();
      if (userDoc) {
        uid = String(userDoc._id);
        ownerUser = userDoc;
      } else {
        await logApiTransaction(reqData, tokenData, "FAILED", "Owner Not Found!");
        return res.status(200).json({ message: "Owner Not Found!" });
      }
    }

    const associateContact = reqData.associateContact || reqData.associate_contact;
    if (!uid && associateContact) {
      const userDoc = await User.findOne({
        organizationId: tokenData.organizationId,
        contactNumber: associateContact
      }).exec();
      if (userDoc) {
        uid = String(userDoc._id);
        reqData.ownerEmail = userDoc.email;
        ownerUser = userDoc;
      }
    }

    // Lead distribution logic fallback
    if (!uid) {
      const adminUser = await User.findOne({
        organizationId: tokenData.organizationId,
        role: 'admin'
      }).exec();
      if (adminUser) {
        uid = String(adminUser._id);
        reqData.ownerEmail = adminUser.email;
        ownerUser = adminUser;
      }
    }

    // Create the Contact in MongoDB dynamically (spreading reqData)
    const contactPayload = {
      ...reqData,
      customerName,
      contactNumber: phoneResult.contactNumber,
      countryCode: phoneResult.countryCode,
      organizationId: tokenData.organizationId || tokenData.organization_id || null,
      industryId: tokenData.industryId || tokenData.industry_id || (ownerUser ? (ownerUser.industryId || ownerUser.industry_id) : null),
      workspaceId: tokenData.workspaceId || tokenData.workspace_id || (ownerUser ? (ownerUser.workspaceId || ownerUser.workspace_id) : null),
      uid: uid || null,
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
    };

    const normalizedPayload = fillExtraFields(contactPayload, ownerUser);

    const doc = await Contact.create(normalizedPayload);

    try {
      const { sendNotification } = require('../services/whatsappService');
      sendNotification({
        organizationId: tokenData.organizationId,
        contact: doc,
        eventType: 'incoming'
      }).catch(err => console.error('[WhatsApp] Incoming API lead notification dispatch error:', err));
    } catch (e) {
      console.error('[WhatsApp] Failed to initiate incoming API lead notification:', e);
    }

    try {
      const { notifyLeadAssignmentOrCreation } = require('../services/notificationService');
      await notifyLeadAssignmentOrCreation({
        contact: doc,
        organizationId: tokenData.organizationId,
        title: 'New Lead Assigned (Webhook)',
        message: `A new lead "${doc.customerName || doc.name || 'Unnamed'}" has been assigned to you via API webhook.`,
        type: 'LEAD_ASSIGNED'
      });
    } catch (err) {
      console.error('[Notification] Failed to dispatch webhook in-app assignment notification:', err);
    }

    await logApiTransaction(reqData, tokenData, "SUCCESS", "", String(doc._id));

    return res.status(200).json({ message: "Thank You! We will get back to you soon" });
  } catch (err) {
    if (tokenData) {
      await logApiTransaction(reqData, tokenData, "FAILED", err.message || "Internal Error");
    }
    next(err);
  }
});

// --- Facebook Webhooks Ingest Endpoints ---

router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.FB_VERIFY_TOKEN || 'leadsrubix_fb_webhook_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

router.post('/facebook', async (req, res, next) => {
  try {
    const body = req.body || {};
    console.log('Incoming Facebook Webhook:', JSON.stringify(body, null, 2));

    if (body.object !== 'page') {
      return res.status(200).json({ message: 'Not a page event' });
    }

    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const Contact = mongoose.model('Contact');
    const User = mongoose.model('User');
    const axios = require('axios');

    // Promptly respond to Facebook with 200 OK to avoid timeouts/retry cascades
    res.status(200).json({ message: 'EVENT_RECEIVED' });

    const entries = body.entry || [];
    for (const entry of entries) {
      const pageId = entry.id;
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'leadgen') continue;

        const leadgenValue = change.value;
        if (!leadgenValue) continue;

        const leadgenId = leadgenValue.leadgen_id;
        const formId = leadgenValue.form_id;
        if (!leadgenId) continue;

        // 1. Fetch the organization's Facebook ApiToken
        const tokenDoc = await ApiToken.findOne({
          source: { $regex: /^facebook$/i },
          page_id: pageId
        }).exec();

        if (!tokenDoc) {
          console.warn(`No ApiToken configuration found for Facebook page: ${pageId}`);
          continue;
        }

        // 2. Resolve target Page access token
        const pages = tokenDoc.facebook_pages || [];
        const pageInfo = pages.find(p => String(p.id) === String(pageId));
        if (!pageInfo || !pageInfo.access_token) {
          console.warn(`No active page access token found for page: ${pageId}`);
          continue;
        }

        // 3. Request lead values from Graph API
        let leadDetails;
        try {
          const leadRes = await axios.get(`https://graph.facebook.com/v17.0/${leadgenId}`, {
            params: { access_token: pageInfo.access_token }
          });
          leadDetails = leadRes.data;
        } catch (err) {
          console.error(`Failed to fetch Facebook lead details for leadgenId ${leadgenId}:`, err.message);
          continue;
        }

        // 4. Map lead field values
        const fieldData = leadDetails.field_data || [];
        const rawFields = {};
        fieldData.forEach(item => {
          const key = item.name;
          const val = item.values && item.values[0] ? item.values[0] : '';
          rawFields[key] = val;
        });

        const nameField = rawFields.full_name || rawFields.name || rawFields.first_name || '';
        const emailField = rawFields.email || '';
        const phoneField = rawFields.phone_number || rawFields.contact_number || rawFields.contact_no || '';
        const cityField = rawFields.city || '';

        // 5. Lookup Form Project / Location mapping config
        const forms = pageInfo.form_data || [];
        const formInfo = forms.find(f => String(f.id) === String(formId));

        let projectId = '';
        let locationId = '';
        let budgetId = '';
        let leadSourcesId = '';

        if (formInfo) {
          projectId = formInfo.projectId || formInfo.project_id || '';
          locationId = formInfo.locationId || formInfo.location_id || '';
          budgetId = formInfo.budgetId || formInfo.budget_id || '';
          leadSourcesId = formInfo.leadSourcesId || formInfo.lead_sources_id || '';
        }

        // Normalize phone number
        const phoneResult = parsePhoneNumber(
          phoneField,
          '',
          tokenDoc.countryCode || tokenDoc.country_code || '+91'
        );

        // Duplicate check
        const organizationData = await Organization.findOne({ organizationId: tokenDoc.organizationId }).exec();
        if (organizationData && organizationData.allowDuplicateLeads === false) {
          const existing = await Contact.findOne({
            organizationId: tokenDoc.organizationId,
            $or: [
              { contactNumber: phoneResult.contactNumber },
              { alternateNo: phoneResult.contactNumber }
            ]
          }).exec();

          if (existing) {
            await logApiTransaction(
              { leadgen_id: leadgenId, form_id: formId, ...rawFields },
              tokenDoc,
              "FAILED",
              "Duplicate Lead"
            );
            continue;
          }
        }

        // 6. Resolve Owner User
        let uid = '';
        let ownerUser = null;
        const adminUser = await User.findOne({
          organizationId: tokenDoc.organizationId,
          role: 'admin'
        }).exec();
        if (adminUser) {
          uid = String(adminUser._id);
          ownerUser = adminUser;
        }

        const contactPayload = {
          customerName: nameField || 'Facebook Lead',
          contactNumber: phoneResult.contactNumber,
          countryCode: phoneResult.countryCode,
          emailId: emailField,
          location: cityField || locationId || '',
          projectName: projectId,
          budgetId: budgetId,
          source: 'Facebook Ads',
          leadType: 'Leads',
          stage: 'FRESH',
          organizationId: tokenDoc.organizationId || tokenDoc.organization_id || null,
          industryId: tokenDoc.industryId || tokenDoc.industry_id || (ownerUser ? (ownerUser.industryId || ownerUser.industry_id) : null),
          workspaceId: tokenDoc.workspaceId || tokenDoc.workspace_id || (ownerUser ? (ownerUser.workspaceId || ownerUser.workspace_id) : null),
          uid: uid || null,
          ad_id: leadgenValue.ad_id || '',
          campaign: leadgenValue.campaign_id || '',
          adset: leadgenValue.adgroup_id || '',
        };

        const normalizedPayload = fillExtraFields(contactPayload, ownerUser);
        const createdContact = await Contact.create(normalizedPayload);

        try {
          const { sendNotification } = require('../services/whatsappService');
          sendNotification({
            organizationId: tokenDoc.organizationId,
            contact: createdContact,
            eventType: 'incoming'
          }).catch(err => console.error('[WhatsApp] Incoming Facebook lead notification dispatch error:', err));
        } catch (e) {
          console.error('[WhatsApp] Failed to initiate incoming Facebook lead notification:', e);
        }

        try {
          const { notifyLeadAssignmentOrCreation } = require('../services/notificationService');
          await notifyLeadAssignmentOrCreation({
            contact: createdContact,
            organizationId: tokenDoc.organizationId,
            title: 'New Facebook Lead Assigned',
            message: `A new Facebook lead "${createdContact.customerName || createdContact.name || 'Unnamed'}" has been assigned to you.`,
            type: 'LEAD_ASSIGNED'
          });
        } catch (err) {
          console.error('[Notification] Failed to dispatch Facebook webhook in-app assignment notification:', err);
        }

        // Log transaction success
        await logApiTransaction(
          { leadgen_id: leadgenId, form_id: formId, ...rawFields },
          tokenDoc,
          "SUCCESS",
          "",
          String(createdContact._id)
        );
      }
    }
  } catch (err) {
    console.error('Facebook Webhook Processing Error:', err);
  }
});

module.exports = router;
