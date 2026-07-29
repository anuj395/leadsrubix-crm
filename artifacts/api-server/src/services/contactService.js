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
    aligned.uid = aligned.uid || user.uid || String(user._id);
    aligned.createdBy = aligned.createdBy || String(user._id);
    aligned.contactOwnerEmail = aligned.contactOwnerEmail || user.email || '';
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
  aligned.leadType = aligned.leadType || 'Leads';
  aligned.contactOwnerEmail = aligned.contactOwnerEmail || (user ? user.email : '');
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
  const filter = isSuperAdmin ? {} : { organization_id: user.organizationId };

  const visibleIds = await getVisibleUserIds({
    id: String(user._id),
    role,
    industryId: user.industryId,
  });
  if (visibleIds !== null) {
    const users = await userModel.User.find({ _id: { $in: visibleIds } }).select('uid email firstName lastName').lean().exec();
    const visibleUids = users.map(u => u.uid).filter(Boolean);
    const visibleEmails = users.map(u => u.email).filter(Boolean);
    const visibleNames = users.map(u => `${u.firstName || ''} ${u.lastName || ''}`.trim()).filter(Boolean);

    filter.$or = [
      { createdBy: { $in: [...visibleIds, ...visibleNames, user.email, String(user._id)] } },
      { uid: { $in: [...visibleUids, String(user._id), user.uid].filter(Boolean) } },
      { contactOwnerEmail: { $in: [...visibleEmails, user.email].filter(Boolean) } },
      { contactOwnerEmail: '' },
      { contactOwnerEmail: null },
      { contactOwnerEmail: { $exists: false } }
    ];
  }
  const items = await contactModel.list({ filter, limit });
  await enrichOrganizationNames(items);
  return items;
};

