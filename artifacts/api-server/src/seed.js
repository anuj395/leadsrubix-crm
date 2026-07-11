// src/seed.js
// Seeds collections from seed-data on first boot.
// - Idempotent: skips work when target collections already populated.
// - Bypasses pre-save hooks where the source data is already encoded
//   (e.g. bcrypted passwords, EJSON $oid/$date).
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const DEFAULT_INDUSTRIES = [
  {
    id: 'temp0001',
    name: 'Real Estate'
  }
];

const DEFAULT_SIDEBAR_CONFIGS = [
  {
    _id: new mongoose.Types.ObjectId('69e9f26fbc82449fb2eb7be6'),
    industryId: 'temp0001',
    is_ready_to_launch: true,
    roles: {
      admin: [
        { key: 'analytics', name: 'Analytics', route: '/analytics', icon: 'analytics', module: 'analytics' },
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'leads.booking', name: 'Bookings List', route: '/leads/bookings', icon: 'booking', module: 'leads' },
        { key: 'configuration.projects', name: 'Projects List', route: '/configuration/projects', icon: 'projects', module: 'configuration' },
        { key: 'configuration.whatsapp', name: 'Whatsapp API', route: '/configuration/whatsapp', icon: 'whatsapp', module: 'configuration' },
        { key: 'configuration.resources', name: 'Resources', route: '/configuration/resources', icon: 'resources', module: 'configuration' },
        { key: 'configuration.holiday', name: 'Holiday Config', route: '/configuration/holidayConfig', icon: 'holiday', module: 'configuration' },
        { key: 'configuration.days', name: 'Days Config', route: '/configuration/daysConfig', icon: 'days', module: 'configuration' },
        { key: 'integrations.integrations', name: 'Integrations', route: '/integrations', icon: 'integrations', module: 'integrations' },
        { key: 'integrations.api', name: 'API List', route: '/integrations/api', icon: 'api', module: 'integrations' },
        { key: 'integrations.apiData', name: 'API Data', route: '/integrations/api-data', icon: 'apiData', module: 'integrations' },
        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'account.subscription', name: 'Subscription Details', route: '/account/subscription-details', icon: 'subscription', module: 'account' },
        { key: 'account.password', name: 'Update Password', route: '/account/update-password', icon: 'password', module: 'account' },
        { key: 'leadDistribution.list', name: 'Lead Distribution List', route: '/leadDistribution/list', icon: 'list', module: 'leadDistribution' },
        { key: 'leadDistribution.reassignList', name: 'Reassign List', route: '/reassign/list', icon: 'reassignList', module: 'leadDistribution' }
      ],
      leadManager: [
        { key: 'analytics', name: 'Analytics', route: '/analytics', icon: 'analytics', module: 'analytics' },
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'tool.areaConverter', name: 'Area Converter', route: '/tool/areaConverter', icon: 'areaConverter', module: 'tool' },
        { key: 'tool.calculator', name: 'Calculator', route: '/tool/calculator', icon: 'calculator', module: 'tool' },
        { key: 'tool.emiCalculator', name: 'EMI Calculator', route: '/tool/emi-calculator', icon: 'emiCalculator', module: 'tool' }
      ],
      sales: [
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'tool.areaConverter', name: 'Area Converter', route: '/tool/areaConverter', icon: 'areaConverter', module: 'tool' },
        { key: 'tool.calculator', name: 'Calculator', route: '/tool/calculator', icon: 'calculator', module: 'tool' },
        { key: 'tool.emiCalculator', name: 'EMI Calculator', route: '/tool/emi-calculator', icon: 'emiCalculator', module: 'tool' }
      ],
      teamLead: [
        { key: 'analytics', name: 'Analytics', route: '/analytics', icon: 'analytics', module: 'analytics' },
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'tool.areaConverter', name: 'Area Converter', route: '/tool/areaConverter', icon: 'areaConverter', module: 'tool' },
        { key: 'tool.calculator', name: 'Calculator', route: '/tool/calculator', icon: 'calculator', module: 'tool' },
        { key: 'tool.emiCalculator', name: 'EMI Calculator', route: '/tool/emi-calculator', icon: 'emiCalculator', module: 'tool' }
      ]
    }
  }
];

const ROLE_DISPLAY_NAMES = {
  superAdmin: 'Super Administrator',
  admin: 'Administrator',
  leadManager: 'Lead Manager',
  teamLead: 'Team Lead',
  sales: 'Sales',
};

