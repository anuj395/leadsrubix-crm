const mongoose = require('mongoose');
const contactModel = require('../models/contactModel');
const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');
const permissionModel = require('../models/screenPermissionModel');
const userModel = require('../models/userModel');
const industryModel = require('../models/industryModel');
const roleModel = require('../models/roleModel');
const { getVisibleUserIds } = require('./userHierarchyService');

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

function fillExtraFields(aligned, user) {
  const now = new Date();
  
  if (user) {
    aligned.uid = aligned.uid || user.uid || '';
    aligned.createdBy = aligned.createdBy || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    aligned.organizationId = aligned.organizationId || user.organizationId;
  }
  
  const mainPhone = aligned.contactNumber || '';
  const parsedMain = parsePhoneNumber(mainPhone, aligned.countryCode || '+91');
  aligned.contactNumber = parsedMain.contactNumber;
  aligned.countryCode = parsedMain.countryCode;

  aligned.alternateNo = aligned.alternateNo || '';
  aligned.location = aligned.location || '';
  aligned.projectName = aligned.projectName || '';
  aligned.propertyType = aligned.propertyType || '';
  aligned.propertyStage = aligned.propertyStage || '';
  aligned.budget = aligned.budget || '';
  aligned.propertySubType = aligned.propertySubType || '';
  aligned.source = aligned.source || '';
  aligned.contactOwnerEmail = aligned.contactOwnerEmail || '';
  aligned.adset = aligned.adset || '';
  aligned.campaign = aligned.campaign || '';
  aligned.notes = aligned.notes || '';
  
  aligned.stage = aligned.stage || 'FRESH';
  aligned.associateStatus = aligned.associateStatus !== false;
  aligned.sourceStatus = aligned.sourceStatus !== false;
  aligned.transferStatus = aligned.transferStatus === true;
  
  aligned.customerImage = aligned.customerImage || '';
  aligned.isButtonCalled = aligned.isButtonCalled === true;
  aligned.feedbackTime = aligned.feedbackTime || null;
  aligned.callResponseTime = aligned.callResponseTime || null;
  aligned.nextFollowUpDateTime = aligned.nextFollowUpDateTime || null;
  aligned.nextFollowUpType = aligned.nextFollowUpType || '';
  
  aligned.leadAssignTime = aligned.leadAssignTime || now;
  aligned.stageChangeAt = aligned.stageChangeAt || now;
  aligned.modifiedAt = aligned.modifiedAt || now;

  aligned.lostReason = aligned.lostReason || '';
  aligned.notIntReason = aligned.notIntReason || '';
  aligned.otherLostReason = aligned.otherLostReason || '';
  aligned.otherNotIntReason = aligned.otherNotIntReason || '';
  aligned.callBackReason = aligned.callBackReason || '';
  
  aligned.previousOwner = aligned.previousOwner || '';
  aligned.previousOwner1 = aligned.previousOwner1 || '';
  aligned.previousOwner2 = aligned.previousOwner2 || '';
  
  aligned.transferBy1 = aligned.transferBy1 || '';
  aligned.transferBy2 = aligned.transferBy2 || '';
  aligned.previousStage1 = aligned.previousStage1 || '';
  aligned.previousStage2 = aligned.previousStage2 || '';
  aligned.transferReason = aligned.transferReason || '';
  aligned.inventoryType = aligned.inventoryType || '';
  
  aligned.latitude = aligned.latitude !== undefined ? aligned.latitude : null;
  aligned.longitude = aligned.longitude !== undefined ? aligned.longitude : null;

  // Clean up any dynamic config-smuggled fields we don't want
  delete aligned.field_one;
  delete aligned.field_two;
  delete aligned.field_three;
  delete aligned.field_four;
  delete aligned.field_five;
  delete aligned.field_six;
  
  return aligned;
}

/**
 * List contacts visible to the authenticated user.
 *   - SuperAdmin → sees all contacts across all industries.
 *   - Everyone else → scoped to their own industry only (multi-tenant isolation).
 */
