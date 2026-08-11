// src/models/userModel.js
// mongoose-based user model implementation.
// Core auth fields are strict (email, password, role); freeform per-role
// dynamic fields live under `fields` (Mixed) so the SuperAdmin can attach
// any custom attributes configured through the screen-config system without
// schema migrations.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { withDualCase } = require('../utils/caseConverter');

// Predefined roles (machine-friendly keys)
exports.ROLES = ['sales', 'teamLead', 'leadManager', 'admin', 'superAdmin'];

const userSchema = new mongoose.Schema(
  {
    organization_name: { type: String, alias: 'organizationName' },
    first_name: { type: String, default: '', alias: 'firstName' },
    last_name: { type: String, default: '', alias: 'lastName' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: exports.ROLES, default: 'sales' },
    organization_id: { type: String, default: null, alias: 'organizationId' },
    workspace_id: { type: String, default: null, alias: 'workspaceId' },
    industry_id: { type: String, alias: 'industryId' },
    contact_number: { type: String, default: '', alias: 'contactNumber' },
    user_image: { type: String, default: '', alias: 'userImage' },
    designation: { type: String, default: '' },
    team: { type: String, default: '' },
    branch: { type: String, default: '' },
    branch_permission: { type: [String], default: [], alias: 'branchPermission' },
    status: { type: String, default: 'active' },
    is_active: { type: Boolean, default: true, alias: 'isActive' },
    reporting_to: { type: String, default: '', alias: 'reportingTo' },
    needs_password_change: { type: Boolean, default: false, alias: 'needsPasswordChange' },
    device_id: { type: String, default: '', alias: 'deviceId' },
    uid: { type: String, unique: true, index: true },
    latest_update_profile: { type: Boolean, default: false, alias: 'latestUpdateProfile' },
    activated_at: { type: Date, default: null, alias: 'activatedAt' },
    deactivated_at: { type: Date, default: null, alias: 'deactivatedAt' },
    created_by: { type: String, default: null, alias: 'createdBy' },
  },
  { 
    timestamps: true, 
    minimize: false,
    strict: false,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

function generateUid() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 28; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

userSchema.pre('save', async function (next) {
  if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$') && !this.password.startsWith('$2y$')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (!this.uid || String(this.uid).trim() === '') {
    this.uid = generateUid();
  }
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);
exports.User = User;

function shapePublic(u) {
  if (!u) return null;
  const fName = u.firstName || u.first_name || '';
  const lName = u.lastName || u.last_name || '';
  return withDualCase({
    _id: String(u._id),
    id: String(u._id),
    firstName: fName,
    lastName: lName,
    name: `${fName} ${lName}`.trim() || u.email,
    email: u.email,
    role: u.role,
    industryId: u.industryId || u.industry_id || '',
    isActive: u.isActive !== false && u.is_active !== false,
    status: (u.isActive !== false && u.is_active !== false) ? 'ACTIVE' : 'INACTIVE',
    reportingTo: u.reportingTo || u.reporting_to || '',
    organizationName: u.organizationName || u.organization_name || '',
    organizationId: u.organizationId || u.organization_id || '',
    workspaceId: u.workspaceId || u.workspace_id || '',
    needsPasswordChange: !!(u.needsPasswordChange || u.needs_password_change),
    contactNumber: u.contactNumber || u.contact_number || u.contact_no || '',
    userImage: u.userImage || u.user_image || '',
    designation: u.designation || '',
    team: u.team || '',
    branch: u.branch || '',
    branchPermission: u.branchPermission || u.branch_permission || [],
    uid: u.uid || '',
    deviceId: u.deviceId || u.device_id || '',
    latestUpdateProfile: !!(u.latestUpdateProfile || u.latest_update_profile),
    activatedAt: u.activatedAt || u.activated_at || null,
    deactivatedAt: u.deactivatedAt || u.deactivated_at || null,
    createdBy: u.createdBy || u.created_by || 'Super Admin',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    fields: u.fields || {},
  });
}
exports.shapePublic = shapePublic;

exports.findAll = async () => {
  const list = await User.find().select('-password').lean().exec();
  return list.map(shapePublic);
};

exports.list = async ({ industryId, role, excludeRole, organizationId } = {}) => {
  const q = {};
  if (industryId) q.industry_id = industryId;
  if (organizationId) q.organization_id = organizationId;
  if (role) q.role = role;
  if (excludeRole) {
    if (Array.isArray(excludeRole)) {
      q.role = { $nin: excludeRole };
    } else {
      q.role = { $ne: excludeRole };
    }
  }
  const list = await User.find(q).select('-password').sort({ createdAt: -1 }).lean().exec();
  return list.map(shapePublic);
};

/**
 * Paged list with optional `q` (matches name/email, case-insensitive) and
 * `sort` (`{ field: 1|-1 }`). Returns `{ items, total }` so the DataGrid can
 * drive server-side pagination.
 */
exports.listPaged = async ({
  industryId,
  organizationId,
  role,
  excludeRole,
  q: search,
  page = 0,
  pageSize = 25,
  sort,
} = {}) => {
  const filter = {};
  if (industryId) filter.industry_id = industryId;
  if (organizationId) filter.organization_id = organizationId;
  if (role) filter.role = role;
  if (excludeRole) {
    if (Array.isArray(excludeRole)) {
      filter.role = { $nin: excludeRole };
    } else {
      filter.role = { $ne: excludeRole };
    }
  }
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ email: rx }, { first_name: rx }, { last_name: rx }];
  }
  const sortSpec = sort && Object.keys(sort).length ? sort : { createdAt: -1 };
  const safePage = Math.max(0, (Number(page) || 1) - 1);
  const safeSize = Math.min(200, Math.max(1, Number(pageSize) || 25));

  const [list, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort(sortSpec)
      .skip(safePage * safeSize)
      .limit(safeSize)
      .lean()
      .exec(),
    User.countDocuments(filter).exec(),
  ]);
  return { items: list.map(shapePublic), total };
};

