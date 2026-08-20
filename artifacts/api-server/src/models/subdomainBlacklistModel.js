// src/models/subdomainBlacklistModel.js
// Stores permanently retired/blacklisted subdomains so deleted workspaces cannot be reallocated.
const mongoose = require('mongoose');

const subdomainBlacklistSchema = new mongoose.Schema(
  {
    subdomain: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    organization_id: {
      type: String,
      required: true,
      alias: 'organizationId',
    },
    organization_name: {
      type: String,
      default: '',
      alias: 'organizationName',
    },
    retired_at: {
      type: Date,
      default: Date.now,
      alias: 'retiredAt',
    },
    retired_by: {
      type: String,
      default: 'Super Admin',
      alias: 'retiredBy',
    },
    reason: {
      type: String,
      default: 'TOMBSTONE_DELETED_WORKSPACE',
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true },
  }
);

subdomainBlacklistSchema.index({ subdomain: 1 }, { unique: true, name: 'idx_subdomain_blacklist' });

const SubdomainBlacklist = mongoose.model('SubdomainBlacklist', subdomainBlacklistSchema, 'subdomain_blacklists');

exports.SubdomainBlacklist = SubdomainBlacklist;

exports.isBlacklisted = async (subdomain) => {
  if (!subdomain) return false;
  const lower = String(subdomain).toLowerCase().trim();
  const found = await SubdomainBlacklist.findOne({ subdomain: lower }).lean().exec();
  return !!found;
};

exports.blacklistSubdomain = async ({ subdomain, organizationId, organizationName, retiredBy, reason }) => {
  if (!subdomain) return null;
  const lower = String(subdomain).toLowerCase().trim();
  const existing = await SubdomainBlacklist.findOne({ subdomain: lower }).exec();
  if (existing) return existing;

  return SubdomainBlacklist.create({
    subdomain: lower,
    organization_id: organizationId,
    organization_name: organizationName || '',
    retired_at: new Date(),
    retired_by: retiredBy || 'Super Admin',
    reason: reason || 'TOMBSTONE_DELETED_WORKSPACE',
  });
};
