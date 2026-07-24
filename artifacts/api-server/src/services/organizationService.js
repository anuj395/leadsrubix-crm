// src/services/organizationService.js
// Business logic for the Organization module. Mirrors userService — every
// dynamic field on `organizations` is validated against the `organization`
// screen config so SuperAdmin can drive the form/table entirely from the
// Field Manager UI without touching code.

const organizationModel = require('../models/organizationModel');
const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');
const permissionModel = require('../models/screenPermissionModel');
const userModel = require('../models/userModel');
const industryModel = require('../models/industryModel');
const roleModel = require('../models/roleModel');
const mongoose = require('mongoose');
const { sendCredentialsEmail } = require('../utils/mailer');

const ORG_SCREEN_KEY = 'organization';

async function resolveActor(authedUser) {
  if (!authedUser?.id) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const user = await userModel.findById(authedUser.id);
  if (!user) {
    const err = new Error('Authenticated user not found'); err.status = 401; throw err;
  }
  return user;
}

/**
 * Returns the form-visible fields the (role × industry) caller is allowed to
 * write on an Organization. SuperAdmin can use every active form field.
 */
async function resolveAllowedFormFields({ industryCode, roleKey, industry_code, role_key, isSuperAdmin }) {
  const code = industryCode || industry_code;
  const rKey = roleKey || role_key;
  const screen = await screenModel.findByKey(ORG_SCREEN_KEY);
  if (!screen || !screen.isActive) {
    return { screen: null, fields: [] };
  }
  const fields = await fieldModel.list({ screenId: screen._id, activeOnly: true });

  if (isSuperAdmin) {
    return { screen, fields: fields };
  }

  const industry = await industryModel.findByCode(code);
  if (!industry) return { screen, fields: [] };
  const role = await roleModel.findByIndustryAndKey(industry._id, rKey);
  if (!role) return { screen, fields: [] };

  const perms = await permissionModel.list({
    screenId: screen._id,
    roleId: role._id,
    industryId: industry._id,
    enabledOnly: true,
  });
  const allowedIds = new Set(perms.map((p) => String(p.fieldId)));
  return {
    screen,
    fields: fields.filter((f) => f.is_form_visible && allowedIds.has(String(f._id))),
  };
}