exports.findById = async (id) => {
  const u = await User.findById(id).select('-password').lean().exec();
  return shapePublic(u);
};

exports.findByEmail = async (email) => {
  return User.findOne({ email: String(email).toLowerCase().trim() }).exec();
};

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamelCase(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function normalizePayload(payload) {
  if (!payload) return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k.startsWith('$')) {
      out[k] = v;
      continue;
    }
    const snakeKey = k.includes('_') ? k : camelToSnakeCase(k);
    const camelKey = k.includes('_') ? snakeToCamelCase(k) : k;
    out[snakeKey] = v;
    out[camelKey] = v;
  }
  return out;
}

exports.create = async (data) => {
  const user = new User(normalizePayload(data));
  await user.save();
  return shapePublic(user.toObject());
};

exports.update = async (id, patch) => {
  const normalized = normalizePayload(patch);
  const $set = { ...normalized };
  const $unset = normalized.$unset;
  delete $set.$unset;

  if (patch.isActive !== undefined) {
    const isAct = !!patch.isActive;
    $set.is_active = isAct;
    $set.status = isAct ? 'ACTIVE' : 'INACTIVE';
  }
  if (patch.status !== undefined) {
    $set.status = String(patch.status).toUpperCase();
  }

  if (patch.password) {
    $set.password = await bcrypt.hash(String(patch.password), 10);
    $set.needs_password_change = false;
    $set.needsPasswordChange = false;
  }

  const updateQuery = { $set };
  if ($unset) {
    updateQuery.$unset = $unset;
  }

  const updated = await User.findByIdAndUpdate(id, updateQuery, { new: true })
    .select('-password')
    .lean()
    .exec();
  return shapePublic(updated);
};

exports.remove = async (id) => {
  await User.findByIdAndDelete(id).exec();
};
