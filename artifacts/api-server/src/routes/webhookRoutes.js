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
      organizationId: tokenData.organizationId,
      organization_id: tokenData.organizationId,
      uid: uid || null,
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
    };

    const normalizedPayload = fillExtraFields(contactPayload, ownerUser);

    const doc = await Contact.create(normalizedPayload);

    await logApiTransaction(reqData, tokenData, "SUCCESS", "", String(doc._id));

    return res.status(200).json({ message: "Thank You! We will get back to you soon" });
  } catch (err) {
    if (tokenData) {
      await logApiTransaction(reqData, tokenData, "FAILED", err.message || "Internal Error");
    }
    next(err);
  }
});

module.exports = router;
