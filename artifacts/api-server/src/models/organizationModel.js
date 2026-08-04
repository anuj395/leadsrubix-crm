const mongoose = require('mongoose');
const { withDualCase } = require('../utils/caseConverter');

/**
 * Organizations use a freeform schema (`strict: false`) because their
 * available fields are configured at runtime via the `organization` screen
 * in the screen-config system — exactly like Contacts. We track owner /
 * tenant scope and timestamps for ordering and access control.
 */
const organizationSchema = new mongoose.Schema(
  {
    organization_id: { type: String, alias: 'organizationId' },
    organization_name: { type: String, alias: 'organizationName' },
    contact_number: { type: String, default: '', alias: 'contactNumber' },
    industry_id: { type: String, default: null, alias: 'industryId' },
    allow_duplicate_leads: { type: Boolean, default: false, alias: 'allowDuplicateLeads' },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
    created_by: { type: String, default: null, alias: 'createdBy' },
    first_name: { type: String, alias: 'firstName' },
    last_name: { type: String, alias: 'lastName' },
    email_id: { type: String, alias: 'emailId' },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    pincode: { type: String },
    num_employees: { type: Number, alias: 'numEmployees' },
    address: { type: String },
    show_analytics: { type: Boolean, default: true, alias: 'showAnalytics' },
    show_data: { type: Boolean, default: true, alias: 'showData' },
    trial_period: { type: Boolean, default: true, alias: 'trialPeriod' },
    designations: { type: Array, default: [] },
    teams: { type: Array, default: [] },
    status: { type: String, default: 'ACTIVE' },
    cost_per_license: { type: Number, default: 1000, alias: 'costPerLicense' },
    org_trial_period_users_licenses: { type: Number, default: 10, alias: 'orgTrialPeriodUsersLicenses' },
    grace_period_days: { type: Number, default: 7, alias: 'gracePeriodDays' },
    trial_period_days: { type: Number, default: 7, alias: 'trialPeriodDays' },
    payment_status: { type: Boolean, default: true, alias: 'paymentStatus' },
    valid_from: { type: Date, alias: 'validFrom' },
    valid_till: { type: Date, alias: 'validTill' },
    subdomain: { type: String, trim: true, lowercase: true },
    custom_domain: { type: String, trim: true, lowercase: true, alias: 'customDomain' },
    logo_url: { type: String, default: '', alias: 'logoUrl' },
    primary_color: { type: String, default: '#1976d2', alias: 'primaryColor' },
    app_name: { type: String, default: 'Leads Rubix CRM', alias: 'appName' },
  },
  { 
    timestamps: true, 
    strict: false, 
    minimize: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

organizationSchema.index(
  { subdomain: 1 },
  { unique: true, partialFilterExpression: { subdomain: { $type: 'string', $gt: '' } }, name: 'idx_org_subdomain' }
);
organizationSchema.index(
  { custom_domain: 1 },
  { unique: true, partialFilterExpression: { custom_domain: { $type: 'string', $gt: '' } }, name: 'idx_org_custom_domain' }
);

const Organization = mongoose.model('Organization', organizationSchema, 'organizations');

exports.Organization = Organization;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shapePublic(org) {
  if (!org) return null;
  const o = org.toObject ? org.toObject() : { ...org };
  const mapped = {
    _id: String(o._id),
    id: String(o._id),
    organizationId: o.organizationId || o.organization_id || '',
    organizationName: o.organizationName || o.organization_name || '',
    contactNumber: o.contactNumber || o.contact_number || '',
    industryId: o.industryId || o.industry_id || '',
    allowDuplicateLeads: o.allowDuplicateLeads !== false && o.allow_duplicate_leads !== false,
    isActive: o.isActive !== false && o.is_active !== false,
    createdBy: o.createdBy || o.created_by || '',
    firstName: o.firstName || o.first_name || '',
    lastName: o.lastName || o.last_name || '',
    emailId: o.emailId || o.email_id || '',
    country: o.country || '',
    state: o.state || '',
    city: o.city || '',
    pincode: o.pincode || '',
    numEmployees: typeof o.numEmployees === 'number' ? o.numEmployees : (typeof o.num_employees === 'number' ? o.num_employees : 0),
    address: o.address || '',
    showAnalytics: o.showAnalytics !== false && o.show_analytics !== false,
    showData: o.showData !== false && o.show_data !== false,
    trialPeriod: o.trialPeriod !== false && o.trial_period !== false,
    paymentStatus: o.paymentStatus !== false && o.payment_status !== false,
    designations: o.designations || [],
    teams: o.teams || [],
    status: o.status || 'ACTIVE',
    costPerLicense: typeof o.costPerLicense === 'number' ? o.costPerLicense : (typeof o.cost_per_license === 'number' ? o.cost_per_license : 1000),
    orgTrialPeriodUsersLicenses: typeof o.orgTrialPeriodUsersLicenses === 'number' ? o.orgTrialPeriodUsersLicenses : (typeof o.org_trial_period_users_licenses === 'number' ? o.org_trial_period_users_licenses : 10),
    gracePeriodDays: typeof o.gracePeriodDays === 'number' ? o.gracePeriodDays : (typeof o.grace_period_days === 'number' ? o.grace_period_days : 7),
    trialPeriodDays: typeof o.trialPeriodDays === 'number' ? o.trialPeriodDays : (typeof o.trial_period_days === 'number' ? o.trial_period_days : 7),
    validFrom: o.validFrom || o.valid_from || null,
    validTill: o.validTill || o.valid_till || null,
    subdomain: o.subdomain || '',
    customDomain: o.customDomain || o.custom_domain || '',
    logoUrl: o.logoUrl || o.logo_url || '',
    primaryColor: o.primaryColor || o.primary_color || '#1976d2',
    appName: o.appName || o.app_name || 'Leads Rubix CRM',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };

  return withDualCase(mapped);
}
exports.shapePublic = shapePublic;

const ALLOWED_SORT = new Set(['createdAt', 'updatedAt', 'isActive']);

exports.listPaged = async ({
  industryId,
  q,
  page = 0,
  pageSize = 25,
  sortField,
  sortDir,
  searchKeys = [],
} = {}) => {
  const filter = {};
  if (industryId) filter.industry_id = industryId;
  if (q && String(q).trim()) {
    const re = new RegExp(escapeRegex(String(q).trim()), 'i');
    // Match against any of the screen-config field keys the caller exposes,
    // falling back to a couple of likely-used keys when nothing was passed in.
    const keys = searchKeys.length > 0 ? searchKeys : ['name', 'code', 'email'];
    filter.$or = keys.map((k) => ({ [k]: re }));
  }

  const safeSort = ALLOWED_SORT.has(sortField) ? sortField : 'createdAt';
  const dir = sortDir === 'asc' ? 1 : -1;
  const limit = Math.min(Math.max(Number(pageSize) || 25, 1), 200);
  const skip = Math.max(Number(page) || 0, 0) * limit;

  const [items, total] = await Promise.all([
    Organization.find(filter).sort({ [safeSort]: dir }).skip(skip).limit(limit).exec(),
    Organization.countDocuments(filter).exec(),
  ]);
  return { items: items.map(shapePublic), total };
};

function buildQueryFilter(id) {
  if (!id) return { _id: null };
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
  if (isObjectId) {
    return {
      $or: [
        { _id: id },
        { organization_id: id },
        { organizationId: id }
      ]
    };
  }
  return {
    $or: [
      { organization_id: id },
      { organizationId: id }
    ]
  };
}

exports.findById = async (id) => {
  const doc = await Organization.findOne(buildQueryFilter(id)).exec();
  return shapePublic(doc);
};

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizePayload(payload) {
  if (!payload) return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    const dbKey = k.includes('_') ? k : camelToSnakeCase(k);
    out[dbKey] = v;
  }
  if (!out.subdomain || String(out.subdomain).trim() === '') {
    delete out.subdomain;
  }
  if (!out.custom_domain || String(out.custom_domain).trim() === '') {
    delete out.custom_domain;
  }
  return out;
}

exports.create = async (payload) => {
  const doc = await Organization.create(normalizePayload(payload));
  return shapePublic(doc);
};

exports.update = async (id, patch) => {
  const normalizedPatch = normalizePayload(patch);
  const $set = { ...normalizedPatch };
  if (patch.organizationId !== undefined) {
    $set.organization_id = patch.organizationId;
    delete $set.organizationId;
  }
  if (patch.organizationName !== undefined) {
    $set.organization_name = patch.organizationName;
    delete $set.organizationName;
  }
  if (patch.contact_no !== undefined) {
    $set.contact_number = patch.contact_no;
    delete $set.contact_no;
  }
  if (patch.industryId !== undefined) {
    $set.industry_id = patch.industryId;
    delete $set.industryId;
  }
  if (patch.isActive !== undefined) {
    $set.is_active = patch.isActive;
    delete $set.isActive;
  }
  if (patch.createdBy !== undefined) {
    $set.created_by = patch.createdBy;
    delete $set.createdBy;
  }
  const updated = await Organization.findOneAndUpdate(buildQueryFilter(id), { $set }, { new: true }).exec();
  return shapePublic(updated);
};

exports.remove = async (id) => Organization.findOneAndDelete(buildQueryFilter(id)).exec();