exports.listForUser = async ({ authedUser, limit = 200 }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }
  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';
  const filter = isSuperAdmin ? {} : { organizationId: user.organizationId };

  const visibleIds = await getVisibleUserIds({
    id: String(user._id),
    role,
    industryId: user.industryId,
  });
  if (visibleIds !== null) {
    const users = await userModel.User.find({ _id: { $in: visibleIds } }).select('uid email').lean().exec();
    const visibleUids = users.map(u => u.uid).filter(Boolean);
    const visibleEmails = users.map(u => u.email).filter(Boolean);
    filter.$or = [
      { createdBy: { $in: visibleIds } },
      { uid: { $in: visibleUids } },
      { contactOwnerEmail: { $in: visibleEmails } }
    ];
  }
  const items = await contactModel.list({ filter, limit });
  await enrichOrganizationNames(items);
  return items;
};

async function enrichOrganizationNames(items) {
  if (!items || items.length === 0) return;
  const Organization = mongoose.model('Organization');
  const orgKeys = [...new Set(items.map(item => item.organizationId).filter(Boolean))];
  if (orgKeys.length === 0) return;

  const orgs = await Organization.find({
    $or: [
      { organizationId: { $in: orgKeys } },
      { _id: { $in: orgKeys.filter(k => mongoose.Types.ObjectId.isValid(k)) } }
    ]
  }).lean().exec();

  const orgMap = {};
  orgs.forEach(o => {
    const name = o.organizationName || o.name || '';
    orgMap[String(o.organizationId)] = name;
    orgMap[String(o._id)] = name;
  });

  items.forEach(item => {
    if (item.organizationId) {
      const lookup = String(item.organizationId);
      if (orgMap[lookup]) {
        item.organizationId = orgMap[lookup];
      }
    }
  });
}

/**
 * Create a contact, validating the payload against the dynamic form config
 * the caller is allowed to see. Required fields must be present.
 */
