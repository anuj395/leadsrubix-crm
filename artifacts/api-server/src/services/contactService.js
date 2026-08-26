const mongoose = require('mongoose');
const contactModel = require('../models/contactModel');
const organizationModel = require('../models/organizationModel');
const taskModel = require('../models/taskModel');
const callLogModel = require('../models/callLogModel');
const accountModel = require('../models/accountModel');
const dealModel = require('../models/dealModel');
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
exports.listForUser = async ({ authedUser, industryIdQuery, organizationIdQuery, limit = 200 }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }
  const role = user.role || authedUser.role;
  const isSuperAdmin = role === 'superAdmin';

  const filter = {};
  if (isSuperAdmin) {
    if (organizationIdQuery && organizationIdQuery !== 'all') {
      filter.$or = [
        { organization_id: organizationIdQuery },
        { organizationId: organizationIdQuery }
      ];
    } else if (industryIdQuery && industryIdQuery !== 'all') {
      const Organization = organizationModel.Organization || mongoose.model('Organization');
      const Industry = industryModel.Industry || mongoose.model('Industry');
      let industryDoc = null;
      if (mongoose.Types.ObjectId.isValid(industryIdQuery)) {
        industryDoc = await Industry.findById(industryIdQuery).lean().exec();
      } else {
        industryDoc = await Industry.findOne({ code: industryIdQuery }).lean().exec();
      }

      if (industryDoc) {
        const indIdStr = String(industryDoc._id);
        const indCode = industryDoc.code;
        const orgDocs = await Organization.find({
          $or: [
            { industryId: indIdStr },
            { industry_id: indIdStr },
            { industryId: indCode },
            { industry_id: indCode },
            { industryCode: indCode },
            { industry_code: indCode }
          ]
        }).lean().exec();
        const orgIds = orgDocs.map(o => o.organizationId || o.organization_id || String(o._id)).filter(Boolean);
        filter.$or = [
          { organization_id: { $in: orgIds } },
          { organizationId: { $in: orgIds } },
          { industry_id: indIdStr },
          { industryId: indIdStr },
          { industry_id: indCode },
          { industryId: indCode }
        ];
      }
    }
  } else {
    filter.$or = [
      { organization_id: user.organizationId || user.organization_id },
      { organizationId: user.organizationId || user.organization_id }
    ];
  }

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
    const ownerEmails = [...visibleEmails, user.email].filter(Boolean);
    const ownerUids = [...visibleIds, ...visibleUids, ...visibleNames, String(user._id), user.uid].filter(Boolean);

    const baseOrgFilter = filter.$or ? { $or: filter.$or } : null;
    delete filter.$or;

    const accessFilter = {
      $or: [
        { createdBy: { $in: ownerUids } },
        { created_by: { $in: ownerUids } },
        { uid: { $in: ownerUids } },
        { contact_owner_id: { $in: ownerUids } },
        { contactOwnerEmail: { $in: ownerEmails } },
        { contact_owner_email: { $in: ownerEmails } },
        { assignedTo: { $in: ownerEmails } },
        { assigned_to: { $in: ownerEmails } }
      ]
    };

    if (baseOrgFilter) {
      filter.$and = [baseOrgFilter, accessFilter];
    } else {
      filter.$or = accessFilter.$or;
    }
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

  // Align incoming snake_case properties to camelCase for compatibility before defaults are set
  if (data.customerName === undefined && data.customer_name !== undefined) data.customerName = data.customer_name;
  if (data.contactNumber === undefined && data.contact_number !== undefined) data.contactNumber = data.contact_number;
  if (data.alternateNo === undefined && data.alternate_no !== undefined) data.alternateNo = data.alternate_no;
  if (data.alternateNo === undefined && data.alternate_number !== undefined) data.alternateNo = data.alternate_number;
  if (data.emailId === undefined && data.email_id !== undefined) data.emailId = data.email_id;
  if (data.contactOwnerEmail === undefined && data.contact_owner_email !== undefined) data.contactOwnerEmail = data.contact_owner_email;
  if (data.leadType === undefined && data.lead_type !== undefined) data.leadType = data.lead_type;
  if (data.propertyType === undefined && data.property_type !== undefined) data.propertyType = data.property_type;
  if (data.propertyStage === undefined && data.property_stage !== undefined) data.propertyStage = data.property_stage;
  if (data.propertySubType === undefined && data.property_sub_type !== undefined) data.propertySubType = data.property_sub_type;
  if (data.projectName === undefined && data.project_name !== undefined) data.projectName = data.project_name;
  if (data.countryCode === undefined && data.country_code !== undefined) data.countryCode = data.country_code;

  // Standard camelCase property defaults
  data.customerName = data.customerName || '';
  data.contactNumber = data.contactNumber || '';
  data.alternateNo = data.alternateNo || '';
  data.emailId = data.emailId || data.email || '';
  data.email = data.email || data.emailId || '';
  data.contactOwnerEmail = data.contactOwnerEmail || '';
  data.leadType = data.leadType || 'Leads';
  data.propertyType = data.propertyType || '';
  data.propertyStage = data.propertyStage || '';
  data.propertySubType = data.propertySubType || '';
  data.projectName = data.projectName || '';
  data.countryCode = data.countryCode || '+91';

  const explicitOwnerEmail = data.contactOwnerEmail || data.contact_owner_email || data.assignedTo || data.assigned_to || data.ownerEmail || data.owner_email || '';
  const explicitUid = data.uid || data.contactOwnerId || data.contact_owner_id || '';

  const cleaned = {
    customerName: data.customerName,
    contactNumber: data.contactNumber,
    contactOwnerEmail: explicitOwnerEmail,
    uid: explicitUid,
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

  const Organization = organizationModel.Organization || mongoose.model('Organization');
  const org = await Organization.findOne({
    $or: [
      { organization_id: targetOrgId },
      { organizationId: targetOrgId },
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
        orConditions.push({ contact_number: parsedMain.contactNumber });
        orConditions.push({ alternateNo: parsedMain.contactNumber });
        orConditions.push({ alternate_no: parsedMain.contactNumber });
      }
      if (parsedAlt && parsedAlt.contactNumber) {
        orConditions.push({ contactNumber: parsedAlt.contactNumber });
        orConditions.push({ contact_number: parsedAlt.contactNumber });
        orConditions.push({ alternateNo: parsedAlt.contactNumber });
        orConditions.push({ alternate_no: parsedAlt.contactNumber });
      }
      
      if (orConditions.length > 0) {
        const Contact = mongoose.model('Contact');
        const duplicate = await Contact.findOne({
          $or: [
            { organization_id: targetOrgId },
            { organizationId: targetOrgId }
          ],
          $and: [
            { $or: orConditions }
          ]
        }).lean().exec();
        
        if (duplicate) {
          const err = new Error("Contact Phone Number Already Exists!!");
          err.status = 400;
          throw err;
        }
      }
    }

    if (cleaned.email || cleaned.emailId) {
      const cleanEmail = String(cleaned.email || cleaned.emailId).trim().toLowerCase();
      if (cleanEmail) {
        const Contact = mongoose.model('Contact');
        const duplicateEmail = await Contact.findOne({
          $or: [
            { organization_id: targetOrgId },
            { organizationId: targetOrgId }
          ],
          $or: [
            { email: cleanEmail },
            { emailId: cleanEmail },
            { email_id: cleanEmail }
          ]
        }).lean().exec();
        
        if (duplicateEmail) {
          const err = new Error("Contact Email ID Already Exists!!");
          err.status = 400;
          throw err;
        }
      }
    }
  }

  // Auto-evaluate lead distribution rules if owner is not explicitly provided in request
  if (!explicitOwnerEmail && !explicitUid) {
    try {
      const { assignLeadByRules } = require('./leadDistributionService');
      const assignment = await assignLeadByRules({
        organizationId: targetOrgId,
        industryId: resolvedIndustryId,
        source: cleaned.source || 'Manual Lead',
        project: cleaned.projectName,
        location: cleaned.location,
        budget: cleaned.budget,
        propertyType: cleaned.propertyType
      });
      if (assignment.ownerEmail || assignment.uid) {
        cleaned.uid = assignment.uid;
        cleaned.contactOwnerId = assignment.uid;
        cleaned.contact_owner_id = assignment.uid;
        cleaned.contactOwnerEmail = assignment.ownerEmail;
        cleaned.contact_owner_email = assignment.ownerEmail;
        cleaned.assignedTo = assignment.ownerEmail;
        cleaned.assigned_to = assignment.ownerEmail;
      }
    } catch (e) {
      console.error('[ContactService] Lead distribution assignment error:', e);
    }
  }

  // Fallback to creator if still unassigned
  if (!cleaned.contactOwnerEmail && user) {
    cleaned.contactOwnerEmail = user.email || '';
    cleaned.contact_owner_email = user.email || '';
    cleaned.assignedTo = user.email || '';
    cleaned.assigned_to = user.email || '';
    cleaned.uid = cleaned.uid || user.uid || String(user._id);
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

  try {
    const { notifyLeadAssignmentOrCreation } = require('./notificationService');
    await notifyLeadAssignmentOrCreation({
      contact: created,
      organizationId: targetOrgId,
      title: 'New Lead Assigned',
      message: `A new lead "${created.customerName || created.name || 'Unnamed'}" has been assigned to you.`,
      type: 'LEAD_ASSIGNED'
    });
  } catch (err) {
    console.error('[Notification] Failed to dispatch in-app assignment notification:', err);
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
  // Copy all provided keys so dynamic and lifecycle fields are never dropped
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      cleaned[k] = v;
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

  const Organization = organizationModel.Organization || mongoose.model('Organization');
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
  const Notification = mongoose.model('Notification');
  const LeadReassignmentHistory = mongoose.model('LeadReassignmentHistory');
  const now = new Date();

  const leads = await Contact.find({ _id: { $in: ids } }).exec();

  for (const lead of leads) {
    const oldOwner = lead.contact_owner_email || lead.contactOwnerEmail || lead.assigned_to || lead.assignedTo || '';
    const leadCustomerName = lead.customer_name || lead.customerName || lead.name || 'Unnamed Lead';
    const leadContactNo = lead.contact_no || lead.contact_number || lead.contactNumber || lead.phone || '';
    const leadSource = lead.source || lead.campaign || '';
    const orgId = lead.organization_id || lead.organizationId;

    const updatePayload = {
      uid: targetOwnerUid,
      contact_owner_id: targetOwnerUid,
      contactOwnerId: targetOwnerUid,
      contactOwnerEmail: owner.email,
      contact_owner_email: owner.email,
      assignedTo: owner.email,
      assigned_to: owner.email,
      last_rotation_at: now,
      lastRotationAt: now,
      transferReason: reason,
      transfer_reason: reason,
      transferStatus: true,
      transfer_status: true,
      leadType: leadType || lead.leadType || 'Leads',
      lead_type: leadType || lead.leadType || 'Leads',
      modifiedAt: now,
      stageChangeAt: now,
      leadAssignTime: now,
      previousOwner1: lead.previousOwner2 || '',
      previousOwner2: oldOwner,
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
        updatePayload.project_name = '';
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

    // Write Audit Reassignment History Log
    try {
      await LeadReassignmentHistory.create({
        organization_id: orgId,
        organizationId: orgId,
        lead_id: String(lead._id),
        leadId: String(lead._id),
        customer_name: leadCustomerName,
        customerName: leadCustomerName,
        contact_no: leadContactNo,
        contactNo: leadContactNo,
        source: leadSource,
        from_user: oldOwner || 'Unassigned',
        fromUser: oldOwner || 'Unassigned',
        to_user: owner.email,
        toUser: owner.email,
        reassigned_by: authedUser?.name || authedUser?.email || 'Manual Transfer',
        reassignedBy: authedUser?.name || authedUser?.email || 'Manual Transfer',
        reason: reason || 'Manual Lead Transfer',
        rotation_time: 0,
        rotationTime: 0,
        created_at: now,
        createdAt: now
      });
    } catch (hErr) {
      console.error('[ContactService] Error writing manual transfer history:', hErr.message);
    }

    // WhatsApp Transfer Notification to New Owner
    try {
      const { sendNotification } = require('./whatsappService');
      sendNotification({
        organizationId: orgId,
        contact: {
          ...lead.toObject(),
          ...updatePayload,
          customer_name: leadCustomerName,
          customerName: leadCustomerName,
          contact_no: leadContactNo,
          contactNumber: leadContactNo
        },
        eventType: 'transfer'
      }).catch(err => console.error('[WhatsApp] Transfer notification dispatch error:', err));
    } catch (e) {
      console.error('[WhatsApp] Failed to initiate transfer notification:', e);
    }

    // In-App Notification for New Owner
    try {
      const { createNotification } = require('./notificationService');
      await createNotification({
        userId: targetOwnerUid,
        organizationId: orgId,
        workspaceId: lead.workspace_id || lead.workspaceId || null,
        title: 'Lead Transferred to You',
        message: `Lead "${leadCustomerName}" has been transferred to you by ${authedUser?.name || authedUser?.email || 'Admin'}.`,
        type: 'LEAD_TRANSFERRED',
        relatedId: lead._id
      });
    } catch (err) {
      console.error('[Notification] Failed to create in-app transfer notification:', err);
    }

    // In-App Notification for Previous Owner (Old Agent)
    if (oldOwner && oldOwner !== owner.email && oldOwner !== 'Unassigned') {
      try {
        await Notification.create({
          organization_id: orgId,
          organizationId: orgId,
          recipient_email: oldOwner,
          recipientEmail: oldOwner,
          title: 'Lead Reallocated',
          message: `Lead "${leadCustomerName}" was transferred to ${owner.email} by ${authedUser?.name || authedUser?.email || 'Admin'}.`,
          type: 'LEAD_REASSIGN',
          read: false,
          created_at: now,
          createdAt: now
        });
      } catch (nOldErr) {
        // ignore
      }
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
  const Notification = mongoose.model('Notification');
  const LeadReassignmentHistory = mongoose.model('LeadReassignmentHistory');
  const now = new Date();

  const leads = await Contact.find({ _id: { $in: ids } }).exec();

  const result = await Contact.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        contactOwnerEmail,
        contact_owner_email: contactOwnerEmail,
        assignedTo: contactOwnerEmail,
        assigned_to: contactOwnerEmail,
        uid: uid || null,
        contactOwnerId: uid || null,
        contact_owner_id: uid || null,
        last_rotation_at: now,
        lastRotationAt: now,
        modifiedAt: now
      }
    }
  );

  for (const lead of leads) {
    const oldOwner = lead.contact_owner_email || lead.contactOwnerEmail || lead.assigned_to || lead.assignedTo || '';
    const leadCustomerName = lead.customer_name || lead.customerName || lead.name || 'Unnamed Lead';
    const leadContactNo = lead.contact_no || lead.contact_number || lead.contactNumber || lead.phone || '';
    const leadSource = lead.source || lead.campaign || '';
    const orgId = lead.organization_id || lead.organizationId;

    // Write Audit History Log
    try {
      await LeadReassignmentHistory.create({
        organization_id: orgId,
        organizationId: orgId,
        lead_id: String(lead._id),
        leadId: String(lead._id),
        customer_name: leadCustomerName,
        customerName: leadCustomerName,
        contact_no: leadContactNo,
        contactNo: leadContactNo,
        source: leadSource,
        from_user: oldOwner || 'Unassigned',
        fromUser: oldOwner || 'Unassigned',
        to_user: contactOwnerEmail,
        toUser: contactOwnerEmail,
        reassigned_by: authedUser?.name || authedUser?.email || 'Bulk Reassignment',
        reassignedBy: authedUser?.name || authedUser?.email || 'Bulk Reassignment',
        reason: 'Bulk Reassignment',
        rotation_time: 0,
        rotationTime: 0,
        created_at: now,
        createdAt: now
      });
    } catch (hErr) {
      console.error('[ContactService] Error writing bulk reassign history:', hErr.message);
    }

    // WhatsApp Transfer Notification
    try {
      const { sendNotification } = require('./whatsappService');
      sendNotification({
        organizationId: orgId,
        contact: {
          ...lead.toObject(),
          contactOwnerEmail,
          contact_owner_email: contactOwnerEmail,
          assignedTo: contactOwnerEmail,
          assigned_to: contactOwnerEmail,
          uid: uid || null,
          customer_name: leadCustomerName,
          customerName: leadCustomerName,
          contact_no: leadContactNo,
          contactNumber: leadContactNo
        },
        eventType: 'transfer'
      }).catch(err => console.error('[WhatsApp] Bulk transfer notification dispatch error:', err));
    } catch (e) {
      console.error('[WhatsApp] Failed to initiate bulk transfer notifications:', e);
    }

    // In-App Notification for New Owner
    if (uid) {
      try {
        const { createNotification } = require('./notificationService');
        await createNotification({
          userId: uid,
          organizationId: orgId,
          workspaceId: lead.workspace_id || lead.workspaceId || null,
          title: 'Lead Transferred to You',
          message: `Lead "${leadCustomerName}" has been reassigned to you by ${authedUser?.name || authedUser?.email || 'Admin'}.`,
          type: 'LEAD_TRANSFERRED',
          relatedId: lead._id
        });
      } catch (err) {
        console.error('[Notification] Failed to create in-app bulk reassignment notifications:', err);
      }
    }
  }

  return { modifiedCount: result.modifiedCount };
};

exports.addContactAttachment = async ({ contactId, name, base64Data, url, type = 'file', authedUser }) => {
  const Contact = mongoose.model('Contact');
  const s3Service = require('./s3Service');
  const contact = await Contact.findById(contactId);
  if (!contact) {
    const err = new Error('Contact not found');
    err.status = 404;
    throw err;
  }

  const industryId = contact.industry_id || contact.industryId || authedUser?.industryId || 'global';
  const organizationId = contact.organization_id || contact.organizationId || authedUser?.organizationId || 'global';
  const workspaceId = contact.workspace_id || contact.workspaceId || authedUser?.workspaceId || 'default';

  let finalUrl = url || '';
  let finalKey = '';
  let finalSize = 0;

  if (base64Data) {
    const uploadRes = await s3Service.uploadBase64Media({
      base64Data,
      filename: name || `attachment-${Date.now()}`,
      industryId,
      organizationId,
      workspaceId,
      contactId,
      resourceType: type
    });
    finalUrl = typeof uploadRes === 'object' ? uploadRes.url : uploadRes;
    finalKey = typeof uploadRes === 'object' ? (uploadRes.key || '') : '';
    finalSize = typeof uploadRes === 'object' ? (uploadRes.size || 0) : 0;
  }

  if (!finalUrl) {
    const err = new Error('Either file payload or Resource URL must be provided');
    err.status = 400;
    throw err;
  }

  const attachmentId = new mongoose.Types.ObjectId();
  const newAttachment = {
    _id: attachmentId,
    id: attachmentId.toString(),
    name: name || 'Attachment',
    url: finalUrl,
    key: finalKey,
    type: type || 'file',
    size: finalSize,
    uploaded_by: authedUser?.email || authedUser?.name || 'User',
    created_at: new Date()
  };

  const existingAttachments = Array.isArray(contact.attachments) ? contact.attachments : [];
  existingAttachments.push(newAttachment);
  contact.attachments = existingAttachments;

  await contact.save();
  return { success: true, attachment: newAttachment, attachments: existingAttachments };
};

exports.deleteContactAttachment = async ({ contactId, attachmentId, authedUser }) => {
  const Contact = mongoose.model('Contact');
  const s3Service = require('./s3Service');
  const contact = await Contact.findById(contactId);
  if (!contact) {
    const err = new Error('Contact not found');
    err.status = 404;
    throw err;
  }

  const existing = Array.isArray(contact.attachments) ? contact.attachments : [];
  const targetIndex = existing.findIndex(a => 
    String(a._id || a.id) === String(attachmentId) || String(a.url) === String(attachmentId)
  );

  if (targetIndex === -1) {
    const err = new Error('Attachment not found on this contact');
    err.status = 404;
    throw err;
  }

  const [removed] = existing.splice(targetIndex, 1);
  if (removed?.url) {
    await s3Service.deleteImage(removed.url).catch(e => console.error('[S3] Attachment delete error:', e));
  }

  contact.attachments = existing;
  await contact.save();

  return { success: true, message: 'Attachment deleted successfully', attachments: existing };
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

  // 1. Cascading deletes: Tasks
  try {
    const Task = mongoose.model('Task');
    await Task.deleteMany({
      $or: [
        { contact_id: id },
        { contactId: id },
        { contact_id: String(id) },
        { contactId: String(id) }
      ]
    });
  } catch (err) {
    console.warn('[Cascade Delete] Tasks cleanup error:', err.message);
  }

  // 2. Cascading deletes: Call Logs
  try {
    const CallLog = mongoose.model('CallLog');
    await CallLog.deleteMany({
      $or: [
        { contact_id: id },
        { contactId: id },
        { contact_id: String(id) },
        { contactId: String(id) }
      ]
    });
  } catch (err) {
    console.warn('[Cascade Delete] CallLogs cleanup error:', err.message);
  }

  // 3. Cascading deletes: Bookings
  try {
    const bookingModel = require('../models/bookingModel');
    const Booking = bookingModel.Booking || mongoose.model('Booking');
    if (Booking) {
      await Booking.deleteMany({
        $or: [
          { contact_id: id },
          { contactId: id },
          { contact_id: String(id) },
          { contactId: String(id) }
        ]
      });
    }
  } catch (err) {
    console.warn('[Cascade Delete] Bookings cleanup error:', err.message);
  }

  // 4. Cascading deletes: Resource Items (Notes, Attachments)
  try {
    const resourceItemModel = require('../models/resourceItemModel');
    const OrganizationResources = resourceItemModel.ResourceItem || mongoose.model('OrganizationResources');
    if (OrganizationResources) {
      const orgDocs = await OrganizationResources.find({}).exec();
      for (const orgDoc of orgDocs) {
        let modified = false;
        if (Array.isArray(orgDoc.notes)) {
          const prevLen = orgDoc.notes.length;
          orgDoc.notes = orgDoc.notes.filter(n => {
            const cId = String(n.contactId || n.contact_id || '');
            return cId !== String(id);
          });
          if (orgDoc.notes.length !== prevLen) {
            orgDoc.markModified('notes');
            modified = true;
          }
        }
        if (Array.isArray(orgDoc.attachments)) {
          const prevLen = orgDoc.attachments.length;
          orgDoc.attachments = orgDoc.attachments.filter(a => {
            const cId = String(a.contactId || a.contact_id || '');
            return cId !== String(id);
          });
          if (orgDoc.attachments.length !== prevLen) {
            orgDoc.markModified('attachments');
            modified = true;
          }
        }
        if (modified) {
          await orgDoc.save();
        }
      }
    }
  } catch (err) {
    console.warn('[Cascade Delete] ResourceItems cleanup error:', err.message);
  }

  // 5. Cascading deletes: Deals (Clean up open pipeline deals; unlink Closed Won deals)
  try {
    const dealModel = require('../models/dealModel');
    const Deal = dealModel.Deal || mongoose.model('Deal');
    if (Deal) {
      // Delete open/non-won deals linked directly to this lead
      await Deal.deleteMany({
        $or: [
          { contact_id: id },
          { contactId: id },
          { contact_id: String(id) },
          { contactId: String(id) }
        ],
        stage: { $ne: 'CLOSED_WON' }
      });
      // Soft-unlink won deals so revenue reports remain preserved
      await Deal.updateMany(
        {
          $or: [
            { contact_id: id },
            { contactId: id },
            { contact_id: String(id) },
            { contactId: String(id) }
          ],
          stage: 'CLOSED_WON'
        },
        { $set: { contact_id: null, contactId: null, contact_name: existing.customer_name || existing.customerName || 'Deleted Contact' } }
      );
    }
  } catch (err) {
    console.warn('[Cascade Delete] Deals cleanup error:', err.message);
  }

  // 6. Cascading deletes: Quotes
  try {
    const quoteModel = require('../models/quoteModel');
    const Quote = quoteModel.Quote || mongoose.model('Quote');
    if (Quote) {
      await Quote.deleteMany({
        $or: [
          { contact_id: id },
          { contactId: id },
          { contact_id: String(id) },
          { contactId: String(id) }
        ]
      });
    }
  } catch (err) {
    console.warn('[Cascade Delete] Quotes cleanup error:', err.message);
  }

  // 7. Clean up S3 attachments for this contact
  try {
    if (Array.isArray(existing.attachments) && existing.attachments.length > 0) {
      const s3Service = require('./s3Service');
      for (const att of existing.attachments) {
        if (att?.url) {
          await s3Service.deleteImage(att.url).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[Cascade Delete] S3 attachments cleanup error:', err.message);
  }

  // 8. Delete Primary Contact Record
  await contactModel.remove(id);
};

exports.convertContact = async ({ contactId, payload, authedUser }) => {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const contact = await contactModel.Contact.findById(contactId).lean().exec();
  if (!contact) {
    const err = new Error('Contact not found'); err.status = 404; throw err;
  }

  const orgId = authedUser.organization_id || authedUser.organizationId || contact.organization_id || contact.organizationId;
  const wsId = authedUser.workspace_id || authedUser.workspaceId || contact.workspace_id || contact.workspaceId || null;
  const indId = authedUser.industry_id || authedUser.industryId || contact.industry_id || contact.industryId || 'temp0001';

  const accountModel = require('../models/accountModel');
  const dealModel = require('../models/dealModel');
  const Account = accountModel.Account || mongoose.model('Account');
  const Deal = dealModel.Deal || mongoose.model('Deal');

  // 1. Resolve or Create Account
  let accountId = payload.accountId || contact.account_id || contact.accountId;
  if (!accountId && payload.accountName) {
    const newAccount = await Account.create({
      name: payload.accountName,
      organization_id: orgId,
      workspace_id: wsId,
      industry_id: indId,
      phone: contact.contact_number || contact.contactNumber || '',
      created_by: authedUser.id
    });
    accountId = newAccount._id;
  } else if (!accountId) {
    const newAccount = await Account.create({
      name: contact.customer_name || contact.customerName || 'Account',
      organization_id: orgId,
      workspace_id: wsId,
      industry_id: indId,
      phone: contact.contact_number || contact.contactNumber || '',
      created_by: authedUser.id
    });
    accountId = newAccount._id;
  }

  // 2. Create Deal if requested
  let createdDeal = null;
  if (payload.createDeal !== false) {
    const dealTitle = payload.dealTitle || `${contact.customer_name || contact.customerName || 'Customer'} - Opportunity`;
    createdDeal = await Deal.create({
      title: dealTitle,
      name: dealTitle,
      amount: Number(payload.dealAmount || 0),
      currency: payload.currency || 'INR',
      pipeline_id: payload.pipelineId || undefined,
      stage_id: payload.stageId || 'QUALIFICATION',
      stage: payload.stageName || payload.stageId || 'Qualification',
      probability: Number(payload.probability || 10),
      expected_close_date: payload.expectedCloseDate ? new Date(payload.expectedCloseDate) : undefined,
      account_id: accountId,
      contact_id: contact._id,
      contact_name: contact.customer_name || contact.customerName || '',
      contact_phone: contact.contact_number || contact.contactNumber || '',
      contact_email: contact.email_id || contact.emailId || '',
      organization_id: orgId,
      workspace_id: wsId,
      industry_id: indId,
      owner_id: contact.owner_id || authedUser.id,
      owner_name: authedUser.name || authedUser.email,
      owner_email: authedUser.email,
      notes: payload.dealNotes || '',
      created_by: authedUser.id
    });
  }

  // 3. Mark contact as converted
  const updateFields = {
    account_id: accountId,
    accountId: accountId,
    is_converted: true,
    isConverted: true,
    converted_at: new Date(),
    convertedAt: new Date()
  };
  if (createdDeal) {
    updateFields.converted_deal_id = createdDeal._id;
    updateFields.convertedDealId = createdDeal._id;
  }

  await contactModel.Contact.findByIdAndUpdate(contactId, { $set: updateFields }).exec();

  return {
    success: true,
    accountId,
    dealId: createdDeal ? createdDeal._id : null,
    deal: createdDeal,
    message: 'Lead converted successfully!'
  };
};

exports.fillExtraFields = fillExtraFields;
