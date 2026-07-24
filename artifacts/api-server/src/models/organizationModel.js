const mongoose = require('mongoose');

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
  },
  { 
    timestamps: true, 
    strict: false, 
    minimize: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

const Organization = mongoose.model('Organization', organizationSchema, 'organizations');

exports.Organization = Organization;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  return { items, total };
};

exports.findById = async (id) => Organization.findById(id).exec();

exports.create = async (payload) => {
  const doc = await Organization.create(payload);
  return doc;
};

exports.update = async (id, patch) => {
  const $set = { ...patch };
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
  return Organization.findByIdAndUpdate(id, { $set }, { new: true }).exec();
};

exports.remove = async (id) => Organization.findByIdAndDelete(id).exec();