function pickAllowed(payload, allowedFieldDefs) {
  const cleaned = {};
  
  const allowedMap = {};
  allowedFieldDefs.forEach(f => {
    const camel = (f.field_key || f.fieldKey || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    allowedMap[camel] = f;
  });

  const normalizedPayload = {};
  for (const [k, v] of Object.entries(payload || {})) {
    const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    normalizedPayload[camelKey] = v;
  }

  for (const [camelKey, v] of Object.entries(normalizedPayload)) {
    const fieldDef = allowedMap[camelKey];
    if (fieldDef) {
      cleaned[camelKey] = v;
    }
  }

  const missing = [];
  allowedFieldDefs.forEach(f => {
    if (f.is_required || f.isRequired) {
      const camel = (f.field_key || f.fieldKey || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (cleaned[camel] === undefined || cleaned[camel] === null || cleaned[camel] === '') {
        missing.push(f.field_key || camel);
      }
    }
  });

  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return cleaned;
}

exports.listPaged = async ({
  authedUser,
  industryId,
  q,
  page = 0,
  pageSize = 25,
  sortField,
  sortDir,
} = {}) => {
  const user = await resolveActor(authedUser);
  if (!user) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';

  const { fields: allowedFields } = await resolveAllowedFormFields({
    industryCode: industryId || user.industryId,
    roleKey: user.role || authedUser.role,
    isSuperAdmin,
  });

  const queryIndustry = isSuperAdmin
    ? industryId
    : user.industryId;

  const { items, total } = await organizationModel.listPaged({
    industryId: queryIndustry,
    q,
    page,
    pageSize,
    sortField,
    sortDir,
    searchKeys: allowedFields.map(f => f.field_key || f.fieldKey),
  });

  // Enrich createdBy with human-readable name or role
  const userIds = items
    .map(org => org.createdBy || org.createdBy)
    .filter(id => id && mongoose.Types.ObjectId.isValid(id));
  const users = await mongoose.model('User').find({ _id: { $in: userIds } }).lean().exec();
  const userMap = users.reduce((acc, u) => {
    acc[u._id.toString()] = u;
    return acc;
  }, {});

  const enrichedItems = items.map(orgDoc => {
    const org = orgDoc.toObject();
    const creatorId = (org.createdBy || org.createdBy)?.toString();
    const creator = userMap[creatorId];
    let createdByVal = creatorId || '';
    if (creator) {
      createdByVal = creator.role === 'superAdmin' ? 'Super Admin' : (creator.organizationName || creator.name || creator.email);
    } else if (creatorId === 'SIGNUP') {
      createdByVal = 'SIGNUP';
    }
    return {
      ...org,
      createdBy: createdByVal,
    };
  });

  return { items: enrichedItems, total };
};

exports.fetchById = async ({ id, authedUser }) => {
  const user = await resolveActor(authedUser);
  if (!user) {
    const err = new Error('Authentication required'); err.status = 401; throw err;
  }
  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';
  const org = await organizationModel.findById(id);
  if (org && !isSuperAdmin && org.industryId && org.industryId !== user.industryId) {
    return null;
  }
  if (org) {
    const creatorId = (org.createdBy || org.createdBy)?.toString();
    if (creatorId && mongoose.Types.ObjectId.isValid(creatorId)) {
      const creator = await mongoose.model('User').findById(creatorId).lean().exec();
      let createdByVal = creatorId;
      if (creator) {
        createdByVal = creator.role === 'superAdmin' ? 'Super Admin' : (creator.organizationName || creator.name || creator.email);
      }
      org.createdBy = createdByVal;
      org.createdBy = createdByVal;
    }
  }
  return org;
};

function generateOrgId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

exports.create = async ({ payload, authedUser }) => {
  const user = authedUser?.id ? await resolveActor(authedUser) : null;
  const isSuperAdmin = user && (user.role || authedUser?.role) === 'superAdmin';

  const industryId = (isSuperAdmin || !user)
    ? payload.industryId || payload.industryId || payload.fields?.industryId || payload.fields?.industryId || payload.industry || payload.fields?.industry || (user ? user.industryId || user.industryId : null)
    : (user ? user.industryId || user.industryId : null);

  const { fields: allowedFields } = await resolveAllowedFormFields({
    industry_code: industryId,
    role_key: user ? user.role || authedUser?.role : 'admin',
    isSuperAdmin,
  });
  const cleaned = pickAllowed(payload?.fields ?? payload ?? {}, allowedFields);

  const orgId = generateOrgId();

  // Fetch pricing plan settings from DB
  let licensesCost = 1000;
  let trialPeriodLicenses = 10;
  let gracePeriodDays = 7;
  let trialPeriodDays = 7;
  try {
    const PricingPlan = mongoose.model('PricingPlan');
    const plan = await PricingPlan.findOne({}).lean().exec();
    if (plan) {
      if (typeof plan.licensesCost === 'number') licensesCost = plan.licensesCost;
      if (typeof plan.trialPeriodLicenses === 'number') trialPeriodLicenses = plan.trialPeriodLicenses;
      if (typeof plan.gracePeriodDays === 'number') gracePeriodDays = plan.gracePeriodDays;
      if (typeof plan.trialPeriodDays === 'number') trialPeriodDays = plan.trialPeriodDays;
    }
  } catch (err) {
    console.error('[organizationService] Failed to fetch pricing plan defaults:', err);
  }

  // Validate that Number of Employees does not exceed trialPeriodLicenses
  const numEmployeesVal = Number(cleaned.numEmployees || cleaned.num_employees || payload.fields?.numEmployees || payload.fields?.num_employees || payload.numEmployees || 0);
  if (numEmployeesVal > trialPeriodLicenses) {
    const err = new Error(`Number of Employees (${numEmployeesVal}) cannot exceed the trial period licenses limit (${trialPeriodLicenses}).`);
    err.status = 400;
    throw err;
  }

  // Merge configuration-driven defaults from ScreenField configuration
  let mergedWithDefaults = { ...cleaned };
  try {
    const screen = await screenModel.findByKey(ORG_SCREEN_KEY);
    if (screen) {
      const fields = await fieldModel.list({ screenId: screen._id, activeOnly: true });
      for (const f of fields) {
        const key = f.field_key || f.fieldKey;
        const defVal = f.default_value !== undefined ? f.default_value : f.defaultValue;
        if (mergedWithDefaults[key] === undefined && defVal !== undefined && defVal !== null) {
          mergedWithDefaults[key] = defVal;
        }
      }
    }
  } catch (err) {
    console.error('[organizationService] Failed to merge screen field defaults:', err);
  }

  const validFrom = new Date();
  const validTill = new Date(validFrom);
  validTill.setDate(validTill.getDate() + trialPeriodDays);

  const adminId = new mongoose.Types.ObjectId();
  const creatorId = isSuperAdmin ? 'Super Admin' : 'Admin';

  const orgDoc = await organizationModel.create({
    ...mergedWithDefaults,
    costPerLicense: licensesCost,
    orgTrialPeriodUsersLicenses: trialPeriodLicenses,
    gracePeriodDays: gracePeriodDays,
    trialPeriodDays: trialPeriodDays,
    paymentStatus: true,
    validFrom,
    validTill,
    organizationId: orgId,
    organizationId: orgId,
    industryId: industryId,
    isActive: payload.isActive !== false,
    createdBy: creatorId,
    createdBy: creatorId,
  });

  // Automatically create an Admin user for this organization
  const orgName = cleaned.organizationName || cleaned.organizationName || (cleaned.firstName
    ? `${cleaned.firstName} ${cleaned.lastName || ''}`.trim()
    : cleaned.name || payload.name || 'Organization');
  const orgEmail = cleaned.emailId || cleaned.email || payload.email;
  let adminEmail = orgEmail || `admin@${(cleaned.code || payload.code || 'org').toLowerCase()}.com`;
  
  // Ensure unique admin email
  const existingUser = await mongoose.model('User').findOne({ email: adminEmail.toLowerCase().trim() });
  if (existingUser) {
    adminEmail = `admin-${Date.now()}@${(cleaned.code || payload.code || 'org').toLowerCase()}.com`;
  }

  const adminName = cleaned.firstName
    ? `${cleaned.firstName} ${cleaned.lastName || ''}`.trim()
    : `${orgName} Admin`;
  
  // Generate random 8-character temporary password or use custom password
  const customPassword = payload.password || payload.fields?.password || payload.customAdminPassword;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let adminPassword = '';
  if (customPassword) {
    adminPassword = String(customPassword);
  } else {
    for (let i = 0; i < 8; i++) {
      adminPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  await userModel.create({
    _id: adminId,
    name: adminName,
    organizationName: orgName,
    firstName: cleaned.firstName || cleaned.first_name || orgName,
    lastName: cleaned.lastName || cleaned.last_name || 'Admin',
    email: adminEmail.toLowerCase().trim(),
    password: adminPassword,
    role: 'admin',
    organizationId: orgDoc.organizationId || orgDoc.organizationId,
    industryId: industryId,
    contactNumber: cleaned.contactNumber || cleaned.contact_no || cleaned.contact || '',
    userImage: '',
    designation: 'Administrator',
    team: '',
    branch: '',
    branchPermission: [],
    status: 'active',
    isActive: true,
    reportingTo: '',
    needsPasswordChange: true,
    deviceId: '',
    uid: '',
    latestUpdateProfile: false,
    activatedAt: new Date(),
    deactivatedAt: null,
    createdBy: creatorId,
  });

  // Send credentials email
  void (async () => {
    try {
      await sendCredentialsEmail({
        orgName,
        userName: adminName,
        emailAddress: adminEmail.toLowerCase().trim(),
        tempPassword: adminPassword
      });
    } catch (err) {
      console.error('[organizationService] Failed to send credentials email for org admin:', err);
    }
  })();

  // Automatically clone Super Admin news articles (where organizationId is null or empty) for the new organization
  try {
    const News = mongoose.model('News');
    const globalNewsDoc = await News.findOne({
      $or: [
        { organizationId: null },
        { organizationId: '' }
      ]
    }).exec();

    if (globalNewsDoc && globalNewsDoc.news && globalNewsDoc.news.length > 0) {
      // Find or create news doc for the new organizationId
      let orgNewsDoc = await News.findOne({ organizationId: orgId }).exec();
      if (!orgNewsDoc) {
        orgNewsDoc = new News({ organizationId: orgId, news: [] });
      }

      globalNewsDoc.news.forEach(n => {
        // Prevent duplicate cloning
        const duplicate = orgNewsDoc.news.find(item => item.name === n.name && item.link === n.link);
        if (!duplicate) {
          orgNewsDoc.news.push({
            name: n.name,
            link: n.link,
            status: n.status,
            createdBy: n.createdBy
          });
        }
      });

      if (orgNewsDoc.news.length > 0) {
        await orgNewsDoc.save();
      }
    }
  } catch (err) {
    console.error('[organizationService] Failed to copy global news to the new organization:', err);
  }

  // Automatically clone Super Admin FAQs (where organizationId is null or empty) for the new organization
  try {
    const FAQ = mongoose.model('FAQ');
    const globalFaqDoc = await FAQ.findOne({
      $or: [
        { organizationId: null },
        { organizationId: '' }
      ]
    }).exec();

    if (globalFaqDoc && globalFaqDoc.faqs && globalFaqDoc.faqs.length > 0) {
      // Find or create FAQ doc for the new organizationId
      let orgFaqDoc = await FAQ.findOne({ organizationId: orgId }).exec();
      if (!orgFaqDoc) {
        orgFaqDoc = new FAQ({ organizationId: orgId, faqs: [] });
      }

      globalFaqDoc.faqs.forEach(f => {
        // Prevent duplicate cloning
        const duplicate = orgFaqDoc.faqs.find(item => item.question === f.question && item.answer === f.answer);
        if (!duplicate) {
          orgFaqDoc.faqs.push({
            question: f.question,
            answer: f.answer,
            status: f.status,
            videoUrl: f.videoUrl || '',
            createdBy: f.createdBy
          });
        }
      });

      if (orgFaqDoc.faqs.length > 0) {
        await orgFaqDoc.save();
      }
    }
  } catch (err) {
    console.error('[organizationService] Failed to copy global FAQs to the new organization:', err);
  }

  // Automatically clone Super Admin resources (where organizationId is null or empty) for the new organization
  try {
    const OrganizationResources = mongoose.model('OrganizationResources');
    const globalResDoc = await OrganizationResources.findOne({
      $or: [
        { organizationId: null },
        { organizationId: '' }
      ]
    }).exec();

    if (globalResDoc) {
      // Find or create resources doc for the new organizationId
      let orgResDoc = await OrganizationResources.findOne({ organizationId: orgId }).exec();
      if (!orgResDoc) {
        orgResDoc = new OrganizationResources({ organizationId: orgId });
      }

      // Copy all arrays from the global document if they are not already populated
      const resourceFields = [
        'propertyStages',
        'propertySubTypes',
        'propertyTypes',
        'transferReasons',
        'budgets',
        'carousel',
        'leadSources',
        'locations',
        'projects',
        'propertyStatuses'
      ];

      resourceFields.forEach(field => {
        if (globalResDoc[field] && Array.isArray(globalResDoc[field]) && globalResDoc[field].length > 0) {
          const existingItems = orgResDoc[field] || [];
          const existingKeys = new Set(existingItems.map(item => typeof item === 'object' && item ? JSON.stringify(item) : String(item)));
          
          globalResDoc[field].forEach(item => {
            const itemKey = typeof item === 'object' && item ? JSON.stringify(item) : String(item);
            if (!existingKeys.has(itemKey)) {
              orgResDoc[field].push(item);
            }
          });
        }
      });

      await orgResDoc.save();
    }
  } catch (err) {
    console.error('[organizationService] Failed to copy global resources to the new organization:', err);
  }

  return orgDoc;
};

exports.update = async ({ id, payload, authedUser }) => {
  const user = await resolveActor(authedUser);
  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';

  const existing = await organizationModel.findById(id);
  if (!existing) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }
  if (!isSuperAdmin && existing.industryId && existing.industryId !== user.industryId) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }

  const { fields: allowedFields } = await resolveAllowedFormFields({
    industry_code: existing.industryId,
    role_key: user.role || authedUser.role,
    isSuperAdmin,
  });
  const cleaned = pickAllowed(payload?.fields ?? payload ?? {}, allowedFields);

  const patch = { ...cleaned };
  if (isSuperAdmin && payload.industryId) patch.industryId = payload.industryId;

  // 1. Valid Till Date Validation
  if (patch.validTill) {
    const targetDate = new Date(patch.validTill);
    const currentDate = new Date();
    if (targetDate <= currentDate) {
      const err = new Error('Valid Till date must be later than the current date');
      err.status = 400;
      throw err;
    }
  }

  // 1b. Number of Employees / Active Users Validation
  if (patch.numEmployees !== undefined && patch.numEmployees !== null) {
    const User = mongoose.model('User');
    const activeUserCount = await User.countDocuments({
      organizationId: existing.organizationId || existing._id.toString(),
      is_active: true
    }).exec();
    if (Number(patch.numEmployees) < activeUserCount) {
      const err = new Error(`The number of employees can't be less than ${activeUserCount}.`);
      err.status = 400;
      throw err;
    }
  }

  // 2. Sync Administrator User Details & Email Update Cascading
  const User = mongoose.model('User');
  const adminUser = await User.findOne({
    organizationId: existing.organizationId || existing._id.toString(),
    role: 'admin'
  }).exec();

  if (adminUser) {
    const oldEmail = adminUser.email;
    const newEmail = (patch.emailId || existing.emailId || '').toLowerCase().trim();

    if (newEmail && newEmail !== oldEmail) {
      const existingUser = await User.findOne({ email: newEmail }).exec();
      if (existingUser && String(existingUser._id) !== String(adminUser._id)) {
        const err = new Error(`Email ${newEmail} is already in use by another user.`);
        err.status = 400;
        throw err;
      }
      adminUser.email = newEmail;

      const Contact = mongoose.model('Contact');
      await Contact.updateMany(
        { organizationId: existing.organizationId || existing._id.toString(), contactOwnerEmail: oldEmail },
        { $set: { contactOwnerEmail: newEmail } }
      );

      const Task = mongoose.model('Task');
      await Task.updateMany(
        { organizationId: existing.organizationId || existing._id.toString(), contactOwnerEmail: oldEmail },
        { $set: { contactOwnerEmail: newEmail } }
      );
      await Task.updateMany(
        { organizationId: existing.organizationId || existing._id.toString(), assignedTo: oldEmail },
        { $set: { assignedTo: newEmail } }
      );
    }

    if (patch.firstName !== undefined) adminUser.first_name = patch.firstName;
    if (patch.lastName !== undefined) adminUser.last_name = patch.lastName;
    if (patch.contactNumber !== undefined) adminUser.contact_number = patch.contactNumber;

    await adminUser.save();
  }

  // 3. Organization Name Update Cascading to Users
  if (patch.organizationName !== undefined && patch.organizationName !== existing.organizationName) {
    await User.updateMany(
      { organizationId: existing.organizationId || existing._id.toString() },
      { $set: { organization_name: patch.organizationName } }
    );
  }

  let newActive = undefined;
  const rawStatus = payload.status ?? payload.fields?.status ?? cleaned.status ?? 
                    payload.isActive ?? payload.fields?.isActive ?? cleaned.isActive ??
                    payload.isActive ?? payload.fields?.isActive ?? cleaned.isActive;

  if (rawStatus !== undefined && rawStatus !== null) {
    if (typeof rawStatus === 'boolean') {
      newActive = rawStatus;
    } else if (typeof rawStatus === 'string') {
      const lower = rawStatus.toLowerCase().trim();
      if (lower === 'active' || lower === 'true') {
        newActive = true;
      } else if (lower === 'inactive' || lower === 'false') {
        newActive = false;
      }
    }
  }

  if (newActive !== undefined) {
    patch.isActive = newActive;
    patch.isActive = newActive;
    patch.status = newActive ? 'ACTIVE' : 'INACTIVE';
    
    const userUpdate = {
      isActive: newActive,
      isActive: newActive,
      status: newActive ? 'active' : 'inactive'
    };
    if (newActive) {
      userUpdate.activatedAt = new Date();
      userUpdate.deactivatedAt = null;
      patch.activatedAt = new Date();
      patch.deactivatedAt = null;
    } else {
      userUpdate.deactivatedAt = new Date();
      patch.deactivatedAt = new Date();
    }
    
    // Update all users belonging to this organization (supporting both old ObjectId and new string matches)
    await mongoose.model('User').updateMany(
      {
        $or: [
          { organizationId: existing._id },
          { organizationId: existing.organizationId || existing.organizationId }
        ]
      },
      { $set: userUpdate }
    );
  }

  return organizationModel.update(id, patch);
};

exports.remove = async ({ id, authedUser }) => {
  const user = await resolveActor(authedUser);
  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';
  const existing = await organizationModel.findById(id);
  if (!existing) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }
  if (!isSuperAdmin && existing.industryId && existing.industryId !== user.industryId) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }
  
  const orgId = existing.organizationId;
  
  if (orgId) {
    // 1. Find all users belonging to this organization
    const User = mongoose.model('User');
    const orgUsers = await User.find({ organizationId: orgId }).lean().exec();
    const userIds = orgUsers.map(u => u._id);

    // 2. Cascade delete all users belonging to this organization
    const deleteUsersResult = await User.deleteMany({ organizationId: orgId });
    console.log(`[organizationService] Cascade deleted ${deleteUsersResult.deletedCount} users for organization: ${orgId}`);

    // 4. Cascade delete contacts created by these users
    const Contact = mongoose.model('Contact');
    const deleteContactsResult = await Contact.deleteMany({ createdBy: { $in: userIds } });
    console.log(`[organizationService] Cascade deleted ${deleteContactsResult.deletedCount} contacts`);

    // 5. Cascade delete bookings created by these users
    const Booking = mongoose.model('Booking');
    const deleteBookingsResult = await Booking.deleteMany({ createdBy: { $in: userIds } });
    console.log(`[organizationService] Cascade deleted ${deleteBookingsResult.deletedCount} bookings`);

    // 6. Cascade delete api tokens for this organization
    const ApiToken = mongoose.model('ApiToken');
    const deleteTokensResult = await ApiToken.deleteMany({ organizationId: orgId });
    console.log(`[organizationService] Cascade deleted ${deleteTokensResult.deletedCount} API tokens`);

    // 7. Cascade delete WhatsApp configs for this organization
    const WhatsAppConfig = mongoose.model('WhatsAppConfig');
    const deleteWhatsappResult = await WhatsAppConfig.deleteMany({ organizationId: orgId });
    console.log(`[organizationService] Cascade deleted ${deleteWhatsappResult.deletedCount} WhatsApp configs`);

    // 8. Cascade delete news for this organization
    const News = mongoose.model('News');
    const deleteNewsResult = await News.deleteMany({ organizationId: orgId });
    console.log(`[organizationService] Cascade deleted ${deleteNewsResult.deletedCount} news documents`);

    // 9. Cascade delete FAQs for this organization
    const FAQ = mongoose.model('FAQ');
    const deleteFaqResult = await FAQ.deleteMany({ organizationId: orgId });
    console.log(`[organizationService] Cascade deleted ${deleteFaqResult.deletedCount} FAQ documents`);

    // 10. Cascade delete resource items/catalogs for this organization
    const OrganizationResources = mongoose.model('OrganizationResources');
    const deleteResourcesResult = await OrganizationResources.deleteMany({ organizationId: orgId });
    console.log(`[organizationService] Cascade deleted ${deleteResourcesResult.deletedCount} resource/catalog documents`);

    // 11. Cascade delete working days configuration for this organization
    const WorkingDay = mongoose.model('WorkingDay');
    await WorkingDay.deleteMany({ organizationId: orgId });

    // 12. Cascade delete Teams, Branches, and Designations configurations for this organization
    const Team = mongoose.model('Team');
    await Team.deleteMany({ organizationId: orgId });
    const Branch = mongoose.model('Branch');
    await Branch.deleteMany({ organizationId: orgId });
    const Designation = mongoose.model('Designation');
    await Designation.deleteMany({ organizationId: orgId });

    // 13. Cascade delete Holiday configuration for this organization
    const Holiday = mongoose.model('Holiday');
    await Holiday.deleteMany({ organizationId: orgId });
  }

  return organizationModel.remove(id);
};
