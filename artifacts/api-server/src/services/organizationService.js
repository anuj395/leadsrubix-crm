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
async function resolveAllowedFormFields({ industryCode, roleKey, industry_code, role_key, isSuperAdmin, isGuestSignup }) {
  const code = industryCode || industry_code;
  const rKey = roleKey || role_key;
  const screen = await screenModel.findByKey(ORG_SCREEN_KEY, isGuestSignup ? null : undefined);
  if (!screen || !screen.isActive) {
    return { screen: null, fields: [] };
  }
  const fields = await fieldModel.list({ screenId: screen._id, activeOnly: true });

  if (isSuperAdmin || isGuestSignup) {
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

function pickAllowed(payload, allowedFieldDefs, isCreate = false) {
  const cleaned = {};
  
  const allowedMap = {};
  allowedFieldDefs.forEach(f => {
    const camel = (f.field_key || f.fieldKey || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    allowedMap[camel] = f;
  });

  const normalizedPayload = {};
  // First pass: copy camelCase keys (stale/initial values)
  for (const [k, v] of Object.entries(payload || {})) {
    if (!k.includes('_')) {
      normalizedPayload[k] = v;
    }
  }
  // Second pass: copy snake_case keys (actual updated input fields) to overwrite stale ones
  for (const [k, v] of Object.entries(payload || {})) {
    if (k.includes('_')) {
      const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      normalizedPayload[camelKey] = v;
    }
  }

  for (const [camelKey, v] of Object.entries(normalizedPayload)) {
    const fieldDef = allowedMap[camelKey];
    if (fieldDef) {
      cleaned[camelKey] = v;
    }
  }

  const missing = [];
  if (isCreate) {
    allowedFieldDefs.forEach(f => {
      if (f.is_required || f.isRequired) {
        const fieldKey = f.field_key || f.fieldKey || '';
        if (fieldKey === 'cost_per_license' || fieldKey === 'valid_till' || fieldKey === 'costPerLicense' || fieldKey === 'validTill') {
          return;
        }
        const camel = fieldKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
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
  }

  // Dynamic Format Validation
  allowedFieldDefs.forEach(f => {
    const fieldKey = f.field_key || f.fieldKey || '';
    const camel = fieldKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    const val = cleaned[camel];

    if (val !== undefined && val !== null && val !== '') {
      if (f.type === 'email' || fieldKey.toLowerCase().includes('email')) {
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(String(val))) {
          const err = new Error(`Invalid Email format for ${f.label || fieldKey}`);
          err.status = 400;
          throw err;
        }
      }

      if (f.type === 'phone' || fieldKey.toLowerCase().includes('phone') || fieldKey.toLowerCase().includes('contact')) {
        const rawDigits = String(val).replace(/\D/g, '');
        if (rawDigits.length < 7 || rawDigits.length > 15) {
          const err = new Error(`Invalid Contact Number for ${f.label || fieldKey}. Must be between 7 and 15 digits.`);
          err.status = 400;
          throw err;
        }
      }

      if (fieldKey.toLowerCase().includes('pincode') || fieldKey.toLowerCase().includes('pin_code')) {
        const pincodeRx = /^[1-9][0-9]{5}$/;
        if (!pincodeRx.test(String(val))) {
          const err = new Error(`Invalid Pincode for ${f.label || fieldKey}. Must be a valid 6-digit code.`);
          err.status = 400;
          throw err;
        }
      }

      if (f.type === 'number') {
        if (isNaN(Number(val))) {
          const err = new Error(`${f.label || fieldKey} must be a valid number.`);
          err.status = 400;
          throw err;
        }
      }
    }
  });

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
    organizationId: isSuperAdmin ? undefined : (user.organizationId || user.organization_id),
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
    const org = orgDoc.toObject ? orgDoc.toObject() : { ...orgDoc };
    const creatorId = (org.createdBy)?.toString();
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
  if (org && !isSuperAdmin) {
    const userOrgId = user.organizationId || user.organization_id;
    const targetOrgId = org.organizationId || org.organization_id || String(org._id);
    if (userOrgId && targetOrgId && userOrgId !== targetOrgId) {
      const err = new Error('Unauthorized cross-tenant access'); err.status = 403; throw err;
    }
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
    isGuestSignup: !user,
  });
  const cleaned = pickAllowed(payload?.fields ?? payload ?? {}, allowedFields, true);

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
    const err = new Error(`Number of Employees(Licenses) (${numEmployeesVal}) cannot exceed the trial period licenses limit (${trialPeriodLicenses}).`);
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
    industryId: industryId,
    isActive: payload.isActive !== false,
    createdBy: creatorId,
  });

  const Workspace = mongoose.model('Workspace');
  const workspaceId = 'ws_' + orgId;
  await Workspace.create({
    workspace_id: workspaceId,
    organization_id: orgId,
    industry_id: industryId,
    status: 'ACTIVE',
    created_by: creatorId,
  });

  const { cloneWorkspace } = require('./workspaceCloner');
  await cloneWorkspace(orgId, workspaceId, industryId);

  // Automatically create an Admin user for this organization
  const firstNameVal = cleaned.firstName || cleaned.first_name || '';
  const lastNameVal = cleaned.lastName || cleaned.last_name || '';
  const orgName = cleaned.organizationName || cleaned.organization_name || (firstNameVal
    ? `${firstNameVal} ${lastNameVal}`.trim()
    : cleaned.name || payload.name || 'Organization');
  const orgEmail = cleaned.emailId || cleaned.email_id || cleaned.email || payload.email;
  let adminEmail = orgEmail || `admin@${(cleaned.code || payload.code || 'org').toLowerCase()}.com`;
  
  // Ensure unique admin email
  const existingUser = await mongoose.model('User').findOne({ email: adminEmail.toLowerCase().trim() });
  if (existingUser) {
    adminEmail = `admin-${Date.now()}@${(cleaned.code || payload.code || 'org').toLowerCase()}.com`;
  }

  const adminName = firstNameVal
    ? `${firstNameVal} ${lastNameVal}`.trim()
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
    organizationId: orgDoc.organizationId,
    workspaceId: workspaceId,
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

  // Automatically clone Super Admin resources for the specific industry for the new organization
  try {
    const OrganizationResources = mongoose.model('OrganizationResources');
    const orgInd = String(orgDoc.industry_id || orgDoc.industryId || 'TEMP0001');
    const Industry = mongoose.model('Industry');
    let indDoc = await Industry.findOne({
      $or: [
        { code: orgInd.toLowerCase() },
        { code: orgInd.toUpperCase() },
        { _id: mongoose.Types.ObjectId.isValid(orgInd) ? orgInd : null }
      ]
    }).lean().exec();

    const indCode = indDoc ? indDoc.code : orgInd;
    const indIdStr = indDoc ? String(indDoc._id) : orgInd;

    const globalResDoc = await OrganizationResources.findOne({
      $and: [
        { $or: [{ organizationId: null }, { organization_id: null }, { organizationId: '' }, { organization_id: '' }] },
        {
          $or: [
            { industryId: indCode },
            { industry_id: indCode },
            { industryId: indCode.toUpperCase() },
            { industry_id: indCode.toUpperCase() },
            { industryId: indCode.toLowerCase() },
            { industry_id: indCode.toLowerCase() },
            { industryId: indIdStr },
            { industry_id: indIdStr }
          ]
        }
      ]
    }).exec();

    if (globalResDoc) {
      // Find or create resources doc for the new organizationId
      let orgResDoc = await OrganizationResources.findOne({
        $or: [{ organizationId: orgId }, { organization_id: orgId }]
      }).exec();
      if (!orgResDoc) {
        orgResDoc = new OrganizationResources({
          organizationId: orgId,
          organization_id: orgId,
          industryId: indCode.toUpperCase(),
          industry_id: indCode.toUpperCase()
        });
      } else {
        orgResDoc.industryId = indCode.toUpperCase();
        orgResDoc.industry_id = indCode.toUpperCase();
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
        'propertyStatuses'
      ];

      resourceFields.forEach(field => {
        if (globalResDoc[field] && Array.isArray(globalResDoc[field]) && globalResDoc[field].length > 0) {
          orgResDoc[field] = [...globalResDoc[field]];
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
  if (!isSuperAdmin) {
    const userOrgId = user.organizationId || user.organization_id;
    const existingOrgId = existing.organizationId || existing.organization_id || String(existing._id);
    if (userOrgId && existingOrgId && userOrgId !== existingOrgId) {
      const err = new Error('Unauthorized cross-tenant modification'); err.status = 403; throw err;
    }
  }

  const { fields: allowedFields } = await resolveAllowedFormFields({
    industry_code: existing.industryId,
    role_key: user.role || authedUser.role,
    isSuperAdmin,
  });
  const cleaned = pickAllowed(payload?.fields ?? payload ?? {}, allowedFields);

  const patch = { ...cleaned };
  if (isSuperAdmin && payload.industryId) patch.industryId = payload.industryId;

  // Support direct subdomain, customDomain, appName, logoUrl, primaryColor updates from DomainSettings
  if (payload.subdomain !== undefined) patch.subdomain = payload.subdomain;
  if (payload.customDomain !== undefined) patch.customDomain = payload.customDomain;
  if (payload.appName !== undefined) patch.appName = payload.appName;
  if (payload.logoUrl !== undefined) patch.logoUrl = payload.logoUrl;
  if (payload.primaryColor !== undefined) patch.primaryColor = payload.primaryColor;

  // 1a. Subdomain Format & Uniqueness Validation
  if (patch.subdomain !== undefined && patch.subdomain !== null && patch.subdomain !== '') {
    const cleanSub = String(patch.subdomain).toLowerCase().trim();
    const reservedSubdomains = new Set(['www', 'api', 'app', 'admin', 'mail', 'smtp', 'pop', 'imap', 'ftp', 'custom', 'auth', 'dev', 'staging']);
    if (reservedSubdomains.has(cleanSub)) {
      const err = new Error(`Subdomain '${cleanSub}' is reserved and cannot be used.`);
      err.status = 400;
      throw err;
    }
    const subRx = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!subRx.test(cleanSub) || cleanSub.length < 3 || cleanSub.length > 63) {
      const err = new Error(`Invalid subdomain '${cleanSub}'. Must be 3-63 lowercase alphanumeric characters and hyphens.`);
      err.status = 400;
      throw err;
    }
    const Organization = mongoose.model('Organization');
    const existingSub = await Organization.findOne({
      _id: { $ne: existing._id },
      subdomain: cleanSub
    }).lean().exec();
    if (existingSub) {
      const err = new Error(`Subdomain '${cleanSub}' is already in use by another organization.`);
      err.status = 400;
      throw err;
    }
    patch.subdomain = cleanSub;
  }

  // 1b. Custom Domain Format & Uniqueness Validation
  if (patch.customDomain !== undefined && patch.customDomain !== null && patch.customDomain !== '') {
    let cleanCustom = String(patch.customDomain).toLowerCase().trim();
    cleanCustom = cleanCustom.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const domainRx = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRx.test(cleanCustom)) {
      const err = new Error(`Invalid custom domain '${cleanCustom}'. Must be a valid FQDN (e.g. crm.yourcompany.com).`);
      err.status = 400;
      throw err;
    }
    const Organization = mongoose.model('Organization');
    const existingCustom = await Organization.findOne({
      _id: { $ne: existing._id },
      custom_domain: cleanCustom
    }).lean().exec();
    if (existingCustom) {
      const err = new Error(`Custom domain '${cleanCustom}' is already registered to another organization.`);
      err.status = 400;
      throw err;
    }
    patch.customDomain = cleanCustom;
  }

  // 1. Valid Till Date Validation & Automatic Subscription Renewal Flow
  if (patch.validTill) {
    const targetDate = new Date(patch.validTill);
    const currentDate = new Date();
    if (targetDate <= currentDate) {
      const err = new Error('Valid Till date must be later than the current date');
      err.status = 400;
      throw err;
    }

    // Immediately renew active subscription status and transition from trial to active paid plan
    patch.paymentStatus = true;
    patch.payment_status = true;
    patch.status = 'ACTIVE';
    patch.trialPeriod = false;
    patch.trial_period = false;
    patch.isActive = true;
    patch.is_active = true;

    // Reactivate all users associated with this organization if previously deactivated due to subscription expiry
    try {
      const User = mongoose.model('User');
      const orgIdStr = existing.organizationId || existing.organization_id || existing._id.toString();
      await User.updateMany(
        {
          $or: [
            { organization_id: existing._id },
            { organization_id: orgIdStr },
            { organizationId: orgIdStr }
          ]
        },
        {
          $set: {
            is_active: true,
            status: 'active',
            deactivated_at: null
          }
        }
      );
    } catch (err) {
      console.error('[organizationService] Failed to reactivate users upon subscription renewal:', err);
    }
  }

  // 1b. Number of Employees / Active Users Validation
  if (patch.numEmployees !== undefined && patch.numEmployees !== null) {
    const User = mongoose.model('User');
    const activeUserCount = await User.countDocuments({
      organization_id: existing.organizationId || existing._id.toString(),
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
    organization_id: existing.organizationId || existing._id.toString(),
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
        { organization_id: existing.organizationId || existing._id.toString(), contactOwnerEmail: oldEmail },
        { $set: { contactOwnerEmail: newEmail } }
      );

      const Task = mongoose.model('Task');
      await Task.updateMany(
        { organization_id: existing.organizationId || existing._id.toString(), contactOwnerEmail: oldEmail },
        { $set: { contactOwnerEmail: newEmail } }
      );
      await Task.updateMany(
        { organization_id: existing.organizationId || existing._id.toString(), assignedTo: oldEmail },
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
      { organization_id: existing.organizationId || existing._id.toString() },
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
      is_active: newActive,
      status: newActive ? 'active' : 'inactive'
    };
    if (newActive) {
      userUpdate.activated_at = new Date();
      userUpdate.deactivated_at = null;
      patch.activatedAt = new Date();
      patch.deactivatedAt = null;
    } else {
      userUpdate.deactivated_at = new Date();
      patch.deactivatedAt = new Date();
    }
    
    // Update all users belonging to this organization (supporting both old ObjectId and new string matches)
    await mongoose.model('User').updateMany(
      {
        $or: [
          { organization_id: existing._id },
          { organization_id: existing.organizationId || existing.organization_id }
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
  if (!isSuperAdmin) {
    const err = new Error('Forbidden: Only Super Admin can delete organizations');
    err.status = 403;
    throw err;
  }
  const existing = await organizationModel.findById(id);
  if (!existing) {
    const err = new Error('Organization not found'); err.status = 404; throw err;
  }
  
  const orgId = existing.organizationId || existing.organization_id || String(existing._id);
  const mongoId = existing._id;
  const mongoIdStr = String(existing._id);

  console.log(`[organizationService] Starting Enterprise Cascade Deletion for Organization: ${orgId} (_id: ${mongoIdStr})`);

  // Build multi-key organization query filter matching both string orgId and Mongo ObjectId
  const orgFilter = {
    $or: [
      { organization_id: orgId },
      { organizationId: orgId },
      { organization_id: mongoId },
      { organizationId: mongoId },
      { organization_id: mongoIdStr },
      { organizationId: mongoIdStr }
    ]
  };

  // 1. Find all users belonging to this organization to match user-level references
  const User = mongoose.model('User');
  const orgUsers = await User.find(orgFilter).lean().exec();
  const userIds = orgUsers.map(u => u._id);

  // 2. Cascade delete Users
  const deleteUsersRes = await User.deleteMany(orgFilter);
  console.log(`[organizationService] 1/27 Cascade deleted ${deleteUsersRes.deletedCount} users`);

  // 3. Cascade delete Roles (organization-specific custom roles) and their permissions
  const Role = mongoose.model('Role');
  const orgRoles = await Role.find(orgFilter).lean().exec();
  const roleIds = orgRoles.map(r => r._id);
  const deleteRolesRes = await Role.deleteMany(orgFilter);
  console.log(`[organizationService] 2/27 Cascade deleted ${deleteRolesRes.deletedCount} roles`);

  const RoleActionPermission = mongoose.model('RoleActionPermission');
  const deleteActionPermsRes = await RoleActionPermission.deleteMany({ role_id: { $in: roleIds } });
  console.log(`[organizationService] Cascade deleted ${deleteActionPermsRes.deletedCount} role action permissions`);

  // 4. Cascade delete Contacts
  const Contact = mongoose.model('Contact');
  const contactFilter = {
    $or: [
      ...orgFilter.$or,
      { createdBy: { $in: userIds } },
      { contactOwnerId: { $in: userIds } }
    ]
  };
  const deleteContactsRes = await Contact.deleteMany(contactFilter);
  console.log(`[organizationService] 3/27 Cascade deleted ${deleteContactsRes.deletedCount} contacts`);

  // 4a. Cascade delete Accounts
  try {
    const accountModel = require('../models/accountModel');
    const Account = accountModel.Account || mongoose.model('Account');
    if (Account) {
      const deleteAccountsRes = await Account.deleteMany(orgFilter);
      console.log(`[organizationService] Cascade deleted ${deleteAccountsRes.deletedCount} accounts`);
    }
  } catch (err) {
    console.warn('[organizationService] Accounts cascade delete error:', err.message);
  }

  // 4b. Cascade delete Pipelines
  try {
    const pipelineModel = require('../models/pipelineModel');
    const Pipeline = pipelineModel.Pipeline || mongoose.model('Pipeline');
    if (Pipeline) {
      const deletePipelinesRes = await Pipeline.deleteMany(orgFilter);
      console.log(`[organizationService] Cascade deleted ${deletePipelinesRes.deletedCount} pipelines`);
    }
  } catch (err) {
    console.warn('[organizationService] Pipelines cascade delete error:', err.message);
  }

  // 4c. Cascade delete Deals
  try {
    const dealModel = require('../models/dealModel');
    const Deal = dealModel.Deal || mongoose.model('Deal');
    if (Deal) {
      const dealFilter = {
        $or: [
          ...orgFilter.$or,
          { created_by: { $in: userIds } },
          { createdBy: { $in: userIds } },
          { owner_id: { $in: userIds } },
          { ownerId: { $in: userIds } }
        ]
      };
      const deleteDealsRes = await Deal.deleteMany(dealFilter);
      console.log(`[organizationService] Cascade deleted ${deleteDealsRes.deletedCount} deals`);
    }
  } catch (err) {
    console.warn('[organizationService] Deals cascade delete error:', err.message);
  }

  // 4d. Cascade delete Quotes
  try {
    const Quote = mongoose.model('Quote');
    if (Quote) {
      const deleteQuotesRes = await Quote.deleteMany(orgFilter);
      console.log(`[organizationService] Cascade deleted ${deleteQuotesRes.deletedCount} quotes`);
    }
  } catch (err) {
    console.warn('[organizationService] Quotes cascade delete error:', err.message);
  }

  // 5. Cascade delete Tasks
  const Task = mongoose.model('Task');
  const taskFilter = {
    $or: [
      ...orgFilter.$or,
      { createdBy: { $in: userIds } },
      { assignedToId: { $in: userIds } }
    ]
  };
  const deleteTasksRes = await Task.deleteMany(taskFilter);
  console.log(`[organizationService] 4/27 Cascade deleted ${deleteTasksRes.deletedCount} tasks`);

  // 6. Cascade delete Call Logs
  const CallLog = mongoose.model('CallLog');
  const callLogFilter = {
    $or: [
      ...orgFilter.$or,
      { createdBy: { $in: userIds } },
      { userId: { $in: userIds } }
    ]
  };
  const deleteCallLogsRes = await CallLog.deleteMany(callLogFilter);
  console.log(`[organizationService] 5/27 Cascade deleted ${deleteCallLogsRes.deletedCount} call logs`);

  // 7. Cascade delete Bookings
  const Booking = mongoose.model('Booking');
  const bookingFilter = {
    $or: [
      ...orgFilter.$or,
      { createdBy: { $in: userIds } }
    ]
  };
  const deleteBookingsRes = await Booking.deleteMany(bookingFilter);
  console.log(`[organizationService] 6/27 Cascade deleted ${deleteBookingsRes.deletedCount} bookings`);

  // 8. Cascade delete Lead Distribution Rules
  const LeadDistributionRule = mongoose.model('LeadDistributionRule');
  const deleteDistRulesRes = await LeadDistributionRule.deleteMany(orgFilter);
  console.log(`[organizationService] 7/27 Cascade deleted ${deleteDistRulesRes.deletedCount} lead distribution rules`);

  // 9. Cascade delete Lead Rotation Rules
  const LeadRotationRule = mongoose.model('LeadRotationRule');
  const deleteRotRulesRes = await LeadRotationRule.deleteMany(orgFilter);
  console.log(`[organizationService] 8/27 Cascade deleted ${deleteRotRulesRes.deletedCount} lead rotation rules`);

  // 10. Cascade delete API Tokens
  const ApiToken = mongoose.model('ApiToken');
  const deleteApiTokensRes = await ApiToken.deleteMany(orgFilter);
  console.log(`[organizationService] 9/27 Cascade deleted ${deleteApiTokensRes.deletedCount} API tokens`);

  // 11. Cascade delete API Data Logs
  const ApiData = mongoose.model('ApiData');
  const deleteApiDataRes = await ApiData.deleteMany(orgFilter);
  console.log(`[organizationService] 10/27 Cascade deleted ${deleteApiDataRes.deletedCount} API data logs`);

  // 12. Cascade delete WhatsApp Configs
  const WhatsAppConfig = mongoose.model('WhatsAppConfig');
  const deleteWhatsappRes = await WhatsAppConfig.deleteMany(orgFilter);
  console.log(`[organizationService] 11/27 Cascade deleted ${deleteWhatsappRes.deletedCount} WhatsApp configs`);

  // 13. Cascade delete Organization Resources
  const OrganizationResources = mongoose.model('OrganizationResources');
  const deleteResourcesRes = await OrganizationResources.deleteMany(orgFilter);
  console.log(`[organizationService] 12/27 Cascade deleted ${deleteResourcesRes.deletedCount} resource items`);

  // 14. Cascade delete Working Days
  const WorkingDay = mongoose.model('WorkingDay');
  const deleteWorkingDaysRes = await WorkingDay.deleteMany(orgFilter);
  console.log(`[organizationService] 13/27 Cascade deleted ${deleteWorkingDaysRes.deletedCount} working days`);

  // 15. Cascade delete Holidays
  const Holiday = mongoose.model('Holiday');
  const deleteHolidaysRes = await Holiday.deleteMany(orgFilter);
  console.log(`[organizationService] 14/27 Cascade deleted ${deleteHolidaysRes.deletedCount} holidays`);

  // 16. Cascade delete Teams
  const Team = mongoose.model('Team');
  const deleteTeamsRes = await Team.deleteMany(orgFilter);
  console.log(`[organizationService] 15/27 Cascade deleted ${deleteTeamsRes.deletedCount} teams`);

  // 17. Cascade delete Branches
  const Branch = mongoose.model('Branch');
  const deleteBranchesRes = await Branch.deleteMany(orgFilter);
  console.log(`[organizationService] 16/27 Cascade deleted ${deleteBranchesRes.deletedCount} branches`);

  // 18. Cascade delete Designations
  const Designation = mongoose.model('Designation');
  const deleteDesignationsRes = await Designation.deleteMany(orgFilter);
  console.log(`[organizationService] 17/27 Cascade deleted ${deleteDesignationsRes.deletedCount} designations`);

  // 19. Cascade delete Custom Screens
  const Screen = mongoose.model('Screen');
  const deleteScreensRes = await Screen.deleteMany(orgFilter);
  console.log(`[organizationService] 18/27 Cascade deleted ${deleteScreensRes.deletedCount} custom screens`);

  // 20. Cascade delete Custom Screen Fields
  const ScreenField = mongoose.model('ScreenField');
  const deleteScreenFieldsRes = await ScreenField.deleteMany(orgFilter);
  console.log(`[organizationService] 19/27 Cascade deleted ${deleteScreenFieldsRes.deletedCount} screen fields`);

  // 21. Cascade delete Custom Screen Field Permissions
  const ScreenPermission = mongoose.model('ScreenPermission');
  const deleteScreenPermsRes = await ScreenPermission.deleteMany(orgFilter);
  console.log(`[organizationService] 20/27 Cascade deleted ${deleteScreenPermsRes.deletedCount} screen permissions`);

  // 22. Cascade delete Custom Sidebar Menus
  const SidebarMenu = mongoose.model('SidebarMenu');
  const deleteMenusRes = await SidebarMenu.deleteMany(orgFilter);
  console.log(`[organizationService] 21/27 Cascade deleted ${deleteMenusRes.deletedCount} sidebar menus`);

  // 23. Cascade delete Custom Sidebar Permissions Matrix
  const SidebarPermission = mongoose.model('SidebarPermission');
  const deleteSidebarPermsRes = await SidebarPermission.deleteMany(orgFilter);
  console.log(`[organizationService] 22/27 Cascade deleted ${deleteSidebarPermsRes.deletedCount} sidebar permissions`);

  // 24. Cascade delete Analytics Dashboard Configs
  const AnalyticsConfig = mongoose.model('AnalyticsConfig');
  const deleteAnalyticsConfigRes = await AnalyticsConfig.deleteMany(orgFilter);
  console.log(`[organizationService] 23/27 Cascade deleted ${deleteAnalyticsConfigRes.deletedCount} analytics configs`);

  // 25. Cascade delete Bulk Import Logs
  const ImportLog = mongoose.model('ImportLog');
  const deleteImportLogsRes = await ImportLog.deleteMany(orgFilter);
  console.log(`[organizationService] 24/27 Cascade deleted ${deleteImportLogsRes.deletedCount} import logs`);

  // 26. Cascade delete News
  const News = mongoose.model('News');
  const deleteNewsRes = await News.deleteMany(orgFilter);
  console.log(`[organizationService] 25/27 Cascade deleted ${deleteNewsRes.deletedCount} news documents`);

  // 27. Cascade delete FAQs
  const FAQ = mongoose.model('FAQ');
  const deleteFaqRes = await FAQ.deleteMany(orgFilter);
  console.log(`[organizationService] 26/27 Cascade deleted ${deleteFaqRes.deletedCount} FAQ documents`);

  // Cascade delete Notifications
  const Notification = mongoose.model('Notification');
  const deleteNotificationsRes = await Notification.deleteMany(orgFilter);
  console.log(`[organizationService] Cascade deleted ${deleteNotificationsRes.deletedCount} notifications`);

  // Cascade delete Notification Settings
  const NotificationSetting = mongoose.model('NotificationSetting');
  const deleteNotificationSettingsRes = await NotificationSetting.deleteMany(orgFilter);
  console.log(`[organizationService] Cascade deleted ${deleteNotificationSettingsRes.deletedCount} notification settings`);

  // 28. Cascade delete Workspace Identity Mapping
  const Workspace = mongoose.model('Workspace');
  const workspaceFilter = {
    $or: [
      ...orgFilter.$or,
      { workspace_id: 'ws_' + orgId }
    ]
  };
  const deleteWorkspacesRes = await Workspace.deleteMany(workspaceFilter);
  console.log(`[organizationService] 27/27 Cascade deleted ${deleteWorkspacesRes.deletedCount} workspaces`);

  // Finally delete the Organization document itself
  console.log(`[organizationService] Completed Enterprise Cascade Deletion for Organization: ${orgId}`);
  return organizationModel.remove(id);
};
