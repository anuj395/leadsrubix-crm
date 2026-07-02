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
async function resolveAllowedFormFields({ industry_code, role_key, isSuperAdmin }) {
  const screen = await screenModel.findByKey(ORG_SCREEN_KEY);
  if (!screen || !screen.is_active) {
    return { screen: null, fields: [] };
  }
  const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });

  if (isSuperAdmin) {
    return { screen, fields: fields };
  }

  const industry = await industryModel.findByCode(industry_code);
  if (!industry) return { screen, fields: [] };
  const role = await roleModel.findByIndustryAndKey(industry._id, role_key);
  if (!role) return { screen, fields: [] };

  const perms = await permissionModel.list({
    screen_id: screen._id,
    role_id: role._id,
    industry_id: industry._id,
    enabledOnly: true,
  });
  const allowedIds = new Set(perms.map((p) => String(p.field_id)));
  return {
    screen,
    fields: fields.filter((f) => f.is_form_visible && allowedIds.has(String(f._id))),
  };
}

function pickAllowed(payload, allowedFieldDefs) {
  const allowedKeys = new Set(allowedFieldDefs.map((f) => f.field_key));
  const cleaned = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (allowedKeys.has(k)) cleaned[k] = v;
  }
  const missing = allowedFieldDefs
    .filter((f) => f.is_required)
    .map((f) => f.field_key)
    .filter((k) => cleaned[k] === undefined || cleaned[k] === null || cleaned[k] === '');
  if (missing.length > 0) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return cleaned;
}

exports.listPaged = async ({
  authedUser,
  industry_id,
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
    industry_code: industry_id || user.industry_id,
    role_key: user.role || authedUser.role,
    isSuperAdmin,
  });

  const queryIndustry = isSuperAdmin
    ? industry_id
    : user.industry_id;

  const { items, total } = await organizationModel.listPaged({
    industry_id: queryIndustry,
    q,
    page,
    pageSize,
    sortField,
    sortDir,
    searchKeys: allowedFields.map(f => f.field_key),
  });

  // Enrich createdBy with human-readable name or role
  const userIds = items
    .map(org => org.createdBy || org.created_by)
    .filter(id => id && mongoose.Types.ObjectId.isValid(id));
  const users = await userModel.User.find({ _id: { $in: userIds } }).lean().exec();
  const userMap = users.reduce((acc, u) => {
    acc[u._id.toString()] = u;
    return acc;
  }, {});

  const enrichedItems = items.map(org => {
    const creatorId = (org.createdBy || org.created_by)?.toString();
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
      created_by: createdByVal,
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
  if (org && !isSuperAdmin && org.industry_id && org.industry_id !== user.industry_id) {
    return null;
  }
  if (org) {
    const creatorId = (org.createdBy || org.created_by)?.toString();
    if (creatorId && mongoose.Types.ObjectId.isValid(creatorId)) {
      const creator = await userModel.User.findById(creatorId).lean().exec();
      let createdByVal = creatorId;
      if (creator) {
        createdByVal = creator.role === 'superAdmin' ? 'Super Admin' : (creator.organizationName || creator.name || creator.email);
      }
      org.createdBy = createdByVal;
      org.created_by = createdByVal;
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

  const industry_id = (isSuperAdmin || !user)
    ? payload.industryId || payload.industry_id || payload.fields?.industryId || payload.fields?.industry_id || payload.industry || payload.fields?.industry || (user ? user.industryId || user.industry_id : null)
    : (user ? user.industryId || user.industry_id : null);

  const { fields: allowedFields } = await resolveAllowedFormFields({
    industry_code: industry_id,
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
      const fields = await fieldModel.list({ screen_id: screen._id, activeOnly: true });
      for (const f of fields) {
        if (mergedWithDefaults[f.field_key] === undefined && f.default_value !== undefined && f.default_value !== null) {
          mergedWithDefaults[f.field_key] = f.default_value;
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
    organization_id: orgId,
    industryId: industry_id,
    is_active: payload.is_active !== false,
    createdBy: creatorId,
    created_by: creatorId,
  });

  // Automatically create an Admin user for this organization
  const orgName = cleaned.organizationName || cleaned.organization_name || (cleaned.firstName
    ? `${cleaned.firstName} ${cleaned.lastName || ''}`.trim()
    : cleaned.name || payload.name || 'Organization');
  const orgEmail = cleaned.emailId || cleaned.email || payload.email;
  let adminEmail = orgEmail || `admin@${(cleaned.code || payload.code || 'org').toLowerCase()}.com`;
  
  // Ensure unique admin email
  const existingUser = await userModel.User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (existingUser) {
    adminEmail = `admin-${Date.now()}@${(cleaned.code || payload.code || 'org').toLowerCase()}.com`;
  }

  const adminName = `${orgName} Admin`;
  
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
    organizationId: orgDoc.organizationId || orgDoc.organization_id,
    industryId: industry_id,
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
            created_by: n.created_by
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

  return orgDoc;
};

exports.update = async ({ id, payload, authedUser }) => {
  const user = await resolveActor(authedUser);
  const isSuperAdmin = (user.role || authedUser.role) === 'superAdmin';

  const existing = await organizationModel.findById(id);
  if (!existing) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }
  if (!isSuperAdmin && existing.industry_id && existing.industry_id !== user.industry_id) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }

  const { fields: allowedFields } = await resolveAllowedFormFields({
    industry_code: existing.industry_id,
    role_key: user.role || authedUser.role,
    isSuperAdmin,
  });
  const cleaned = pickAllowed(payload?.fields ?? payload ?? {}, allowedFields);

  const patch = { ...cleaned };
  if (isSuperAdmin && payload.industry_id) patch.industry_id = payload.industry_id;

  let newActive = undefined;
  const rawStatus = payload.status ?? payload.fields?.status ?? cleaned.status ?? 
                    payload.isActive ?? payload.fields?.isActive ?? cleaned.isActive ??
                    payload.is_active ?? payload.fields?.is_active ?? cleaned.is_active;

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
    patch.is_active = newActive;
    patch.status = newActive ? 'ACTIVE' : 'INACTIVE';
    
    const userUpdate = {
      isActive: newActive,
      is_active: newActive,
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
    await userModel.User.updateMany(
      {
        $or: [
          { organizationId: existing._id },
          { organizationId: existing.organizationId || existing.organization_id }
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
  if (!isSuperAdmin && existing.industry_id && existing.industry_id !== user.industry_id) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }
  
  // Cascade delete all users belonging to this organization's industryId / industry_id
  const targetIndustry = existing.industryId || existing.industry_id;
  if (targetIndustry) {
    const deleteResult = await userModel.User.deleteMany({
      $or: [
        { industryId: targetIndustry },
        { industry_id: targetIndustry }
      ],
      role: { $ne: 'superAdmin' }
    });
    console.log(`[organizationService] Cascade deleted ${deleteResult.deletedCount} users for industry: ${targetIndustry}`);
  }

  return organizationModel.remove(id);
};