exports.createForUser = async ({ payload, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }

  const screen = await screenModel.findByKey('contacts');
  if (!screen || !screen.isActive) {
    const err = new Error('Contacts screen is not configured'); err.status = 404; throw err;
  }

  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';

  let resolvedIndustryId = user.industryId;
  if (isSuperAdmin) {
    const orgId = payload?.organizationId || payload?.fields?.organizationId || payload?.organization_id;
    if (orgId) {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findOne({
        $or: [
          { organizationId: orgId },
          { _id: mongoose.Types.ObjectId.isValid(orgId) ? orgId : null }
        ]
      }).lean().exec();
      if (org && org.industryId) {
        resolvedIndustryId = org.industryId;
      }
    }
  }

  const industry = await industryModel.findByCode(resolvedIndustryId);
  if (!industry) {
    const err = new Error(`Industry "${resolvedIndustryId}" not found`); err.status = 400; throw err;
  }

  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
  let allowedFormFields;
  if (isSuperAdmin) {
    allowedFormFields = fields.filter((f) => f.is_form_visible);
  } else {
    const role = await roleModel.findByIndustryAndKey(industry._id, user.role || authedUser.role);
    if (!role) {
      const err = new Error(`Role "${user.role}" not found for this industry`); err.status = 400; throw err;
    }
    const perms = await permissionModel.list({
      screen_id: screen._id,
      roleId: role._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedIds = new Set(perms.map((p) => String(p.field_id)));
    allowedFormFields = fields.filter(
      (f) => f.is_form_visible && allowedIds.has(String(f._id)),
    );
  }

  const data = payload && typeof payload === 'object' ? { ...payload } : {};
  if (!isSuperAdmin) {
    data.organizationId = user.organizationId;
  }
  if (data.customerName === undefined) {
    if (data.customer_name !== undefined) {
      data.customerName = data.customer_name;
    } else if (data.name !== undefined) {
      data.customerName = data.name;
    }
  }

  const cleaned = {};
  for (const f of allowedFormFields) {
    const k = f.field_key;
    if (data[k] !== undefined) {
      cleaned[k] = data[k];
    }
  }

  // Required-field validation
  const missing = allowedFormFields
    .filter((f) => f.is_required)
    .map((f) => f.field_key)
    .filter((k) => cleaned[k] === undefined || cleaned[k] === null || cleaned[k] === '');
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const targetOrgId = isSuperAdmin ? (cleaned.organizationId || payload.organizationId || payload.fields?.organizationId || data.organizationId) : user.organizationId;

  // Check duplicates on contact number & alternate number
  if (cleaned.contactNumber) {
    const parsedMain = parsePhoneNumber(cleaned.contactNumber, cleaned.countryCode || '+91');
    const parsedAlt = cleaned.alternateNo ? parsePhoneNumber(cleaned.alternateNo, cleaned.countryCode || '+91') : null;
    
    const orConditions = [];
    if (parsedMain.contactNumber) {
      orConditions.push({ contactNumber: parsedMain.contactNumber });
      orConditions.push({ alternateNo: parsedMain.contactNumber });
    }
    if (parsedAlt && parsedAlt.contactNumber) {
      orConditions.push({ contactNumber: parsedAlt.contactNumber });
      orConditions.push({ alternateNo: parsedAlt.contactNumber });
    }
    
    if (orConditions.length > 0) {
      const Contact = mongoose.model('Contact');
      const duplicate = await Contact.findOne({
        organizationId: targetOrgId,
        $or: orConditions
      }).lean().exec();
      
      if (duplicate) {
        const err = new Error("Contact number or Alternate number already exists on another lead");
        err.status = 400;
        throw err;
      }
    }
  }

  const docPayload = fillExtraFields(
    {
      ...cleaned,
      organizationId: targetOrgId,
    },
    user
  );

  const created = await contactModel.create(docPayload);
  await enrichOrganizationNames([created]);
  return created;
};

exports.updateForUser = async ({ id, payload, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }

  const existing = await contactModel.findById(id);
  if (!existing) {
    const err = new Error('Contact not found'); err.status = 404; throw err;
  }

  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  if (!isSuperAdmin && String(existing.organizationId) !== String(user.organizationId)) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  const screen = await screenModel.findByKey('contacts');
  if (!screen || !screen.isActive) {
    const err = new Error('Contacts screen is not configured'); err.status = 404; throw err;
  }

  const industry = await industryModel.findByCode(user.industryId);
  if (!industry && !isSuperAdmin) {
    const err = new Error(`Industry "${user.industryId}" not found`); err.status = 400; throw err;
  }

  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
  let allowedFormFields;
  if (isSuperAdmin) {
    allowedFormFields = fields.filter((f) => f.is_form_visible);
  } else {
    const roleDoc = await roleModel.findByIndustryAndKey(industry._id, role);
    if (!roleDoc) {
      const err = new Error(`Role "${role}" not found for this industry`); err.status = 400; throw err;
    }
    const perms = await permissionModel.list({
      screen_id: screen._id,
      roleId: roleDoc._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedIds = new Set(perms.map((p) => String(p.field_id)));
    allowedFormFields = fields.filter(
      (f) => f.is_form_visible && allowedIds.has(String(f._id)),
    );
  }

  const data = payload && typeof payload === 'object' ? { ...payload } : {};
  if (data.customerName === undefined) {
    if (data.customer_name !== undefined) {
      data.customerName = data.customer_name;
    } else if (data.name !== undefined) {
      data.customerName = data.name;
    }
  }

  const cleaned = {};
  for (const f of allowedFormFields) {
    const k = f.field_key;
    if (data[k] !== undefined) {
      cleaned[k] = data[k];
    }
  }

  // Permit system and metadata updates
  const systemFields = ['stage', 'latitude', 'longitude', 'modifiedAt', 'stageChangeAt', 'leadAssignTime', 'contactOwnerEmail', 'uid'];
  for (const k of systemFields) {
    if (data[k] !== undefined) {
      cleaned[k] = data[k];
    }
  }

  // Required-field validation on update if the field is present
  const presentKeys = new Set(Object.keys(cleaned));
  const missing = allowedFormFields
    .filter((f) => f.is_required)
    .map((f) => f.field_key)
    .filter((k) => presentKeys.has(k) && (cleaned[k] === undefined || cleaned[k] === null || cleaned[k] === ''));
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  cleaned.modifiedAt = new Date();
  
  delete cleaned.field_one;
  delete cleaned.field_two;
  delete cleaned.field_three;
  delete cleaned.field_four;
  delete cleaned.field_five;
  delete cleaned.field_six;

  const updated = await contactModel.findByIdAndUpdate(id, { $set: cleaned }, { new: true });
  if (updated) {
    await enrichOrganizationNames([updated]);
  }
  return updated;
};

exports.deleteForUser = async ({ id, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }

  const existing = await contactModel.findById(id);
  if (!existing) {
    const err = new Error('Contact not found'); err.status = 404; throw err;
  }

  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  if (!isSuperAdmin && String(existing.organizationId) !== String(user.organizationId)) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  await contactModel.remove(id);
};

exports.fillExtraFields = fillExtraFields;
