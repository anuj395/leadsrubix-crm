const express = require('express');
const mongoose = require('mongoose');
const { fillExtraFields } = require('../services/contactService');

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

// Convert seconds to HH:MM:SS format
function secToTime(duration) {
  const hrs = ~~(duration / 3600);
  const mins = ~~((duration % 3600) / 60);
  const secs = duration % 60;
  let ret = "";
  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }
  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

router.post('/createContacts', async (req, res, next) => {
  try {
    const ApiToken = mongoose.model('ApiToken');
    const Organization = mongoose.model('Organization');
    const Contact = mongoose.model('Contact');
    const User = mongoose.model('User');

    let reqData = req.body || {};
    const token = reqData.token || req.query.token;

    if (!token) {
      return res.status(200).json({ message: "Token Not Found" });
    }

    const tokenData = await ApiToken.findOne({ api_key: token }).exec();
    if (!tokenData) {
      return res.status(200).json({ message: "Invalid Token" });
    }

    if (tokenData.status === "INACTIVE") {
      return res.status(200).json({ message: "Token is Inactive" });
    }

    const contactNo = reqData.contactNumber || reqData.contact_no;
    if (!contactNo) {
      return res.status(200).json({ message: "Mobile Empty" });
    }

    const customerName = reqData.customerName || reqData.customer_name || reqData.name;
    if (!customerName) {
      return res.status(200).json({ message: "Invalid Customer Name" });
    }

    const propertyType = reqData.propertyType || reqData.property_type;
    if (propertyType !== undefined && typeof propertyType !== "string") {
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
        // Send success message to simulate obfuscation/avoid enumeration
        return res.status(200).json({ message: "Thank You! We will get back to you soon" });
      }
    }

    // Owner Resolution
    let uid = '';
    let ownerUser = null;
    const ownerEmail = reqData.ownerEmail || reqData.owner_email;
    if (ownerEmail) {
      const userDoc = await User.findOne({
        organizationId: tokenData.organizationId,
        email: String(ownerEmail).toLowerCase()
      }).exec();
      if (userDoc) {
        uid = String(userDoc._id);
        ownerUser = userDoc;
      } else {
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
      // In the new project, we assign to organization primary lead manager or falls back
      // Let's search for an admin user of the organization
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

    // Create the Contact in MongoDB
    const contactPayload = {
      customerName,
      contactNumber: phoneResult.contactNumber,
      emailId: reqData.email || reqData.emailId || reqData.email_id || "",
      alternateNo: reqData.alternateNo || reqData.alternate_no ? String(reqData.alternateNo || reqData.alternate_no) : "",
      associateStatus: true,
      budget: reqData.budget ? String(reqData.budget) : "",
      countryCode: phoneResult.countryCode,
      createdBy: reqData.createdBy || reqData.created_by ? String(reqData.createdBy || reqData.created_by) : "API Lead Webhook",
      customerImage: "",
      location: reqData.location ? String(reqData.location) : "",
      leadType: "Leads",
      projectName: reqData.project || reqData.projectName || reqData.project_name || "",
      propertyStage: reqData.propertyStage || reqData.property_stage || "",
      propertyType: propertyType || "",
      propertySubType: reqData.propertySubType || reqData.property_sub_type || "",
      source: tokenData.source || "API Integration",
      sourceStatus: true,
      stage: reqData.stage ? String(reqData.stage).toUpperCase() : "FRESH",
      transferStatus: false,
      uid: uid || null,
      organizationId: tokenData.organizationId,
      contactOwnerEmail: (reqData.ownerEmail || reqData.owner_email) ? String(reqData.ownerEmail || reqData.owner_email).toLowerCase() : "",
      campaign: reqData.campaign ? String(reqData.campaign) : "",
      adset: reqData.adset ? String(reqData.adset) : "",
    };

    const normalizedPayload = fillExtraFields(contactPayload, ownerUser);

    const doc = await Contact.create(normalizedPayload);

    return res.status(200).json({ message: "Thank You! We will get back to you soon" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
