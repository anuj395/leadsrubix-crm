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
  let rawBody = req.body || {};
  let reqData = {};

  // Recursive payload flattener function to extract fields from any nested structure
  const flattenPayload = (source) => {
    if (!source || typeof source !== 'object') return;

    if (Array.isArray(source)) {
      source.forEach(item => flattenPayload(item));
      return;
    }

    for (const [key, val] of Object.entries(source)) {
      if (val === null || val === undefined) continue;

      if (typeof val === 'object' && !Array.isArray(val)) {
        // Elementor Pro field format: { value: '...', id: '...', title: '...' }
        if (val.value !== undefined || val.raw_value !== undefined) {
          const actualVal = val.value !== undefined ? val.value : val.raw_value;
          if (val.id) reqData[String(val.id).toLowerCase()] = actualVal;
          if (val.title) reqData[String(val.title).toLowerCase().trim().replace(/\s+/g, '_')] = actualVal;
          reqData[String(key).toLowerCase()] = actualVal;
        } else {
          // Recursively flatten nested sub-objects (e.g. data, payload, form_fields, fields, lead)
          flattenPayload(val);
        }
      } else {
        reqData[String(key).toLowerCase()] = val;
      }
    }
  };

  // Flatten raw body first, then merge original raw body keys
  flattenPayload(rawBody);
  Object.assign(reqData, rawBody);

  // Merge URL query parameters if present (e.g. ?token=XYZ&phone=123)
  if (req.query && typeof req.query === 'object') {
    for (const [key, val] of Object.entries(req.query)) {
      if (reqData[key] === undefined || reqData[key] === '') {
        reqData[key] = val;
      }
    }
  }

  let tokenData = null;
  
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const Contact = mongoose.model('Contact');
    const User = mongoose.model('User');

    // Token Resolution across query string, body, headers
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

    const token = reqData.token || reqData.api_key || reqData.apikey || req.query.token || req.headers['x-api-token'] || bearerToken;

    if (!token) {
      return res.status(200).json({ status: "error", success: false, message: "Token Not Found" });
    }

    tokenData = await ApiToken.findOne({ api_key: token }).exec();
    if (!tokenData) {
      return res.status(200).json({ status: "error", success: false, message: "Invalid Token" });
    }

    if (tokenData.status === "INACTIVE") {
      await logApiTransaction(reqData, tokenData, "FAILED", "Token is Inactive");
      return res.status(200).json({ status: "error", success: false, message: "Token is Inactive" });
    }

    // Comprehensive Mobile / Phone Field Matching
    let contactNo = reqData.contactnumber || reqData.contact_number || reqData.contact_no || 
                    reqData.phone || reqData.phone_number || reqData.phonenumber || reqData.mobile || 
                    reqData.mobile_no || reqData.mobileno || reqData.tel || reqData['your-phone'] || 
                    reqData.your_phone || reqData.cell || reqData.whatsapp;

    // Fallback: If no explicit key matched, search all flat values for a 10-digit number
    if (!contactNo) {
      for (const val of Object.values(reqData)) {
        if (typeof val === 'string' || typeof val === 'number') {
          const cleaned = String(val).replace(/\D/g, '');
          if (cleaned.length >= 10 && cleaned.length <= 13) {
            contactNo = String(val);
            break;
          }
        }
      }
    }

    if (!contactNo) {
      await logApiTransaction(reqData, tokenData, "FAILED", "Mobile Empty");
      return res.status(200).json({ status: "error", success: false, message: "Mobile Empty" });
    }

    // Comprehensive Name Field Matching with Fail-Safe Fallback
    let customerName = reqData.customername || reqData.customer_name || reqData.name || 
                        reqData.full_name || reqData.fullname || reqData['your-name'] || 
                        reqData.your_name || reqData.first_name || reqData.client_name || 
                        reqData.patient_name || reqData.lead_name;

    // If first_name and last_name exist separately, combine them
    if (!customerName && (reqData.first_name || reqData.last_name)) {
      customerName = `${reqData.first_name || ''} ${reqData.last_name || ''}`.trim();
    }

    // Fail-Safe Fallback: Never fail on empty name
    if (!customerName || String(customerName).trim() === '') {
      customerName = 'Website Inquiry';
    }

    const propertyType = reqData.propertyType || reqData.property_type;
    if (propertyType !== undefined && typeof propertyType !== "string") {
      await logApiTransaction(reqData, tokenData, "FAILED", "Invalid Property Type");
      return res.status(200).json({ status: "error", success: false, message: "Invalid Property Type" });
    }

    // Phone parsing
    const phoneResult = parsePhoneNumber(
      contactNo,
      reqData.countryCode || reqData.country_code,
      tokenData.countryCode || tokenData.country_code || '+91'
    );

    // Extract normalized Organization ID from tokenData
    const orgId = tokenData.organizationId || tokenData.organization_id || null;

    // Duplicate check
    const organizationData = await Organization.findOne({
      $or: [
        { organizationId: orgId },
        { organization_id: orgId },
        { _id: mongoose.Types.ObjectId.isValid(orgId) ? orgId : undefined }
      ].filter(Boolean)
    }).exec();

    if (organizationData && organizationData.allowDuplicateLeads === false) {
      const existing = await Contact.findOne({
        $or: [
          { organizationId: orgId },
          { organization_id: orgId }
        ],
        $and: [
          {
            $or: [
              { contactNumber: phoneResult.contactNumber },
              { alternateNo: phoneResult.contactNumber },
              { contact_number: phoneResult.contactNumber },
              { alternate_no: phoneResult.contactNumber }
            ]
          }
        ]
      }).exec();

      if (existing) {
        await logApiTransaction(reqData, tokenData, "FAILED", "Duplicate Lead");
        // Send success message to simulate obfuscation/avoid enumeration
        return res.status(200).json({ status: "success", success: true, message: "Thank You! We will get back to you soon" });
      }
    }

    // Owner Resolution
    let uid = '';
    let ownerUser = null;
    const ownerEmail = reqData.ownerEmail || reqData.owner_email || reqData.contact_owner_email;
    if (ownerEmail) {
      const userDoc = await User.findOne({
        $or: [
          { organizationId: orgId },
          { organization_id: orgId }
        ],
        email: String(ownerEmail).toLowerCase()
      }).exec();
      if (userDoc) {
        uid = String(userDoc._id);
        ownerUser = userDoc;
      } else {
        await logApiTransaction(reqData, tokenData, "FAILED", "Owner Not Found!");
        return res.status(200).json({ status: "error", success: false, message: "Owner Not Found!" });
      }
    }

    const associateContact = reqData.associateContact || reqData.associate_contact;
    if (!uid && associateContact) {
      const userDoc = await User.findOne({
        $or: [
          { organizationId: orgId },
          { organization_id: orgId }
        ],
        $or: [
          { contactNumber: associateContact },
          { contact_number: associateContact },
          { phone: associateContact }
        ]
      }).exec();
      if (userDoc) {
        uid = String(userDoc._id);
        reqData.ownerEmail = userDoc.email;
        ownerUser = userDoc;
      }
    }

    const emailVal = reqData.emailId || reqData.email_id || reqData.email || reqData['your-email'] || reqData.your_email || '';
    const projectVal = reqData.projectName || reqData.project_name || reqData.project || reqData.projectId || reqData.project_id || reqData.subject || reqData['your-subject'] || reqData.your_subject || reqData.message || '';
    const locationVal = reqData.location || reqData.city || reqData.locationName || '';
    const budgetVal = reqData.budget || reqData.budgetId || reqData.budget_id || '';
    const propertyTypeVal = reqData.propertyType || reqData.property_type || reqData.propertyTypeId || '';
    let sourceVal = reqData.source || tokenData.source || 'Website';
    let campaignVal = reqData.campaign || reqData.campaignName || sourceVal;

    // Dynamically canonicalize incoming source name against organization's registered resources
    try {
      const resourceItemModel = require('../models/resourceItemModel');
      const orgSources = await resourceItemModel.list({
        organizationId: orgId,
        resource_key: 'resourceLeadSources'
      });
      const registeredSources = (orgSources || [])
        .map(s => s.leadSource || s.source || s.name || s.value || '')
        .filter(Boolean);

      const { matchSources } = require('../services/sourceMatcher');
      for (const reg of registeredSources) {
        if (matchSources(sourceVal, reg)) {
          sourceVal = reg;
          break;
        }
      }
    } catch (err) {
      // Fallback to raw sourceVal
    }

    // Lead distribution & round-robin rule evaluation
    if (!uid) {
      const { assignLeadByRules } = require('../services/leadDistributionService');
      const assignment = await assignLeadByRules({
        organizationId: orgId,
        industryId: tokenData.industryId || tokenData.industry_id,
        workspaceId: tokenData.workspaceId || tokenData.workspace_id,
        source: sourceVal,
        project: projectVal,
        location: locationVal,
        budget: budgetVal,
        propertyType: propertyTypeVal
      });

      if (assignment.uid || assignment.ownerEmail) {
        uid = assignment.uid;
        reqData.ownerEmail = assignment.ownerEmail;
        if (assignment.uid) {
          ownerUser = await User.findById(assignment.uid).lean().exec();
        }
      }
    }

    // Create the Contact in MongoDB dynamically (spreading reqData)
    const contactPayload = {
      ...reqData,
      customerName,
      customer_name: customerName,
      contactNumber: phoneResult.contactNumber,
      contact_number: phoneResult.contactNumber,
      countryCode: phoneResult.countryCode,
      country_code: phoneResult.countryCode,
      emailId: emailVal,
      email_id: emailVal,
      email: emailVal,
      projectName: projectVal,
      project_name: projectVal,
      location: locationVal,
      budget: budgetVal,
      propertyType: propertyTypeVal,
      property_type: propertyTypeVal,
      source: sourceVal,
      campaign: campaignVal,
      organizationId: orgId,
      organization_id: orgId,
      industryId: tokenData.industryId || tokenData.industry_id || (ownerUser ? (ownerUser.industryId || ownerUser.industry_id) : null),
      workspaceId: tokenData.workspaceId || tokenData.workspace_id || (ownerUser ? (ownerUser.workspaceId || ownerUser.workspace_id) : null),
      uid: uid || null,
      contactOwnerEmail: reqData.ownerEmail || (ownerUser ? ownerUser.email : ''),
      contact_owner_email: reqData.ownerEmail || (ownerUser ? ownerUser.email : ''),
      assignedTo: reqData.ownerEmail || (ownerUser ? ownerUser.email : ''),
      assigned_to: reqData.ownerEmail || (ownerUser ? ownerUser.email : ''),
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

    return res.status(200).json({ status: "success", success: true, message: "Thank You! We will get back to you soon" });
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

  const verifyToken = process.env.FB_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      console.warn('Webhook verification token mismatch:', token);
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
        const fbTokens = await ApiToken.find({ source: { $in: ['Facebook', 'facebook', 'FACEBOOK'] } }).exec();
        const tokenDoc = fbTokens.find(t => {
          const pIds = (t.page_id || t.pageId || []).map(String);
          const fbPages = (t.facebook_pages || t.facebookPages || []).map(p => String(p.id));
          return pIds.includes(String(pageId)) || fbPages.includes(String(pageId));
        });

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
        const orgId = tokenDoc.organization_id || tokenDoc.organizationId;
        const organizationData = await Organization.findOne({
          $or: [{ organization_id: orgId }, { organizationId: orgId }]
        }).exec();

        if (organizationData && organizationData.allowDuplicateLeads === false) {
          const existing = await Contact.findOne({
            $and: [
              {
                $or: [
                  { organization_id: orgId },
                  { organizationId: orgId }
                ]
              },
              {
                $or: [
                  { contactNumber: phoneResult.contactNumber },
                  { contact_number: phoneResult.contactNumber },
                  { alternateNo: phoneResult.contactNumber }
                ]
              }
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

        // 6. Resolve Owner User via Lead Distribution Rules
        let uid = '';
        let ownerUser = null;

        const { assignLeadByRules } = require('../services/leadDistributionService');
        const assignment = await assignLeadByRules({
          organizationId: orgId,
          industryId: tokenDoc.industry_id || tokenDoc.industryId,
          workspaceId: tokenDoc.workspace_id || tokenDoc.workspaceId,
          source: 'Facebook Ads',
          project: projectId,
          location: cityField || locationId,
          budget: budgetId,
          propertyType: ''
        });

        if (assignment.uid) {
          uid = assignment.uid;
          ownerUser = await User.findById(assignment.uid).lean().exec();
        }

        const contactPayload = {
          customerName: nameField || 'Facebook Lead',
          customer_name: nameField || 'Facebook Lead',
          contactNumber: phoneResult.contactNumber,
          contact_number: phoneResult.contactNumber,
          countryCode: phoneResult.countryCode,
          country_code: phoneResult.countryCode,
          emailId: emailField,
          email_id: emailField,
          email: emailField,
          location: cityField || locationId || '',
          projectName: projectId,
          project_name: projectId,
          budgetId: budgetId,
          budget_id: budgetId,
          source: 'Facebook Ads',
          leadType: 'Leads',
          lead_type: 'Leads',
          stage: 'FRESH',
          organizationId: orgId,
          organization_id: orgId,
          industryId: tokenDoc.industry_id || tokenDoc.industryId || (ownerUser ? (ownerUser.industry_id || ownerUser.industryId) : null),
          industry_id: tokenDoc.industry_id || tokenDoc.industryId || (ownerUser ? (ownerUser.industry_id || ownerUser.industryId) : null),
          workspaceId: tokenDoc.workspace_id || tokenDoc.workspaceId || (ownerUser ? (ownerUser.workspace_id || ownerUser.workspaceId) : null),
          workspace_id: tokenDoc.workspace_id || tokenDoc.workspaceId || (ownerUser ? (ownerUser.workspace_id || ownerUser.workspaceId) : null),
          uid: uid || null,
          contactOwnerEmail: ownerUser ? ownerUser.email : '',
          contact_owner_email: ownerUser ? ownerUser.email : '',
          assignedTo: ownerUser ? ownerUser.email : '',
          assigned_to: ownerUser ? ownerUser.email : '',
          ad_id: leadgenValue.ad_id || '',
          campaign: leadgenValue.campaign_id || '',
          adset: leadgenValue.adgroup_id || '',
        };

        const normalizedPayload = fillExtraFields(contactPayload, ownerUser);
        const createdContact = await Contact.create(normalizedPayload);

        try {
          const { sendNotification } = require('../services/whatsappService');
          sendNotification({
            organizationId: orgId,
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
            organizationId: orgId,
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