async function enrichOrganizationNames(items) {
  if (!items || items.length === 0) return;
  const Organization = mongoose.model('Organization');
  const orgKeys = [...new Set(items.map(item => item.organization_id || item.organizationId).filter(Boolean))];
  if (orgKeys.length === 0) return;

  const orgs = await Organization.find({
    $or: [
      { organization_id: { $in: orgKeys } },
      { _id: { $in: orgKeys.filter(k => mongoose.Types.ObjectId.isValid(k)) } }
    ]
  }).lean().exec();

  const orgMap = {};
  orgs.forEach(o => {
    const name = o.organization_name || o.organizationName || o.name || '';
    orgMap[String(o.organization_id || o.organizationId)] = name;
    orgMap[String(o._id)] = name;
  });

  items.forEach(item => {
    const orgIdVal = item.organization_id || item.organizationId;
    if (orgIdVal) {
      const lookup = String(orgIdVal);
      if (orgMap[lookup]) {
        item.organization_id = orgMap[lookup];
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
          { organization_id: orgId },
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

  const fields = await fieldModel.list({ screenId: screen._id, activeOnly: true });
  let allowedFormFields;
  if (isSuperAdmin) {
    allowedFormFields = fields.filter((f) => f.is_form_visible);
  } else {
    const role = await roleModel.findByIndustryAndKey(industry._id, user.role || authedUser.role);
    if (!role) {
      const err = new Error(`Role "${user.role}" not found for this industry`); err.status = 400; throw err;
    }
    const perms = await permissionModel.list({
      screenId: screen._id,
      roleId: role._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedIds = new Set(perms.map((p) => String(p.fieldId)));
    allowedFormFields = fields.filter(
      (f) => f.is_form_visible && allowedIds.has(String(f._id)),
    );
  }

  const data = payload && typeof payload === 'object' ? { ...payload } : {};
  if (!isSuperAdmin) {
    data.organization_id = user.organizationId;
    data.organizationId = user.organizationId;
  }

  // Standard camelCase property defaults
  data.customerName = data.customerName || '';
  data.contactNumber = data.contactNumber || '';
  data.alternateNo = data.alternateNo || '';
  data.emailId = data.emailId || data.email || '';
  data.email = data.email || data.emailId || '';
  data.contactOwnerEmail = data.contactOwnerEmail || user.email || '';
  data.leadType = data.leadType || 'Leads';
  data.propertyType = data.propertyType || '';
  data.propertyStage = data.propertyStage || '';
  data.propertySubType = data.propertySubType || '';
  data.projectName = data.projectName || '';
  data.countryCode = data.countryCode || '+91';

  const cleaned = {
    customerName: data.customerName,
    contactNumber: data.contactNumber,
    contactOwnerEmail: data.contactOwnerEmail || user.email,
    countryCode: data.countryCode || '+91',
    alternateNo: data.alternateNo || '',
    leadType: data.leadType || 'Leads',
    source: data.source || data['Source'] || 'Import',
    stage: data.stage || 'FRESH',
    location: data.location || data['Location'] || '',
    projectName: data.projectName || '',
    propertyType: data.propertyType || '',
    propertyStage: data.propertyStage || '',
    propertySubType: data.propertySubType || '',
    budget: data.budget || data['Budget'] || '',
    notes: data.notes || data['Notes'] || '',
  };

  for (const f of allowedFormFields) {
    const k = f.field_key;
    const camelK = (k || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (data[camelK] !== undefined) {
      cleaned[camelK] = data[camelK];
    } else if (data[k] !== undefined) {
      cleaned[camelK] = data[k];
    }
  }

  // Required-field validation
  const missing = allowedFormFields
    .filter((f) => f.is_required || f.isRequired)
    .map((f) => f.field_key)
    .filter((k) => {
      const camelK = (k || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      return cleaned[camelK] === undefined || cleaned[camelK] === null || cleaned[camelK] === '';
    });
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const targetOrgId = isSuperAdmin ? (cleaned.organizationId || payload.organizationId || payload.fields?.organizationId || data.organizationId || data.organization_id || cleaned.organization_id) : user.organizationId;

  const Organization = mongoose.model('Organization');
  const org = await Organization.findOne({
    $or: [
      { organization_id: targetOrgId },
      ...(mongoose.Types.ObjectId.isValid(targetOrgId) ? [{ _id: targetOrgId }] : [])
    ]
  }).lean().exec();

  const allowDuplicates = org ? org.allowDuplicateLeads === true : false;

  if (!allowDuplicates) {
    // Check duplicates on contact number & alternate number
    if (cleaned.contactNumber || cleaned.alternateNo) {
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
          organization_id: targetOrgId,
          $or: orConditions
        }).lean().exec();
        
        if (duplicate) {
          const err = new Error("Contact Phone Number Already Exists!!");
          err.status = 400;
          throw err;
        }
      }
    }

    if (cleaned.email) {
      const cleanEmail = String(cleaned.email).trim().toLowerCase();
      if (cleanEmail) {
        const Contact = mongoose.model('Contact');
        const duplicateEmail = await Contact.findOne({
          organization_id: targetOrgId,
          email: cleanEmail
        }).lean().exec();
        
        if (duplicateEmail) {
          const err = new Error("Contact Email ID Already Exists!!");
          err.status = 400;
          throw err;
        }
      }
    }
  }

  const docPayload = fillExtraFields(
    {
      ...cleaned,
      organization_id: targetOrgId,
    },
    user
  );

  const created = await contactModel.create(docPayload);
  await enrichOrganizationNames([created]);

  try {
    const { sendNotification } = require('./whatsappService');
    sendNotification({
      organizationId: targetOrgId,
      contact: created,
      eventType: 'incoming'
    }).catch(err => console.error('[WhatsApp] Incoming notification dispatch error:', err));
  } catch (e) {
    console.error('[WhatsApp] Failed to initiate incoming notification:', e);
  }

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

  if (!isSuperAdmin && String(existing.organization_id || existing.organizationId) !== String(user.organizationId || user.organization_id)) {
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

  const fields = await fieldModel.list({ screenId: screen._id, activeOnly: true });
  let allowedFormFields;
  if (isSuperAdmin) {
    allowedFormFields = fields.filter((f) => f.is_form_visible);
  } else {
    const roleDoc = await roleModel.findByIndustryAndKey(industry._id, role);
    if (!roleDoc) {
      const err = new Error(`Role "${role}" not found for this industry`); err.status = 400; throw err;
    }
    const perms = await permissionModel.list({
      screenId: screen._id,
      roleId: roleDoc._id,
      industryId: industry._id,
      enabledOnly: true,
    });
    const allowedIds = new Set(perms.map((p) => String(p.fieldId)));
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
    const camelK = (k || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (data[camelK] !== undefined) {
      cleaned[camelK] = data[camelK];
    } else if (data[k] !== undefined) {
      cleaned[camelK] = data[k];
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

  const targetOrgId = isSuperAdmin ? (cleaned.organizationId || existing.organizationId || cleaned.organization_id || existing.organization_id) : user.organizationId;

  const Organization = mongoose.model('Organization');
  const org = await Organization.findOne({
    $or: [
      { organization_id: targetOrgId },
      ...(mongoose.Types.ObjectId.isValid(targetOrgId) ? [{ _id: targetOrgId }] : [])
    ]
  }).lean().exec();

  const allowDuplicates = org ? org.allowDuplicateLeads === true : false;

  if (!allowDuplicates) {
    if (cleaned.contactNumber !== undefined || cleaned.alternateNo !== undefined) {
      const mainPhone = cleaned.contactNumber !== undefined ? cleaned.contactNumber : existing.contactNumber;
      const altPhone = cleaned.alternateNo !== undefined ? cleaned.alternateNo : existing.alternateNo;
      const countryCode = cleaned.countryCode || existing.countryCode || '+91';

      const parsedMain = parsePhoneNumber(mainPhone, countryCode);
      const parsedAlt = altPhone ? parsePhoneNumber(altPhone, countryCode) : null;
      
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
          _id: { $ne: id },
          organization_id: targetOrgId,
          $or: orConditions
        }).lean().exec();
        
        if (duplicate) {
          const err = new Error("Contact Phone Number Already Exists!!");
          err.status = 400;
          throw err;
        }
      }
    }

    if (cleaned.email !== undefined && cleaned.email !== null) {
      const cleanEmail = String(cleaned.email).trim().toLowerCase();
      if (cleanEmail) {
        const Contact = mongoose.model('Contact');
        const duplicateEmail = await Contact.findOne({
          _id: { $ne: id },
          organization_id: targetOrgId,
          email: cleanEmail
        }).lean().exec();
        
        if (duplicateEmail) {
          const err = new Error("Contact Email ID Already Exists!!");
          err.status = 400;
          throw err;
        }
      }
    }
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

exports.transferLeads = async ({ ids, owner, reason, leadType, options = {}, authedUser }) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    const err = new Error('No contact IDs specified'); err.status = 400; throw err;
  }

  if (ids.length > 250) {
    const err = new Error('Records More than 250 are not allowed'); err.status = 400; throw err;
  }

  if (!owner || !owner.email || (!owner.uid && !owner.id)) {
    const err = new Error('Owner Not Found'); err.status = 400; throw err;
  }

  const targetOwnerUid = owner.uid || owner.id;
  const Contact = mongoose.model('Contact');
  const Task = mongoose.model('Task');
  const now = new Date();

  const leads = await Contact.find({ _id: { $in: ids } }).exec();

  for (const lead of leads) {
    const updatePayload = {
      uid: targetOwnerUid,
      contactOwnerEmail: owner.email,
      transferReason: reason,
      transferStatus: true,
      leadType: leadType || lead.leadType || 'Leads',
      modifiedAt: now,
      stageChangeAt: now,
      leadAssignTime: now,
      previousOwner1: lead.previousOwner2 || '',
      previousOwner2: lead.contactOwnerEmail || '',
      transferBy1: lead.transferBy2 || '',
      transferBy2: authedUser?.email || '',
      previousStage1: lead.previousStage2 || '',
      previousStage2: lead.stage || '',
    };

    if (options.fresh === true) {
      updatePayload.stage = 'FRESH';
      updatePayload.nextFollowUpType = '';
      updatePayload.nextFollowUpDateTime = null;
      updatePayload.notIntReason = '';
      updatePayload.lostReason = '';
      updatePayload.otherNotIntReason = '';
      updatePayload.otherLostReason = '';

      if (!options.contactDetails) {
        updatePayload.projectName = '';
        updatePayload.propertyStage = '';
        updatePayload.propertyType = '';
        updatePayload.budget = '';
        updatePayload.location = '';
        updatePayload.propertySubType = '';
        updatePayload.callBackReason = '';
      }
    }

    // Direct update on existing lead
    await Contact.findByIdAndUpdate(lead._id, { $set: updatePayload });

    try {
      const { sendNotification } = require('./whatsappService');
      sendNotification({
        organizationId: lead.organization_id || lead.organizationId,
        contact: { ...lead.toObject(), ...updatePayload },
        eventType: 'transfer'
      }).catch(err => console.error('[WhatsApp] Transfer notification dispatch error:', err));
    } catch (e) {
      console.error('[WhatsApp] Failed to initiate transfer notification:', e);
    }

    // Update existing pending tasks for this lead to new owner if options.task is true
    if (options.task === true) {
      await Task.updateMany(
        { contactId: lead._id, status: 'PENDING' },
        {
          $set: {
            uid: targetOwnerUid,
            createdBy: owner.email,
            contactOwnerEmail: owner.email,
            assignedTo: owner.email,
            organization_id: owner.organizationId || owner.organization_id || lead.organizationId || lead.organization_id,
          }
        }
      );
    }
  }

  return { transferredCount: leads.length };
};

exports.bulkReassignContacts = async ({ ids, contactOwnerEmail, uid, authedUser }) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    const err = new Error('No contact IDs specified'); err.status = 400; throw err;
  }
  const Contact = mongoose.model('Contact');
  
  const leads = await Contact.find({ _id: { $in: ids } }).exec();
  
  const result = await Contact.updateMany(
    { _id: { $in: ids } },
    { $set: { contactOwnerEmail, uid: uid || null, modifiedAt: new Date() } }
  );

  try {
    const { sendNotification } = require('./whatsappService');
    for (const lead of leads) {
      sendNotification({
        organizationId: lead.organization_id || lead.organizationId,
        contact: { ...lead.toObject(), contactOwnerEmail, uid: uid || null },
        eventType: 'transfer'
      }).catch(err => console.error('[WhatsApp] Bulk transfer notification dispatch error:', err));
    }
  } catch (e) {
    console.error('[WhatsApp] Failed to initiate bulk transfer notifications:', e);
  }

  return { modifiedCount: result.modifiedCount };
};

exports.bulkImportContacts = async ({ contacts, fileName = 'contacts_import.csv', authedUser }) => {
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return { imported: 0, errors: [] };
  }
  const ImportLog = require('../models/importLogModel');
  const user = await userModel.findById(authedUser.id);
  const requestId = 'REQ-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  let imported = 0;
  const errors = [];
  const processedRows = [];

  for (let i = 0; i < contacts.length; i++) {
    const row = contacts[i];
    try {
      await exports.createForUser({ payload: row, authedUser });
      imported++;
      processedRows.push({ ...row, import_status: 'SUCCESS' });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      errors.push({ index: i, error: errMsg });
      processedRows.push({ ...row, import_status: 'FAILED', error_message: errMsg });
    }
  }

  if (user?.organizationId || user?.organization_id) {
    // Generate simulated/stored file URLs for file download parity
    const fileUrl = `/api/contacts/import-files/${requestId}_raw.csv`;
    const responseUrl = `/api/contacts/import-files/${requestId}_processed.csv`;

    await ImportLog.create({
      requestId,
      organization_id: user.organizationId || user.organization_id,
      createdBy: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      uid: user.uid || String(user._id),
      status: errors.length === 0 ? 'Completed' : 'Completed with Errors',
      uploadCount: imported,
      failedCount: errors.length,
      fileUrl,
      responseUrl,
    });
  }

  return { imported, errors, requestId };
};

exports.listImportLogs = async ({ authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }
  const ImportLog = require('../models/importLogModel');
  const logs = await ImportLog.find({ organization_id: user.organizationId || user.organization_id })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return logs;
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

  if (!isSuperAdmin && String(existing.organization_id || existing.organizationId) !== String(user.organizationId || user.organization_id)) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }

  // Cascading deletes
  const Task = mongoose.model('Task');
  const CallLog = mongoose.model('CallLog');
  const Booking = mongoose.model('Booking');
  const ResourceItem = mongoose.model('OrganizationResources');

  await Task.deleteMany({
    $or: [
      { contact_id: id },
      { contactId: id }
    ]
  });

  await CallLog.deleteMany({
    $or: [
      { contact_id: id },
      { contactId: id }
    ]
  });

  await Booking.deleteMany({
    $or: [
      { contact_id: id },
      { contactId: id }
    ]
  });

  await ResourceItem.updateMany(
    {},
    {
      $pull: {
        notes: {
          $or: [
            { contact_id: id },
            { contactId: id },
            { contact_id: String(id) },
            { contactId: String(id) }
          ]
        }
      }
    }
  );

  await contactModel.remove(id);
};

exports.fillExtraFields = fillExtraFields;
