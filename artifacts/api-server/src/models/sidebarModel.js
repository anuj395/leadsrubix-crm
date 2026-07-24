const mongoose = require('mongoose');

const ALLOWED_ROLES = ['admin', 'leadManager', 'teamLead', 'sales'];

const menuItemSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  route: { type: String },
  icon: { type: String },
  module: { type: String },
}, { _id: false });

const sidebarSchema = new mongoose.Schema({
  industry_id: { type: String, required: true, alias: 'industryId' },
  roles: {
    admin: { type: [menuItemSchema], default: [] },
    lead_manager: { type: [menuItemSchema], default: [], alias: 'leadManager' },
    team_lead: { type: [menuItemSchema], default: [], alias: 'teamLead' },
    sales: { type: [menuItemSchema], default: [] },
  },
  is_ready_to_launch: { type: Boolean, default: false },
}, { 
  timestamps: true,
  toObject: { virtuals: true, getters: true },
  toJSON: { virtuals: true, getters: true }
});

// use explicit collection name 'sidebar_configs'
sidebarSchema.index({ industry_id: 1 }, { unique: true, name: 'idx_industry_id' });
const SidebarConfig = mongoose.model('SidebarConfig', sidebarSchema, 'sidebar_configs');

exports.upsertRole = async ({ industryId, role, menus }) => {
  if (!industryId || !role) {
    const err = new Error('industryId and role are required');
    err.status = 400;
    throw err;
  }
  if (!ALLOWED_ROLES.includes(role)) {
    const err = new Error(`invalid role; allowed roles: ${ALLOWED_ROLES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const safeIndustry = String(industryId);
  const normalized = Array.isArray(menus) ? menus.map(m => {
    const item = { key: String(m.key || ''), name: String(m.name || '') };
    if (m.route !== undefined) item.route = String(m.route);
    if (m.icon !== undefined) item.icon = String(m.icon);
    if (m.module !== undefined) item.module = String(m.module);
    return item;
  }) : [];

  for (const m of normalized) {
    if (!m.key || !m.name) {
      const err = new Error('each menu item must have string "key" and "name"');
      err.status = 400;
      throw err;
    }
  }

  const keys = normalized.map(m => m.key);
  const dup = keys.find((k, i) => keys.indexOf(k) !== i);
  if (dup) {
    const err = new Error(`duplicate menu key provided: ${dup}`);
    err.status = 400;
    throw err;
  }

  const update = { $set: {} };
  update.$set[`roles.${role}`] = normalized;
  update.$set.updatedAt = new Date();

  await SidebarConfig.updateOne({ industryId: safeIndustry }, update, { upsert: true }).exec();

  const doc = await SidebarConfig.findOne({ industryId: safeIndustry }).lean().exec();
  if (!doc) {
    const err = new Error('failed to upsert sidebar config');
    err.status = 500;
    throw err;
  }

  const ready = ALLOWED_ROLES.every(rk => Array.isArray(doc.roles && doc.roles[rk]) && doc.roles[rk].length > 0);
  if (doc.is_ready_to_launch !== ready) {
    await SidebarConfig.updateOne({ industryId: safeIndustry }, { $set: { is_ready_to_launch: ready } }).exec();
    doc.is_ready_to_launch = ready;
  }

  return { document: doc, created: false };
};

exports.findByIndustry = async (industryId) => {
  if (!industryId) return null;
  return SidebarConfig.findOne({ industryId }).lean().exec();
};

exports.getRoleMenus = async (industryId, role) => {
  if (!industryId || !role) return [];
  if (!ALLOWED_ROLES.includes(role)) {
    const err = new Error(`invalid role; allowed roles: ${ALLOWED_ROLES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const doc = await SidebarConfig.findOne({ industryId }).lean().exec();
  if (!doc) return [];
  return (doc.roles && doc.roles[role]) || [];
};

exports.deleteAll = async () => SidebarConfig.deleteMany({});