function reviveEjson(value) {
  if (Array.isArray(value)) return value.map(reviveEjson);
  if (value && typeof value === 'object') {
    if (typeof value.$oid === 'string') {
      return new mongoose.Types.ObjectId(value.$oid);
    }
    if (typeof value.$date === 'string' || typeof value.$date === 'number') {
      return new Date(value.$date);
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveEjson(v);
    return out;
  }
  return value;
}

function capitalize(s) {
  return String(s || '').replace(/^./, (c) => c.toUpperCase());
}

async function seedUsers() {
  const User = mongoose.model('User');
  const bcrypt = require('bcryptjs');
  const hashedDevPassword = bcrypt.hashSync('lead@1221', 10);

  // Ensure all existing users in the database are updated to password 'lead@1221'
  const list = await User.find({});
  for (const u of list) {
    const match = await bcrypt.compare('lead@1221', u.password);
    if (!match) {
      await User.updateOne({ _id: u._id }, { $set: { password: hashedDevPassword } });
      console.log(`[seed] reset password for user ${u.email} to 'lead@1221'`);
    }
  }

  // Ensure a known dev superAdmin is present — DEV/TEST environments only.
  // In production this is a hard backdoor, so it is gated explicitly.
  if (process.env.NODE_ENV !== 'production') {
    await ensureDevAdmin();
  } else {
    console.log('[seed] NODE_ENV=production — skipping dev superAdmin seed');
  }
}

async function ensureDevAdmin() {
  const User = mongoose.model('User');
  
  // Delete legacy dev superAdmin if exists
  await User.deleteOne({ email: 'dev@rubixcrm.dev' });
  
  const email = 'info@leadsrubix.com';
  const existing = await User.findOne({ email }).exec();
  
  // Hash password using bcrypt if updating directly, or save new user
  if (existing) {
    existing.name = 'Gourav Chopra';
    existing.password = 'lead@1221';
    existing.role = 'superAdmin';
    existing.industryId = undefined;
    existing.industryId = undefined;
    existing.isActive = undefined;
    existing.isActive = undefined;
    existing.reportingTo = undefined;
    existing.reporting_to = undefined;
    existing.needsPasswordChange = undefined;
    existing.needs_password_change = undefined;
    existing.fields = undefined;
    await existing.save();
    console.log(`[seed] updated single superAdmin: ${email}`);
    return;
  }

  const dev = new User({
    firstName: 'Gourav',
    lastName: 'Chopra',
    email,
    password: 'lead@1221',
    role: 'superAdmin',
  });
  await dev.save();
  console.log(`[seed] created single superAdmin: ${email} / lead@1221`);
}

/**
 * Migrates legacy `sidebar_configs` data (or seed JSON if no legacy data
 * present) into the normalized `industries`, `roles`, `sidebar_menus`,
 * `sidebar_permissions` collections, and drops the legacy collection.
 *
 * Idempotent — runs only when the `industries` collection is empty.
 */
async function migrateAndSeedSidebar() {
  const Industry = mongoose.model('Industry');
  const Role = mongoose.model('Role');
  const SidebarMenu = mongoose.model('SidebarMenu');
  const SidebarPermission = mongoose.model('SidebarPermission');

  const industryCount = await Industry.estimatedDocumentCount();
  if (industryCount > 0) {
    console.log(
      `[seed] industries already populated (${industryCount}) — skipping sidebar migration`,
    );
    return;
  }

  // Source 1: legacy sidebar_configs collection
  let sources = [];
  try {
    const collections = await mongoose.connection.db
      .listCollections({ name: 'sidebar_configs' })
      .toArray();
    if (collections.length) {
      const docs = await mongoose.connection.db
        .collection('sidebar_configs')
        .find({})
        .toArray();
      if (docs.length) sources = docs;
    }
  } catch (e) {
    /* swallow — collection may not exist */
  }

  // Source 2: inlined default configs
  if (!sources.length) {
    sources = DEFAULT_SIDEBAR_CONFIGS;
  }

  sources = sources.filter(src => String(src.industryId || '').toLowerCase().trim() === 'temp0001');

  if (!sources.length) {
    console.log('[seed] no legacy sidebar data found for temp0001 — skipping migration');
    return;
  }

  let menuCount = 0;
  let permCount = 0;

  for (const src of sources) {
    const industryCode = String(src.industryId || 'default').toLowerCase().trim();

    // Industry
    const industry = await Industry.findOneAndUpdate(
      { code: industryCode },
      { $setOnInsert: { code: industryCode, name: industryCode, isActive: true } },
      { upsert: true, new: true },
    );

    const rolesObj = src.roles || {};
    for (const [roleKey, menuList] of Object.entries(rolesObj)) {
      // Role
      const role = await Role.findOneAndUpdate(
        { industryId: industry._id, key: roleKey },
        {
          $setOnInsert: {
            industryId: industry._id,
            key: roleKey,
            name: ROLE_DISPLAY_NAMES[roleKey] || roleKey,
            isActive: true,
          },
        },
        { upsert: true, new: true },
      );

      // Menus + permissions
      const arr = Array.isArray(menuList) ? menuList : [];
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (!m || !m.key || !m.name) continue;

        const isChild = String(m.key).includes('.');
        const moduleKey = String(
          m.module || (isChild ? m.key.split('.')[0] : m.key),
        ).toLowerCase();

        let parentId = null;
        if (isChild) {
          const parent = await SidebarMenu.findOneAndUpdate(
            { key: moduleKey },
            {
              $setOnInsert: {
                key: moduleKey,
                name: capitalize(moduleKey),
                icon: moduleKey,
                module: moduleKey,
                parent_id: null,
                order: 0,
                isActive: true,
              },
            },
            { upsert: true, new: true },
          );
          parentId = parent._id;
          menuCount++;
        }

        const menu = await SidebarMenu.findOneAndUpdate(
          { key: m.key },
          {
            $setOnInsert: {
              key: m.key,
              name: m.name,
              icon: m.icon || '',
              route: m.route || '',
              parent_id: parentId,
              module: moduleKey,
              order: i,
              isActive: true,
            },
          },
          { upsert: true, new: true },
        );
        menuCount++;

        await SidebarPermission.updateOne(
          { roleId: role._id, industryId: industry._id, menu_id: menu._id },
          {
            $set: { is_visible: true, order_override: i },
            $setOnInsert: {
              roleId: role._id,
              industryId: industry._id,
              menu_id: menu._id,
            },
          },
          { upsert: true },
        );
        permCount++;
      }
    }
  }

  // Drop legacy collection so we don't accidentally read from it again.
  try {
    const legacy = await mongoose.connection.db
      .listCollections({ name: 'sidebar_configs' })
      .toArray();
    if (legacy.length) {
      await mongoose.connection.db.dropCollection('sidebar_configs');
      console.log('[seed] dropped legacy sidebar_configs collection');
    }
  } catch (e) {
    /* ignore */
  }

  console.log(
    `[seed] sidebar migration complete: ${menuCount} menu refs, ${permCount} permissions`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen / field / permission seed
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_DEFAULTS = [
  {
    key: 'contacts',
    name: 'Contacts',
    description: 'Customer / Lead Contact List',
    fields: [
      { field_key: 'customerName',      label: 'Customer Name',       type: 'text',     is_required: true,  order: 1 },
      { field_key: 'contactNumber',     label: 'Contact Number',      type: 'phone',    is_required: true,  order: 2 },
      { field_key: 'emailId',           label: 'Email ID',            type: 'email',    is_required: true,  order: 3 },
      { field_key: 'alternateNo',       label: 'Alternate Number',    type: 'phone',    is_required: false, order: 4 },
      { field_key: 'leadType',          label: 'Lead Type',           type: 'select',   is_required: true,  order: 5, dropdown_source: 'api', dropdown_api: '/api/options/leadType' },
      { field_key: 'location',          label: 'Location',            type: 'select',   is_required: false, order: 6, dropdown_source: 'api', dropdown_api: '/api/options/location' },
      { field_key: 'projectName',       label: 'Project Name',        type: 'select',   is_required: false, order: 7, dropdown_source: 'api', dropdown_api: '/api/options/projectName' },
      { field_key: 'propertyType',      label: 'Property Type',       type: 'select',   is_required: false, order: 8, dropdown_source: 'api', dropdown_api: '/api/options/propertyType' },
      { field_key: 'propertyStage',     label: 'Property Stage',      type: 'select',   is_required: false, order: 9, dropdown_source: 'api', dropdown_api: '/api/options/propertyStage' },
      { field_key: 'budget',            label: 'Budget',              type: 'select',   is_required: false, order: 10, dropdown_source: 'api', dropdown_api: '/api/options/budget' },
      { field_key: 'propertySubType',   label: 'Property Sub Type',   type: 'select',   is_required: false, order: 11, dropdown_source: 'api', dropdown_api: '/api/options/propertySubType' },
      { field_key: 'source',            label: 'Lead Source',         type: 'select',   is_required: false, order: 12, dropdown_source: 'api', dropdown_api: '/api/options/source' },
      { field_key: 'contactOwnerEmail', label: 'Contact Owner Email', type: 'select',   is_required: false, order: 13, dropdown_source: 'api', dropdown_api: '/api/options/organizationUsers' },
      { field_key: 'adset',             label: 'Ad Set',              type: 'text',     is_required: false, order: 14 },
      { field_key: 'campaign',          label: 'Campaign',            type: 'text',     is_required: false, order: 15 },
      { field_key: 'notes',             label: 'Notes',               type: 'textarea', is_required: false, order: 16 },
    ],
  },
  {
    key: 'tasks',
    name: 'Tasks',
    description: 'Lead / follow-up tasks',
    fields: [
      { field_key: 'taskType',     label: 'Type',          type: 'text',  is_required: true,  order: 1 },
      { field_key: 'status',        label: 'Status',        type: 'badge', is_required: false, order: 2 },
      { field_key: 'assignedTo',   label: 'Assigned To',   type: 'text',  is_required: false, order: 3 },
      { field_key: 'nextFollowUp',label: 'Next Follow-up',type: 'date',  is_required: false, order: 4 },
      { field_key: 'notes',         label: 'Notes',         type: 'textarea', is_required: false, order: 5 },
    ],
  },
  {
    key: 'users',
    name: 'Users',
    description: 'Per-role custom fields shown on the Add/Edit User form',
    fields: [
      { field_key: 'contactNumber', label: 'Contact Number', type: 'phone',  is_required: true,  order: 1 },
      { field_key: 'designation',   label: 'Designation',   type: 'select', is_required: true,  order: 2,
        dropdown_source: 'api', dropdown_api: '/api/options/designations' },
      { field_key: 'team',          label: 'Team',          type: 'select', is_required: true,  order: 3,
        dropdown_source: 'api', dropdown_api: '/api/options/teams' },
      { field_key: 'branch',        label: 'Branch',        type: 'select', is_required: true,  order: 4,
        dropdown_source: 'api', dropdown_api: '/api/options/branches' },
    ],
  },
  {
    key: 'organization',
    name: 'Organization',
    description: 'Organization records — fully dynamic table & form',
    fields: [
      { field_key: 'organizationName', label: 'Organization Name', type: 'text', is_required: true, order: 1 },
      { field_key: 'firstName',    label: 'First Name',    type: 'text',     is_required: false, order: 2 },
      { field_key: 'lastName',     label: 'Last Name',     type: 'text',     is_required: false, order: 3 },
      { field_key: 'contactNumber',    label: 'Contact Number', type: 'phone',    is_required: true,  order: 4 },
      { field_key: 'emailId',      label: 'Email ID',      type: 'email',    is_required: false, order: 5 },
      { field_key: 'country',       label: 'Country',       type: 'select',   is_required: true,  order: 6,
        dropdown_source: 'api', dropdown_api: '/api/options/countries' },
      { field_key: 'state',         label: 'State',         type: 'select',   is_required: true,  order: 7,
        dropdown_source: 'api', dropdown_api: '/api/options/states' },
      { field_key: 'city',          label: 'City',          type: 'text',     is_required: true,  order: 8 },
      { field_key: 'pincode',       label: 'Pincode',       type: 'text',     is_required: false, order: 9 },
      { field_key: 'industryId',   label: 'Industry ID',   type: 'select',   is_required: true,  order: 10,
        dropdown_source: 'api', dropdown_api: '/api/options/industries?launchedOnly=true' },
      { field_key: 'numEmployees', label: 'Number of Employees', type: 'number', is_required: false, order: 11 },
      { field_key: 'address',       label: 'Address',       type: 'textarea', is_required: false, order: 12 },
      { field_key: 'allowDuplicateLeads', label: 'Allow Duplicate Leads', type: 'checkbox', is_form_visible: false, default_value: true, order: 13 },
      { field_key: 'showAnalytics', label: 'Show Analytics', type: 'checkbox', is_form_visible: false, default_value: true, order: 14 },
      { field_key: 'showData', label: 'Show Data', type: 'checkbox', is_form_visible: false, is_table_visible: false, default_value: true, order: 15 },
      { field_key: 'trialPeriod', label: 'Trial Period', type: 'checkbox', is_form_visible: false, is_table_visible: false, default_value: true, order: 16 },
      { field_key: 'designations', label: 'Designations', type: 'text', is_form_visible: false, is_table_visible: false, default_value: [], order: 17 },
      { field_key: 'teams', label: 'Teams', type: 'text', is_form_visible: false, is_table_visible: false, default_value: [], order: 18 },
      { field_key: 'status', label: 'Status', type: 'text', is_form_visible: false, default_value: 'ACTIVE', order: 19 },
    ],
  },
  {
    key: 'bookings',
    name: 'Bookings',
    description: 'Customer booking records — fully dynamic table & form',
    fields: [
      { field_key: 'customerName', label: 'Customer Name', type: 'text',     is_required: true,  order: 1 },
      { field_key: 'contactNumber',    label: 'Phone Number',  type: 'text',     is_required: false, order: 2 },
      { field_key: 'project',       label: 'Project Name',  type: 'text',     is_required: false, order: 3 },
      { field_key: 'location',      label: 'Location',      type: 'text',     is_required: false, order: 4 },
      { field_key: 'branch',        label: 'Branch',        type: 'text',     is_required: false, order: 5 },
      { field_key: 'team',          label: 'Assigned Team',  type: 'text',     is_required: false, order: 6 },
    ],
  },
  {
    key: 'interested',
    name: 'Interested Lead Details',
    description: 'Dynamic form fields shown when converting a lead to Interested',
    fields: [
      { field_key: 'customerName',      label: 'Customer Name',       type: 'text',     is_required: true,  order: 1 },
      { field_key: 'alternateNo',       label: 'Alternate Number',    type: 'phone',    is_required: false, order: 2 },
      { field_key: 'location',          label: 'Location',            type: 'select',   is_required: true,  order: 3, dropdown_source: 'api', dropdown_api: '/api/options/location' },
      { field_key: 'projectName',       label: 'Project Name',        type: 'select',   is_required: true,  order: 4, dropdown_source: 'api', dropdown_api: '/api/options/projectName' },
      { field_key: 'taskType',          label: 'Next Follow Up Type', type: 'select',   is_required: true,  order: 5, dropdown_source: 'static', options: ['Call Back', 'Meeting', 'Site Visit'], default_value: 'Call Back' },
      { field_key: 'budget',            label: 'Budget',              type: 'select',   is_required: true,  order: 6, dropdown_source: 'api', dropdown_api: '/api/options/budget' },
      { field_key: 'propertyType',      label: 'Property Type',       type: 'select',   is_required: true,  order: 7, dropdown_source: 'api', dropdown_api: '/api/options/propertyType' },
      { field_key: 'propertyStage',     label: 'Property Stage',      type: 'select',   is_required: true,  order: 8, dropdown_source: 'api', dropdown_api: '/api/options/propertyStage' },
      { field_key: 'nextFollowUp',      label: 'Next Follow Up Date', type: 'date',     is_required: true,  order: 9 },
      { field_key: 'propertySubType',   label: 'Property Sub Type',   type: 'select',   is_required: true,  order: 10, dropdown_source: 'api', dropdown_api: '/api/options/propertySubType' },
      { field_key: 'source',            label: 'Lead Source',         type: 'select',   is_required: true,  order: 11, dropdown_source: 'api', dropdown_api: '/api/options/source' },
      { field_key: 'notes',             label: 'Note',               type: 'textarea', is_required: false, order: 12 },
    ],
  },
  {
    key: 'callback',
    name: 'Call Back Details',
    description: 'Dynamic form fields shown when converting a lead to Call Back',
    fields: [
      { field_key: 'callBackReason',  label: 'Call Back Reason',    type: 'select',   is_required: true,  order: 1, dropdown_source: 'static', options: ['Not Picked', 'On Request', 'Not Reachable', 'Switched Off'] },
      { field_key: 'nextFollowUp',      label: 'Next Follow Up Date', type: 'date',     is_required: true,  order: 2 },
      { field_key: 'notes',             label: 'Note',               type: 'textarea', is_required: false, order: 3 },
    ],
  },
  {
    key: 'notInterested',
    name: 'Not Interested Details',
    description: 'Dynamic form fields shown when converting a lead to Not Interested',
    fields: [
      { field_key: 'notIntReason',         label: 'Not Interested Reason', type: 'select',   is_required: true,  order: 1, dropdown_source: 'static', options: ['Not Budget Fit', 'Requirement Changed', 'Purchased Elsewhere', 'No Response', 'Other'] },
      { field_key: 'notes',                label: 'Enter Note',           type: 'textarea', is_required: false, order: 2 },
    ],
  },
  {
    key: 'lost',
    name: 'Lost Details',
    description: 'Dynamic form fields shown when converting a lead to Lost',
    fields: [
      { field_key: 'lostReason',           label: 'Lost Reason',          type: 'select',   is_required: true,  order: 1, dropdown_source: 'static', options: ['Not Budget Fit', 'Bought Competitor Property', 'Requirement Changed', 'Delayed Purchase', 'Other'] },
      { field_key: 'notes',                label: 'Note',                 type: 'textarea', is_required: false, order: 2 },
    ],
  },
  {
    key: 'reschedule',
    name: 'Reschedule Task',
    description: 'Dynamic form fields shown when rescheduling a follow-up task',
    fields: [
      { field_key: 'nextFollowUp',         label: 'Next Follow Up Date & Time', type: 'date',     is_required: true,  order: 1 },
      { field_key: 'notes',                label: 'Enter Note',                 type: 'textarea', is_required: false, order: 2 },
    ],
  },
  {
    key: 'configApi',
    name: 'API Integration',
    description: 'Manage incoming webhooks, country codes, and source triggers.',
    fields: [
      { field_key: 'organizationId', label: 'Organization', type: 'select', dropdown_source: 'api', dropdown_api: 'options/organizations', is_required: true, order: 1 },
      { field_key: 'source', label: 'Source', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceLeadSources?display=leadSource', is_required: true, order: 2 },
      { field_key: 'countryCode', label: 'Country Code', type: 'select', dropdown_source: 'api', dropdown_api: 'options/country_codes', is_required: true, order: 3 },
      { field_key: 'status', label: 'Status', type: 'select', dropdown_source: 'static', options: ['ACTIVE', 'INACTIVE'], is_required: true, order: 4 },
      { field_key: 'apiKey', label: 'API Key', type: 'text', is_form_visible: false, is_required: false, order: 5 },
      { field_key: 'createdAt', label: 'Created At', type: 'date', is_form_visible: false, is_required: false, order: 6 },
    ]
  },
  {
    key: 'configProjects',
    name: 'Projects Catalog',
    description: 'Catalog of property developments and sales listings.',
    fields: [
      { field_key: 'organizationId', label: 'Organization', type: 'select', dropdown_source: 'api', dropdown_api: 'options/organizations', is_required: true, order: 1 },
      { field_key: 'developerName', label: 'Developer Name', type: 'text', is_required: true, order: 2 },
      { field_key: 'projectName', label: 'Project Name', type: 'text', is_required: true, order: 3 },
      { field_key: 'propertyType', label: 'Property Type', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourcePropertyTypes', is_required: true, order: 4 },
      { field_key: 'propertyStage', label: 'Property Stage', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourcePropertyStages', is_required: true, order: 5 },
      { field_key: 'projectStatus', label: 'Property Status', type: 'select', dropdown_source: 'api', dropdown_api: 'options/propertyStatus', options: [], is_required: true, order: 6 },
      { field_key: 'address', label: 'Address', type: 'text', is_required: false, order: 7 },
      { field_key: 'reraLink', label: 'Rera Link', type: 'text', is_required: false, order: 8 },
      { field_key: 'walkthroughLink', label: 'Walkthrough Link', type: 'text', is_required: false, order: 9 },
      { field_key: 'createdAt', label: 'Created At', type: 'date', is_form_visible: false, is_required: false, order: 10 },
    ]
  },
  {
    key: 'resourceCarousel',
    name: 'Carousel Banners',
    description: 'Banners shown on mobile/web dashboard carousel',
    fields: [
      { field_key: 'url', label: 'Image URL', type: 'image', is_required: true, order: 1 },
      { field_key: 'imageName', label: 'Image Name', type: 'text', is_required: true, order: 2 },
    ]
  },
  {
    key: 'resourceLocations',
    name: 'Locations',
    description: 'Corporate and site branch locations',
    fields: [
      { field_key: 'locationName', label: 'Location Name', type: 'text', is_required: true, order: 1 },
    ]
  },
  {
    key: 'resourceLeadSources',
    name: 'Lead Sources',
    description: 'Marketing source channels',
    fields: [
      { field_key: 'leadSource', label: 'Lead Source Name', type: 'text', is_required: true, order: 1 },
      { field_key: 'leadSourceColor', label: 'Color Hex', type: 'text', is_required: false, order: 2 },
    ]
  },
  {
    key: 'resourceBudgets',
    name: 'Budgets',
    description: 'Standard budget options',
    fields: [
      { field_key: 'budget', label: 'Budget Range', type: 'text', is_required: true, order: 1 },
    ]
  },
  {
    key: 'resourceTransferReasons',
    name: 'Transfer Reasons',
    description: 'Reasons for transferring leads',
    fields: [
      { field_key: 'reason', label: 'Reason', type: 'text', is_required: true, order: 1 },
    ]
  },
  {
    key: 'resourcePropertyStages',
    name: 'Property Stages',
    description: 'Construction stages',
    fields: [
      { field_key: 'stage', label: 'Stage Name', type: 'text', is_required: true, order: 1 },
    ]
  },
  {
    key: 'resourcePropertyTypes',
    name: 'Property Types',
    description: 'Property categories',
    fields: [
      { field_key: 'propertyType', label: 'Property Type', type: 'text', is_required: true, order: 1 },
    ]
  },
  {
    key: 'resourcePropertySubTypes',
    name: 'Property Sub Types',
    description: 'Property subcategories',
    fields: [
      { field_key: 'propertyType', label: 'Property Type', type: 'select', dropdown_source: 'api', dropdown_api: '/api/options/resourcePropertyTypes?display=propertyType', is_required: true, order: 1 },
      { field_key: 'propertySubType', label: 'Property Sub Type', type: 'text', is_required: true, order: 2 },
    ]
  },
  {
    key: 'leadDistribution',
    name: 'Lead Distribution',
    description: 'Dynamic table headers & form fields configuration for Lead Distribution',
    fields: [
      { field_key: 'source', label: 'Lead Source', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceLeadSources?display=leadSource', is_required: true, order: 1 },
      { field_key: 'project', label: 'Project', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceProjects?display=projectName', is_required: false, order: 2 },
      { field_key: 'location', label: 'Location', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceLocations?display=locationName', is_required: false, order: 3 },
      { field_key: 'budget', label: 'Budget', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceBudgets?display=budget', is_required: false, order: 4 },
      { field_key: 'property_type', label: 'Property Type', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourcePropertyTypes?display=propertyType', is_required: false, order: 5 },
      { field_key: 'distribution_type', label: 'Distribution Type', type: 'select', dropdown_source: 'static', options: ['Normal', 'Roundrobin'], is_required: true, order: 6 },
      { field_key: 'users', label: 'Assigned Users', type: 'text', is_required: true, order: 7 }
    ]
  },
  {
    key: 'leadRotation',
    name: 'Lead Rotation',
    description: 'Dynamic table headers & form fields configuration for Reassign Logic',
    fields: [
      { field_key: 'source', label: 'Lead Source', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceLeadSources?display=leadSource', is_required: true, order: 1 },
      { field_key: 'project', label: 'Project', type: 'select', dropdown_source: 'api', dropdown_api: 'options/resourceProjects?display=projectName', is_required: false, order: 2 },
      { field_key: 'rotation_time', label: 'Rotation Time (mins)', type: 'number', is_required: true, order: 3 },
      { field_key: 'users', label: 'Assigned Users', type: 'text', is_required: true, order: 4 }
    ]
  }
];

async function seedScreens() {
  const Screen = mongoose.model('Screen');
  const ScreenField = mongoose.model('ScreenField');
  const ScreenPermission = mongoose.model('ScreenPermission');
  const Industry = mongoose.model('Industry');
  const Role = mongoose.model('Role');

  // Note: this seeder is fully idempotent (every write is an upsert), so we
  // intentionally re-run it on every boot instead of short-circuiting on a
  // non-empty `screens` collection. That way new screens added to
  // SCREEN_DEFAULTS (e.g. `organization`) get installed without dropping the DB.

  // Clean up deprecated resource_carousel and other snake_case screens
  const deprecatedKeys = [
    'resource_carousel', 'config_projects', 'config_api', 
    'resource_locations', 'resource_lead_sources', 'resource_budgets', 
    'resource_transfer_reasons', 'resource_property_stages', 
    'resource_property_types', 'resource_property_sub_types'
  ];
  await Screen.deleteMany({ key: { $in: deprecatedKeys } });

  // Upsert screens + fields.
  const fieldsByScreen = new Map();
  for (const spec of SCREEN_DEFAULTS) {
    const screen = await Screen.findOneAndUpdate(
      { key: spec.key },
      { $set: { name: spec.name, description: spec.description, isActive: true } },
      { upsert: true, new: true },
    );
    const fieldDocs = [];
    for (const f of spec.fields) {
      const doc = await ScreenField.findOneAndUpdate(
        { screen_id: screen._id, field_key: f.field_key },
        {
          $set: {
            label: f.label,
            type: f.type,
            is_table_visible: f.is_table_visible !== false,
            is_form_visible: f.is_form_visible !== false,
            is_required: !!f.is_required,
            sortable: true,
            order: f.order || 0,
            isActive: true,
            dropdown_source: f.dropdown_source || 'none',
            dropdown_api: f.dropdown_api || '',
            options: f.options || [],
            default_value: f.default_value !== undefined ? f.default_value : null,
          },
          $setOnInsert: { screen_id: screen._id, field_key: f.field_key },
        },
        { upsert: true, new: true },
      );
      fieldDocs.push(doc);
    }
    // Clean up any fields that are no longer in the spec.
    const specKeys = spec.fields.map((f) => f.field_key);
    await ScreenField.deleteMany({ screen_id: screen._id, field_key: { $nin: specKeys } });
    fieldsByScreen.set(String(screen._id), { screen, fields: fieldDocs });
  }

  // Enable all fields for every (industry × role) combo we know about, so the
  // existing ContactsList / TasksList pages have data out of the box.
  const industries = await Industry.find({ isActive: true }).lean().exec();
  const roles = await Role.find({ isActive: true }).lean().exec();

  let permCount = 0;
  for (const [, { screen, fields }] of fieldsByScreen) {
    for (const industry of industries) {
      const industryRoles = roles.filter((r) => String(r.industryId) === String(industry._id));
      for (const role of industryRoles) {
        for (const field of fields) {
          await ScreenPermission.updateOne(
            {
              screen_id: screen._id,
              roleId: role._id,
              industryId: industry._id,
              field_id: field._id,
            },
            {
              $set: { is_enabled: true },
              $setOnInsert: {
                screen_id: screen._id,
                roleId: role._id,
                industryId: industry._id,
                field_id: field._id,
              },
            },
            { upsert: true },
          );
          permCount += 1;
        }
      }
    }
  }

  console.log(
    `[seed] screens seeded: ${SCREEN_DEFAULTS.length} screens, ${permCount} permission rows`,
  );
}

/**
 * Upserts the curated industry list from `seed-data/industries.json`.
 *
 * - Inserts any missing entries (matched by `code` = lowercased seed `id`).
 * - Refreshes `name` on existing rows so display names stay in sync with the
 *   curated list, but never flips `isActive` (admins may have disabled one).
 * - Always runs on boot — it's a no-op once the rows already match.
 */
async function seedIndustries() {
  const Industry = mongoose.model('Industry');
  const Role = mongoose.model('Role');
  const entries = DEFAULT_INDUSTRIES;

  let inserted = 0;
  let updated = 0;
  for (const { id, name } of entries) {
    if (!id || !name) continue;
    const code = String(id).toLowerCase().trim();
    const result = await Industry.findOneAndUpdate(
      { code },
      {
        $set: { name: String(name) },
        $setOnInsert: { code, isActive: true, status: 'Launched' },
      },
      { upsert: true, new: false, includeResultMetadata: true },
    );
    if (!result?.lastErrorObject?.updatedExisting) inserted += 1;
    else updated += 1;
  }
  console.log(
    `[seed] industries: ${inserted} inserted, ${updated} refreshed`,
  );

  // Make sure every industry has the default tenant-scoped roles. Without
  // these, dynamic-form resolve calls 404 the moment an admin tries to add a
  // user under a freshly-seeded industry. `superAdmin` is intentionally NOT
  // a per-industry role — it's handled as a system-wide bypass.
  const DEFAULT_ROLES = ['superAdmin', 'admin', 'leadManager', 'teamLead', 'sales'];
  const allIndustries = await Industry.find({}).lean().exec();
  let rolesAdded = 0;
  for (const ind of allIndustries) {
    for (const key of DEFAULT_ROLES) {
      const r = await Role.findOneAndUpdate(
        { industryId: ind._id, key },
        {
          $setOnInsert: {
            industryId: ind._id,
            key,
            name: ROLE_DISPLAY_NAMES[key] || capitalize(key),
            isActive: true,
          },
        },
        { upsert: true, new: false, includeResultMetadata: true },
      );
      if (!r?.lastErrorObject?.updatedExisting) rolesAdded += 1;
    }
  }
  if (rolesAdded > 0) {
    console.log(`[seed] roles: ${rolesAdded} default role(s) inserted across industries`);
  }
}

async function seedContacts() {
  // Skip seeding contacts to rely solely on user-driven DB data
}

async function seedOrganizations() {
  // Skip seeding organizations to rely solely on user-driven DB data
}

async function seedBookings() {
  // Skip seeding bookings to rely solely on user-driven DB data
}

async function fixIntegrationsSidebar() {
  const SidebarMenu = mongoose.model('SidebarMenu');
  
  // 1. Rename integrations.api_list to integrations.api
  const apiListMenu = await SidebarMenu.findOne({ key: 'integrations.api_list' });
  if (apiListMenu) {
    const existingApi = await SidebarMenu.findOne({ key: 'integrations.api' });
    if (!existingApi) {
      await SidebarMenu.updateOne(
        { _id: apiListMenu._id },
        { 
          $set: { 
            key: 'integrations.api',
            route: '/integrations/api',
            name: 'API List',
            icon: 'api'
          } 
        }
      );
      console.log('[seed] migrated integrations.api_list to integrations.api');
    } else {
      await SidebarMenu.deleteOne({ _id: apiListMenu._id });
      console.log('[seed] deleted redundant integrations.api_list');
    }
  }

  // 2. Rename integrations.api_data to integrations.apiData
  const apiDataMenu = await SidebarMenu.findOne({ key: 'integrations.api_data' });
  if (apiDataMenu) {
    const existingApiData = await SidebarMenu.findOne({ key: 'integrations.apiData' });
    if (!existingApiData) {
      await SidebarMenu.updateOne(
        { _id: apiDataMenu._id },
        { 
          $set: { 
            key: 'integrations.apiData',
            route: '/integrations/api-data',
            name: 'API Data',
            icon: 'apiData'
          } 
        }
      );
      console.log('[seed] migrated integrations.api_data to integrations.apiData');
    } else {
      await SidebarMenu.deleteOne({ _id: apiDataMenu._id });
      console.log('[seed] deleted redundant integrations.api_data');
    }
  }

  // 3. Ensure integrations.integrations is updated
  const mainIntegrations = await SidebarMenu.findOne({ key: 'integrations.integrations' });
  if (mainIntegrations) {
    await SidebarMenu.updateOne(
      { _id: mainIntegrations._id },
      { 
        $set: { 
          route: '/integrations',
          name: 'Integrations',
          icon: 'integrations'
        } 
      }
    );
    console.log('[seed] verified integrations.integrations route and configuration');
  }

  // 4. Double check routes
  const apiMenu = await SidebarMenu.findOne({ key: 'integrations.api' });
  if (apiMenu && apiMenu.route !== '/integrations/api') {
    await SidebarMenu.updateOne({ _id: apiMenu._id }, { $set: { route: '/integrations/api', icon: 'api', name: 'API List' } });
    console.log('[seed] corrected route for integrations.api to /integrations/api');
  }

  const apiDataDoc = await SidebarMenu.findOne({ key: 'integrations.apiData' });
  if (apiDataDoc && apiDataDoc.route !== '/integrations/api-data') {
    await SidebarMenu.updateOne({ _id: apiDataDoc._id }, { $set: { route: '/integrations/api-data', icon: 'apiData', name: 'API Data' } });
    console.log('[seed] corrected route for integrations.apiData to /integrations/api-data');
  }
}

async function seedLeadDistributionSidebar() {
  const SidebarMenu = mongoose.model('SidebarMenu');
  const SidebarPermission = mongoose.model('SidebarPermission');
  const Industry = mongoose.model('Industry');
  const Role = mongoose.model('Role');

  // 1. Get industry temp0001
  const industry = await Industry.findOne({ code: 'temp0001' });
  if (!industry) return;

  // 2. Get admin role
  const adminRole = await Role.findOne({ industryId: industry._id, key: 'admin' });
  if (!adminRole) return;

  // Fix other parent menus orders in database for stable sorting
  await SidebarMenu.updateOne({ key: 'analytics' }, { $set: { order: 0 } });
  await SidebarMenu.updateOne({ key: 'leads' }, { $set: { order: 1 } });
  await SidebarMenu.updateOne({ key: 'configuration' }, { $set: { order: 5 } });
  await SidebarMenu.updateOne({ key: 'integrations' }, { $set: { order: 10 } });
  await SidebarMenu.updateOne({ key: 'support' }, { $set: { order: 13 } });
  await SidebarMenu.updateOne({ key: 'tool' }, { $set: { order: 14 } });
  await SidebarMenu.updateOne({ key: 'account' }, { $set: { order: 15 } });

  // 3. Upsert parent menu: leadDistribution
  const parentMenu = await SidebarMenu.findOneAndUpdate(
    { key: 'leadDistribution' },
    {
      $set: {
        name: 'Lead Distribution',
        icon: 'leadDistribution',
        module: 'leadDistribution',
        parent_id: null,
        route: '',
        isActive: true,
        order: 9.1,
      }
    },
    { upsert: true, new: true }
  );

  // 4. Define child menus
  const children = [
    { key: 'leadDistribution.list', name: 'Lead Distribution List', route: '/leadDistribution/list', icon: 'list' },
    { key: 'leadDistribution.reassignList', name: 'Reassign List', route: '/reassign/list', icon: 'reassignList' },
  ];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childMenu = await SidebarMenu.findOneAndUpdate(
      { key: child.key },
      {
        $set: {
          name: child.name,
          route: child.route,
          icon: child.icon,
          parent_id: parentMenu._id,
          module: 'leadDistribution',
          isActive: true,
          order: 9.2 + (i * 0.1),
        }
      },
      { upsert: true, new: true }
    );

    // Ensure permissions exist for the admin role
    await SidebarPermission.updateOne(
      { roleId: adminRole._id, industryId: industry._id, menu_id: childMenu._id },
      {
        $set: { is_visible: true, order_override: 9.2 + (i * 0.1) },
        $setOnInsert: {
          roleId: adminRole._id,
          industryId: industry._id,
          menu_id: childMenu._id,
        }
      },
      { upsert: true }
    );
  }

  // Ensure the parent menu has permission
  await SidebarPermission.updateOne(
    { roleId: adminRole._id, industryId: industry._id, menu_id: parentMenu._id },
    {
      $set: { is_visible: true, order_override: 9.1 },
      $setOnInsert: {
        roleId: adminRole._id,
        industryId: industry._id,
        menu_id: parentMenu._id,
      }
    },
    { upsert: true }
  );

  console.log('[seed] initialized Lead Distribution sidebar menus and permissions for Admin role');
}

const DROPDOWN_OPTION_DEFAULTS = {
  'lead-types': [
    { value: 'hot',  label: 'Hot' },
    { value: 'warm', label: 'Warm' },
    { value: 'cold', label: 'Cold' },
  ],
  'lead-statuses': [
    { value: 'new',         label: 'New' },
    { value: 'contacted',   label: 'Contacted' },
    { value: 'qualified',   label: 'Qualified' },
    { value: 'unqualified', label: 'Unqualified' },
    { value: 'converted',   label: 'Converted' },
  ],
  'projects': [
    { value: 'gateway',  label: 'Gateway Towers' },
    { value: 'horizon',  label: 'Horizon Heights' },
    { value: 'meadow',   label: 'Meadow Greens' },
  ],
  'departments': [
    { value: 'sales',       label: 'Sales' },
    { value: 'marketing',   label: 'Marketing' },
    { value: 'support',     label: 'Customer Support' },
    { value: 'operations',  label: 'Operations' },
    { value: 'finance',     label: 'Finance' },
    { value: 'engineering', label: 'Engineering' },
  ],
  'designations': [
    { value: 'executive',  label: 'Executive' },
    { value: 'sr_executive', label: 'Sr. Executive' },
    { value: 'manager',    label: 'Manager' },
    { value: 'sr_manager', label: 'Sr. Manager' },
    { value: 'lead',       label: 'Team Lead' },
    { value: 'director',   label: 'Director' },
  ],
  'countries': [
    { value: 'India', label: 'India' },
    { value: 'United States', label: 'United States' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Australia', label: 'Australia' },
    { value: 'United Arab Emirates', label: 'United Arab Emirates' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  ],
  'states_India': [
    { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
    { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh' },
    { value: 'Assam', label: 'Assam' },
    { value: 'Bihar', label: 'Bihar' },
    { value: 'Chhattisgarh', label: 'Chhattisgarh' },
    { value: 'Goa', label: 'Goa' },
    { value: 'Gujarat', label: 'Gujarat' },
    { value: 'Haryana', label: 'Haryana' },
    { value: 'Himachal Pradesh', label: 'Himachal Pradesh' },
    { value: 'Jharkhand', label: 'Jharkhand' },
    { value: 'Karnataka', label: 'Karnataka' },
    { value: 'Kerala', label: 'Kerala' },
    { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
    { value: 'Maharashtra', label: 'Maharashtra' },
    { value: 'Manipur', label: 'Manipur' },
    { value: 'Meghalaya', label: 'Meghalaya' },
    { value: 'Mizoram', label: 'Mizoram' },
    { value: 'Nagaland', label: 'Nagaland' },
    { value: 'Odisha', label: 'Odisha' },
    { value: 'Punjab', label: 'Punjab' },
    { value: 'Rajasthan', label: 'Rajasthan' },
    { value: 'Sikkim', label: 'Sikkim' },
    { value: 'Tamil Nadu', label: 'Tamil Nadu' },
    { value: 'Telangana', label: 'Telangana' },
    { value: 'Tripura', label: 'Tripura' },
    { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
    { value: 'Uttarakhand', label: 'Uttarakhand' },
    { value: 'West Bengal', label: 'West Bengal' },
    { value: 'Delhi', label: 'Delhi' },
  ],
  'states_United States': [
    { value: 'Alabama', label: 'Alabama' },
    { value: 'Alaska', label: 'Alaska' },
    { value: 'Arizona', label: 'Arizona' },
    { value: 'Arkansas', label: 'Arkansas' },
    { value: 'California', label: 'California' },
    { value: 'Colorado', label: 'Colorado' },
    { value: 'Connecticut', label: 'Connecticut' },
    { value: 'Delaware', label: 'Delaware' },
    { value: 'Florida', label: 'Florida' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Hawaii', label: 'Hawaii' },
    { value: 'Idaho', label: 'Idaho' },
    { value: 'Illinois', label: 'Illinois' },
    { value: 'Indiana', label: 'Indiana' },
    { value: 'Iowa', label: 'Iowa' },
    { value: 'Kansas', label: 'Kansas' },
    { value: 'Kentucky', label: 'Kentucky' },
    { value: 'Louisiana', label: 'Louisiana' },
    { value: 'Maine', label: 'Maine' },
    { value: 'Maryland', label: 'Maryland' },
    { value: 'Massachusetts', label: 'Massachusetts' },
    { value: 'Michigan', label: 'Michigan' },
    { value: 'Minnesota', label: 'Minnesota' },
    { value: 'Mississippi', label: 'Mississippi' },
    { value: 'Missouri', label: 'Missouri' },
    { value: 'Montana', label: 'Montana' },
    { value: 'Nebraska', label: 'Nebraska' },
    { value: 'Nevada', label: 'Nevada' },
    { value: 'New Hampshire', label: 'New Hampshire' },
    { value: 'New Jersey', label: 'New Jersey' },
    { value: 'New Mexico', label: 'New Mexico' },
    { value: 'New York', label: 'New York' },
    { value: 'North Carolina', label: 'North Carolina' },
    { value: 'North Dakota', label: 'North Dakota' },
    { value: 'Ohio', label: 'Ohio' },
    { value: 'Oklahoma', label: 'Oklahoma' },
    { value: 'Oregon', label: 'Oregon' },
    { value: 'Pennsylvania', label: 'Pennsylvania' },
    { value: 'Rhode Island', label: 'Rhode Island' },
    { value: 'South Carolina', label: 'South Carolina' },
    { value: 'South Dakota', label: 'South Dakota' },
    { value: 'Tennessee', label: 'Tennessee' },
    { value: 'Texas', label: 'Texas' },
    { value: 'Utah', label: 'Utah' },
    { value: 'Vermont', label: 'Vermont' },
    { value: 'Virginia', label: 'Virginia' },
    { value: 'Washington', label: 'Washington' },
    { value: 'West Virginia', label: 'West Virginia' },
    { value: 'Wisconsin', label: 'Wisconsin' },
    { value: 'Wyoming', label: 'Wyoming' },
  ],
  'country_codes': [
    { value: '+91', label: '🇮🇳 India (+91)' },
    { value: '+1', label: '🇺🇸 United States (+1)' },
    { value: '+44', label: '🇬🇧 United Kingdom (+44)' },
    { value: '+971', label: '🇦🇪 UAE (+971)' },
    { value: '+65', label: '🇸🇬 Singapore (+65)' },
    { value: '+61', label: '🇦🇺 Australia (+61)' },
    { value: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
    { value: '+974', label: '🇶🇦 Qatar (+974)' },
    { value: '+965', label: '🇰🇼 Kuwait (+965)' },
    { value: '+968', label: '🇴🇲 Oman (+968)' },
    { value: '+973', label: '🇧🇭 Bahrain (+973)' },
  ]
};

async function seedDropdownOptions() {
  const DropdownOption = mongoose.model('DropdownOption');
  
  // Seed default role keys unconditionally
  const defaultRoleKeys = [
    { value: 'admin', label: 'admin' },
    { value: 'leadManager', label: 'leadManager' },
    { value: 'teamLead', label: 'teamLead' },
    { value: 'sales', label: 'sales' }
  ];
  for (const opt of defaultRoleKeys) {
    await DropdownOption.updateOne(
      { key: 'role_keys', value: opt.value },
      { $set: { label: opt.label } },
      { upsert: true }
    );
  }

  const count = await DropdownOption.estimatedDocumentCount();
  if (count <= 4) {
    console.log('[seed] seeding database-driven dropdown options...');
    for (const [key, options] of Object.entries(DROPDOWN_OPTION_DEFAULTS)) {
      for (const opt of options) {
        await DropdownOption.updateOne(
          { key, value: opt.value },
          { $set: { label: opt.label } },
          { upsert: true }
        );
      }
    }
    console.log('[seed] finished seeding dropdown options.');
  } else {
    console.log('[seed] dropdown_options already populated — skipping seed');
  }
}

module.exports = {
  seedUsers,
  migrateAndSeedSidebar,
  seedScreens,
  seedIndustries,
  seedContacts,
  seedOrganizations,
  seedBookings,
  fixIntegrationsSidebar,
  seedDropdownOptions,
  seedLeadDistributionSidebar,
};
