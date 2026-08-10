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
  },
  {
    id: 'temp0002',
    name: 'E-commerce'
  },
  {
    id: 'temp0003',
    name: 'Healthcare'
  },
  {
    id: 'temp0004',
    name: 'Education'
  },
  {
    id: 'temp0005',
    name: 'Financial Services'
  },
  {
    id: 'temp0006',
    name: 'IT & Tech Services'
  },
  {
    id: 'temp0007',
    name: 'Manufacturing'
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
        { key: 'users', name: 'Users', route: '/users', icon: 'users', module: 'users' },
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'leads.booking', name: 'Bookings List', route: '/leads/bookings', icon: 'booking', module: 'leads' },

        { key: 'configuration.projects', name: 'Projects', route: '/configuration/projects', icon: 'projects', module: 'configuration' },
        { key: 'configuration.resources', name: 'Resources', route: '/configuration/resources', icon: 'resources', module: 'configuration' },
        { key: 'configuration.holiday', name: 'Holiday Configuration', route: '/configuration/holiday-config', icon: 'holiday', module: 'configuration' },
        { key: 'configuration.days', name: 'Working Days Configuration', route: '/configuration/days-config', icon: 'days', module: 'configuration' },
        { key: 'configuration.domainSettings', name: 'Domain Settings', route: '/configuration/domain-settings', icon: 'domain', module: 'configuration' },

        { key: 'leadDistribution.list', name: 'Lead Distribution List', route: '/lead-distribution/list', icon: 'list', module: 'leadDistribution' },
        { key: 'leadDistribution.reassignList', name: 'Reassign List', route: '/reassign/list', icon: 'reassignList', module: 'leadDistribution' },

        { key: 'integrations.api', name: 'API Tokens', route: '/integrations/api', icon: 'api', module: 'integrations' },
        { key: 'integrations.apiData', name: 'API Data', route: '/integrations/api-data', icon: 'apiData', module: 'integrations' },
        { key: 'integrations.whatsapp', name: 'WhatsApp API', route: '/integrations/whatsapp', icon: 'whatsapp', module: 'integrations' },

        { key: 'uiNavigation.menus', name: 'Sidebar Menus', route: '/ui-navigation/menus', icon: 'sidebar', module: 'uiNavigation' },
        { key: 'uiNavigation.screens', name: 'Screens', route: '/ui-navigation/screens', icon: 'screen', module: 'uiNavigation' },
        { key: 'uiNavigation.screenFields', name: 'Screen Fields', route: '/ui-navigation/screen-fields', icon: 'screen', module: 'uiNavigation' },
        { key: 'uiNavigation.analyticsConfig', name: 'Layout Builder', route: '/ui-navigation/analytics-config', icon: 'settings', module: 'uiNavigation' },

        { key: 'accessControl.permissions', name: 'Permission Matrix (Sidebar)', route: '/access-control/permissions', icon: 'shield', module: 'accessControl' },
        { key: 'accessControl.screenPermissions', name: 'Permission Fields', route: '/access-control/screen-permissions', icon: 'lock', module: 'accessControl' },
        { key: 'accessControl.roles', name: 'Roles & Permissions', route: '/access-control/roles', icon: 'roles', module: 'accessControl' },

        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'account.subscription', name: 'Subscription Details', route: '/account/subscription-details', icon: 'subscription', module: 'account' },
        { key: 'invoices.paymentLogs', name: 'Payment Invoice Logs', route: '/invoices/payment-invoices', icon: 'billing', module: 'invoices' },
        { key: 'invoices.receiptsHistory', name: 'Receipts & Historical Charges', route: '/invoices/receipts-history', icon: 'subscription', module: 'invoices' },
        { key: 'account.password', name: 'Update Password', route: '/account/update-password', icon: 'password', module: 'account' }
      ],
      leadManager: [
        { key: 'analytics', name: 'Analytics', route: '/analytics', icon: 'analytics', module: 'analytics' },
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'tool.areaConverter', name: 'Area Converter', route: '/tool/area-converter', icon: 'areaConverter', module: 'tool' },
        { key: 'tool.calculator', name: 'Calculator', route: '/tool/calculator', icon: 'calculator', module: 'tool' },
        { key: 'tool.emiCalculator', name: 'EMI Calculator', route: '/tool/emi-calculator', icon: 'emiCalculator', module: 'tool' }
      ],
      sales: [
        { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', module: 'leads' },
        { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', module: 'leads' },
        { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', module: 'leads' },
        { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', module: 'support' },
        { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', module: 'support' },
        { key: 'tool.areaConverter', name: 'Area Converter', route: '/tool/area-converter', icon: 'areaConverter', module: 'tool' },
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
        { key: 'tool.areaConverter', name: 'Area Converter', route: '/tool/area-converter', icon: 'areaConverter', module: 'tool' },
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

  // Sync status for existing users
  const list = await User.find({});
  for (const u of list) {
    const expectedStatus = u.isActive !== false ? 'ACTIVE' : 'INACTIVE';
    if (u.status !== expectedStatus) {
      await User.updateOne({ _id: u._id }, { $set: { status: expectedStatus } });
      console.log(`[seed] synchronized status for ${u.email} -> ${expectedStatus}`);
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
  // Comment out to allow updates/seeding new menus/roles like superAdmin dynamically
  // if (industryCount > 0) { ... }
  console.log('[seed] Seeding sidebar menus and permissions matrix...');

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
        { industry_id: industry._id, key: roleKey },
        {
          $setOnInsert: {
            industry_id: industry._id,
            key: roleKey,
            name: ROLE_DISPLAY_NAMES[roleKey] || roleKey,
            is_active: true,
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
        const MODULE_KEY_MAP = {
          uinavigation: 'uiNavigation',
          accesscontrol: 'accessControl',
          leaddistribution: 'leadDistribution',
        };
        const rawModuleKey = String(
          m.module || (isChild ? m.key.split('.')[0] : m.key),
        );
        const moduleKey = MODULE_KEY_MAP[rawModuleKey.toLowerCase()] || rawModuleKey;

        // Skip Tool module permissions for Admin role
        if (roleKey === 'admin' && (moduleKey === 'tool' || String(m.key).startsWith('tool'))) {
          continue;
        }

        let parentId = null;
        if (isChild) {
          const PARENT_NAMES = {
            uinavigation: 'UI & Navigation',
            accesscontrol: 'Access Control',
            leaddistribution: 'Lead Distribution',
            account: 'Account & Settings',
            configuration: 'Configuration',
            integrations: 'Integrations',
            analytics: 'Analytics',
            users: 'Users',
            leads: 'Leads',
            support: 'Support',
          };
          const PARENT_ORDERS = {
            analytics: 10,
            users: 20,
            leads: 30,
            leaddistribution: 40,
            configuration: 50,
            integrations: 60,
            uinavigation: 70,
            accesscontrol: 80,
            account: 90,
            support: 100,
          };
          const pName = PARENT_NAMES[moduleKey.toLowerCase()] || capitalize(moduleKey);
          const pOrder = PARENT_ORDERS[moduleKey.toLowerCase()] ?? 999;
          const parent = await SidebarMenu.findOneAndUpdate(
            { key: moduleKey },
            {
              $set: { name: pName, order: pOrder },
              $setOnInsert: {
                key: moduleKey,
                icon: moduleKey,
                module: moduleKey,
                parentId: null,
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
            $set: { parent_id: parentId, order: i },
            $setOnInsert: {
              key: m.key,
              name: m.name,
              icon: m.icon || '',
              route: m.route || '',
              module: moduleKey,
              isActive: true,
            },
          },
          { upsert: true, new: true },
        );
        menuCount++;

        await SidebarPermission.updateOne(
          { role_id: role._id, industry_id: industry._id, menu_id: menu._id },
          {
            $set: { is_visible: true, order_override: i },
            $setOnInsert: {
              role_id: role._id,
              industry_id: industry._id,
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
      { field_key: 'organizationId',    label: 'Organization Name',   type: 'select',   is_required: true,  order: 1, dropdown_source: 'api', dropdown_api: 'options/organizations', is_table_visible: true },
      { field_key: 'customerName',      label: 'Customer Name',       type: 'text',     is_required: true,  order: 2 },
      { field_key: 'contactNumber',     label: 'Contact Number',      type: 'phone',    is_required: true,  order: 3 },
      { field_key: 'emailId',           label: 'Email ID',            type: 'email',    is_required: true,  order: 4 },
      { field_key: 'alternateNo',       label: 'Alternate Number',    type: 'phone',    is_required: false, order: 5 },
      { field_key: 'leadType',          label: 'Lead Type',           type: 'select',   is_required: true,  order: 6, dropdown_source: 'api', dropdown_api: '/api/options/leadType' },
      { field_key: 'location',          label: 'Location',            type: 'select',   is_required: false, order: 7, dropdown_source: 'api', dropdown_api: '/api/options/location' },
      { field_key: 'projectName',       label: 'Project Name',        type: 'select',   is_required: false, order: 8, dropdown_source: 'api', dropdown_api: '/api/options/projectName' },
      { field_key: 'propertyType',      label: 'Property Type',       type: 'select',   is_required: false, order: 9, dropdown_source: 'api', dropdown_api: '/api/options/propertyType' },
      { field_key: 'propertyStage',     label: 'Property Stage',      type: 'select',   is_required: false, order: 10, dropdown_source: 'api', dropdown_api: '/api/options/propertyStage' },
      { field_key: 'budget',            label: 'Budget',              type: 'select',   is_required: false, order: 11, dropdown_source: 'api', dropdown_api: '/api/options/budget' },
      { field_key: 'propertySubType',   label: 'Property Sub Type',   type: 'select',   is_required: false, order: 12, dropdown_source: 'api', dropdown_api: '/api/options/propertySubType' },
      { field_key: 'source',            label: 'Lead Source',         type: 'select',   is_required: false, order: 13, dropdown_source: 'api', dropdown_api: '/api/options/source' },
      { field_key: 'contactOwnerEmail', label: 'Contact Owner Email', type: 'select',   is_required: false, order: 14, dropdown_source: 'api', dropdown_api: '/api/options/organizationUsers' },
      { field_key: 'adset',             label: 'Ad Set',              type: 'text',     is_required: false, order: 15 },
      { field_key: 'campaign',          label: 'Campaign',            type: 'text',     is_required: false, order: 16 },
      { field_key: 'notes',             label: 'Notes',               type: 'textarea', is_required: false, order: 17 },

      // E-Commerce (temp0002) fields
      { field_key: 'orderID',           label: 'Order ID',            type: 'text',     is_required: false, order: 30 },
      { field_key: 'orderValue',        label: 'Order Value',         type: 'number',   is_required: false, order: 31 },
      { field_key: 'cartItemsCount',    label: 'Cart Items Count',    type: 'number',   is_required: false, order: 32 },
      { field_key: 'couponCode',        label: 'Coupon Code',         type: 'text',     is_required: false, order: 33 },
      { field_key: 'shippingMethod',    label: 'Shipping Method',     type: 'text',     is_required: false, order: 34 },
      { field_key: 'orderStatus',        label: 'Order Status',        type: 'select',   is_required: false, order: 35, dropdown_source: 'api', dropdown_api: '/api/options/order_statuses' },

      // Healthcare (temp0003) fields
      { field_key: 'patientID',        label: 'Patient ID',          type: 'text',     is_required: false, order: 40 },
      { field_key: 'specialty',         label: 'Medical Specialty',   type: 'select',   is_required: false, order: 41, dropdown_source: 'api', dropdown_api: '/api/options/specialties' },
      { field_key: 'attendingDoctor',   label: 'Attending Doctor',    type: 'text',     is_required: false, order: 42 },
      { field_key: 'appointmentDate',   label: 'Appointment Date',    type: 'date',     is_required: false, order: 43 },
      { field_key: 'insuranceProvider', label: 'Insurance Provider',  type: 'text',     is_required: false, order: 44 },

      // Education (temp0004) fields
      { field_key: 'programCourse',     label: 'Program / Course',    type: 'select',   is_required: false, order: 50, dropdown_source: 'api', dropdown_api: '/api/options/programs' },
      { field_key: 'academicYear',      label: 'Academic Year',       type: 'text',     is_required: false, order: 51 },
      { field_key: 'entranceScore',     label: 'Entrance Test Score', type: 'number',   is_required: false, order: 52 },
      { field_key: 'counselorAssigned', label: 'Counselor Assigned',  type: 'text',     is_required: false, order: 53 },

      // Financial Services (temp0005) fields
      { field_key: 'productType',       label: 'Financial Product',   type: 'select',   is_required: false, order: 60, dropdown_source: 'api', dropdown_api: '/api/options/financial_products' },
      { field_key: 'requestedAmount',   label: 'Requested Loan Amount', type: 'number', is_required: false, order: 61 },
      { field_key: 'annualIncome',      label: 'Annual Income',       type: 'number',   is_required: false, order: 62 },
      { field_key: 'creditScore',       label: 'Credit Score',        type: 'number',   is_required: false, order: 63 },

      // IT Services (temp0006) fields
      { field_key: 'serviceLine',       label: 'IT Service Line',     type: 'select',   is_required: false, order: 70, dropdown_source: 'api', dropdown_api: '/api/options/service_lines' },
      { field_key: 'rfpDeadline',       label: 'RFP Submission Deadline', type: 'date',  is_required: false, order: 71 },
      { field_key: 'estimatedBudget',   label: 'Estimated Budget',    type: 'number',   is_required: false, order: 72 },
      { field_key: 'techStack',         label: 'Tech Stack',          type: 'text',     is_required: false, order: 73 },

      // Manufacturing (temp0007) fields
      { field_key: 'productCategory',   label: 'Product Category',    type: 'select',   is_required: false, order: 80, dropdown_source: 'api', dropdown_api: '/api/options/product_categories' },
      { field_key: 'orderQuantity',     label: 'Order Quantity (MOQ)', type: 'number',  is_required: false, order: 81 },
      { field_key: 'deliveryLocation',  label: 'Delivery Location',   type: 'text',     is_required: false, order: 82 },
      { field_key: 'dealerCode',        label: 'Dealer Code',         type: 'text',     is_required: false, order: 83 },
    ],
  },
  {
    key: 'tasks',
    name: 'Tasks',
    description: 'Lead / follow-up tasks',
    fields: [
      { field_key: 'customerName',      label: 'Customer Name',       type: 'text',     is_required: false, order: 1 },
      { field_key: 'taskType',          label: 'Type',                type: 'text',     is_required: true,  order: 2 },
      { field_key: 'contactOwnerEmail', label: 'Owner Email',         type: 'text',     is_required: false, order: 3 },
      { field_key: 'contactNumber',     label: 'Contact Number',      type: 'text',     is_required: false, order: 4 },
      { field_key: 'stage',             label: 'Stage',               type: 'text',     is_required: false, order: 5 },
      { field_key: 'source',            label: 'Source',              type: 'text',     is_required: false, order: 6 },
      { field_key: 'projectName',       label: 'Project Name',        type: 'text',     is_required: false, order: 7 },
      { field_key: 'location',          label: 'Location',            type: 'text',     is_required: false, order: 8 },
      { field_key: 'budget',            label: 'Budget',              type: 'text',     is_required: false, order: 9 },
      { field_key: 'latitude',          label: 'Latitude',            type: 'number',   is_required: false, order: 10 },
      { field_key: 'longitude',         label: 'Longitude',           type: 'number',   is_required: false, order: 11 },
      { field_key: 'transferStatus',    label: 'Transfer Status',     type: 'text',     is_required: false, order: 12 },
      { field_key: 'dueDate',           label: 'Due Date',            type: 'date',     is_required: false, order: 13 },
      { field_key: 'completedAt',       label: 'Completed At',        type: 'date',     is_required: false, order: 14 },
      { field_key: 'uniqueMeeting',      label: 'Unique Meeting',      type: 'text',     is_required: false, order: 15 },
      { field_key: 'uniqueSiteVisit',    label: 'Unique Site Visit',    type: 'text',     is_required: false, order: 16 },
      { field_key: 'assignedTo',        label: 'Assigned To',         type: 'text',     is_required: false, order: 17 },
      { field_key: 'callbackReason',    label: 'Callback Reason',     type: 'text',     is_required: false, order: 18 },
      { field_key: 'nextFollowUp',      label: 'Next Follow-up',      type: 'date',     is_required: false, order: 19 },
      { field_key: 'notes',             label: 'Notes',               type: 'textarea', is_required: false, order: 20 },
      { field_key: 'createdAt',         label: 'Created At',          type: 'date',     is_required: false, order: 21 },
      { field_key: 'status',            label: 'Status',              type: 'badge',    is_required: false, order: 22 },
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
      { field_key: 'firstName',    label: 'First Name',    type: 'text',     is_required: true,  order: 2 },
      { field_key: 'lastName',     label: 'Last Name',     type: 'text',     is_required: true,  order: 3 },
      { field_key: 'contactNumber',    label: 'Contact Number', type: 'phone',    is_required: true,  order: 4 },
      { field_key: 'emailId',      label: 'Email ID',      type: 'email',    is_required: true,  order: 5 },
      { field_key: 'country',       label: 'Country',       type: 'select',   is_required: true,  order: 6,
        dropdown_source: 'api', dropdown_api: '/api/options/countries' },
      { field_key: 'state',         label: 'State',         type: 'select',   is_required: true,  order: 7,
        dropdown_source: 'api', dropdown_api: '/api/options/states' },
      { field_key: 'city',          label: 'City',          type: 'text',     is_required: true,  order: 8 },
      { field_key: 'pincode',       label: 'Pincode',       type: 'text',     is_required: true,  order: 9 },
      { field_key: 'industryId',   label: 'Industry ID',   type: 'select',   is_required: true,  order: 10,
        dropdown_source: 'api', dropdown_api: '/api/options/industries?launchedOnly=true' },
      { field_key: 'numEmployees', label: 'Number of Employees', type: 'number', is_required: true,  order: 11 },
      { field_key: 'address',       label: 'Address',       type: 'textarea', is_required: true,  order: 12 },
      { field_key: 'costPerLicense', label: 'License Cost', type: 'number', is_required: true, order: 20 },
      { field_key: 'validTill', label: 'Valid Till', type: 'date', is_required: true, order: 21 },
      { field_key: 'allowDuplicateLeads', label: 'Allow Duplicate Leads', type: 'checkbox', is_form_visible: false, is_table_visible: true, default_value: true, order: 13 },
      { field_key: 'showAnalytics', label: 'Show Analytics', type: 'checkbox', is_form_visible: false, is_table_visible: true, default_value: true, order: 14 },
      { field_key: 'showData', label: 'Show Data', type: 'checkbox', is_form_visible: false, is_table_visible: false, default_value: true, order: 15 },
      { field_key: 'trialPeriod', label: 'Trial Period', type: 'checkbox', is_form_visible: false, is_table_visible: false, default_value: true, order: 16 },
      { field_key: 'designations', label: 'Designations', type: 'text', is_form_visible: false, is_table_visible: false, default_value: [], order: 17 },
      { field_key: 'teams', label: 'Teams', type: 'text', is_form_visible: false, is_table_visible: false, default_value: [], order: 18 },
      { field_key: 'status', label: 'Deactivate / Activate', type: 'text', is_form_visible: false, is_table_visible: true, default_value: 'ACTIVE', order: 19 },
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
      { field_key: 'otherNotIntReason',    label: 'Enter Other Reason',   type: 'text',     is_required: false, order: 2 },
      { field_key: 'notes',                label: 'Enter Note',           type: 'textarea', is_required: false, order: 3 },
    ],
  },
  {
    key: 'lost',
    name: 'Lost Details',
    description: 'Dynamic form fields shown when converting a lead to Lost',
    fields: [
      { field_key: 'lostReason',           label: 'Lost Reason',          type: 'select',   is_required: true,  order: 1, dropdown_source: 'static', options: ['Not Budget Fit', 'Bought Competitor Property', 'Requirement Changed', 'Delayed Purchase', 'Other'] },
      { field_key: 'otherLostReason',      label: 'Enter Other Reason',   type: 'text',     is_required: false, order: 2 },
      { field_key: 'notes',                label: 'Note',                 type: 'textarea', is_required: false, order: 3 },
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
    key: 'notes',
    name: 'Create New Note',
    description: 'Dynamic form fields shown when creating a new note',
    fields: [
      { field_key: 'notes',                label: 'Notes',                 type: 'textarea', is_required: true,  order: 1 },
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
      const snakeKey = f.field_key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      const doc = await ScreenField.findOneAndUpdate(
        { screen_id: screen._id, field_key: snakeKey },
        {
          $set: {
            label: f.label,
            type: f.type,
            is_table_visible: f.is_table_visible !== false,
            is_form_visible: f.is_form_visible !== false,
            is_required: !!f.is_required,
            sortable: true,
            order: f.order || 0,
            is_active: true,
            dropdown_source: f.dropdown_source || 'none',
            dropdown_api: f.dropdown_api || '',
            options: f.options || [],
            default_value: f.default_value !== undefined ? f.default_value : null,
          },
          $setOnInsert: { screen_id: screen._id, field_key: snakeKey },
        },
        { upsert: true, new: true },
      );
      fieldDocs.push(doc);
    }
    // Clean up any fields that are no longer in the spec.
    const specKeys = spec.fields.map((f) => f.field_key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
    await ScreenField.deleteMany({ screen_id: screen._id, field_key: { $nin: specKeys } });
    fieldsByScreen.set(String(screen._id), { screen, fields: fieldDocs });
  }

  // Enable all fields for every (industry × role) combo we know about, so the
  // existing ContactsList / TasksList pages have data out of the box.
  const industries = await Industry.find({ is_active: true }).lean().exec();
  const roles = await Role.find({ is_active: true }).lean().exec();

  const RE_FIELDS = new Set(['project_name', 'property_type', 'property_stage', 'budget', 'property_sub_type']);
  const ECOM_FIELDS = new Set(['order_id', 'order_value', 'cart_items_count', 'coupon_code', 'shipping_method', 'order_status']);
  const HEALTH_FIELDS = new Set(['patient_id', 'specialty', 'attending_doctor', 'appointment_date', 'insurance_provider']);
  const EDU_FIELDS = new Set(['program_course', 'academic_year', 'entrance_score', 'counselor_assigned']);
  const FIN_FIELDS = new Set(['product_type', 'requested_amount', 'annual_income', 'credit_score']);
  const IT_FIELDS = new Set(['service_line', 'rfp_deadline', 'estimated_budget', 'tech_stack']);
  const MFG_FIELDS = new Set(['product_category', 'order_quantity', 'delivery_location', 'dealer_code']);

  const ALL_CUSTOM_FIELDS = new Set([
    ...RE_FIELDS, ...ECOM_FIELDS, ...HEALTH_FIELDS, ...EDU_FIELDS, ...FIN_FIELDS, ...IT_FIELDS, ...MFG_FIELDS
  ]);

  let permCount = 0;
  for (const [, { screen, fields }] of fieldsByScreen) {
    for (const industry of industries) {
      const indCode = String(industry.code || '').toLowerCase().trim();
      const industryRoles = roles.filter((r) => String(r.industry_id || r.industryId) === String(industry._id));

      for (const role of industryRoles) {
        for (const field of fields) {
          const fKey = field.field_key;
          let isEnabled = true;

          // If the field belongs to the custom industry set, strictly enforce industry matching
          if (ALL_CUSTOM_FIELDS.has(fKey)) {
            if (indCode === 'temp0001' && !RE_FIELDS.has(fKey)) isEnabled = false;
            else if (indCode === 'temp0002' && !ECOM_FIELDS.has(fKey)) isEnabled = false;
            else if (indCode === 'temp0003' && !HEALTH_FIELDS.has(fKey)) isEnabled = false;
            else if (indCode === 'temp0004' && !EDU_FIELDS.has(fKey)) isEnabled = false;
            else if (indCode === 'temp0005' && !FIN_FIELDS.has(fKey)) isEnabled = false;
            else if (indCode === 'temp0006' && !IT_FIELDS.has(fKey)) isEnabled = false;
            else if (indCode === 'temp0007' && !MFG_FIELDS.has(fKey)) isEnabled = false;
          }

          await ScreenPermission.updateOne(
            {
              screen_id: screen._id,
              role_id: role._id,
              industry_id: industry._id,
              field_id: field._id,
            },
            {
              $set: { is_enabled: isEnabled },
              $setOnInsert: {
                screen_id: screen._id,
                role_id: role._id,
                industry_id: industry._id,
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
        $setOnInsert: { code, is_active: true, status: 'Launched' },
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
  const allIndustries = await Industry.find({}).exec();
  let rolesAdded = 0;
  for (const ind of allIndustries) {
    for (const key of DEFAULT_ROLES) {
      const r = await Role.findOneAndUpdate(
        { industry_id: ind._id, key },
        {
          $setOnInsert: {
            industry_id: ind._id,
            key,
            name: ROLE_DISPLAY_NAMES[key] || capitalize(key),
            is_active: true,
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
  await SidebarMenu.updateOne({ key: 'organization' }, { $set: { order: 1 } });
  await SidebarMenu.updateOne({ key: 'users' }, { $set: { order: 2 } });
  await SidebarMenu.updateOne({ key: 'leads' }, { $set: { order: 3 } });
  await SidebarMenu.updateOne({ key: 'configuration' }, { $set: { order: 4 } });
  await SidebarMenu.updateMany({ key: { $in: ['leadDistribution', 'leaddistribution'] } }, { $set: { order: 4.5 } });
  await SidebarMenu.updateOne({ key: 'support' }, { $set: { order: 5 } });
  await SidebarMenu.updateOne({ key: 'account' }, { $set: { order: 6 } });
  await SidebarMenu.updateOne({ key: 'integrations' }, { $set: { order: 10 } });
  await SidebarMenu.updateOne({ key: 'tool' }, { $set: { order: 14 } });

  // 3. Upsert parent menu: leadDistribution
  const parentMenu = await SidebarMenu.findOneAndUpdate(
    { key: 'leadDistribution' },
    {
      $set: {
        name: 'Lead Distribution',
        icon: 'leadDistribution',
        module: 'leadDistribution',
        parentId: null,
        route: '',
        isActive: true,
        order: 4.5,
      }
    },
    { upsert: true, new: true }
  );

  // 4. Define child menus
  const children = [
    { key: 'leadDistribution.list', name: 'Lead Distribution List', route: '/lead-distribution/list', icon: 'list' },
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
          parentId: parentMenu._id,
          module: 'leadDistribution',
          isActive: true,
          order: 9.2 + (i * 0.1),
        }
      },
      { upsert: true, new: true }
    );

    // Ensure permissions exist for the admin role
    await SidebarPermission.updateOne(
      { role_id: adminRole._id, industry_id: industry._id, menu_id: childMenu._id },
      {
        $set: { is_visible: true, order_override: 9.2 + (i * 0.1) },
        $setOnInsert: {
          role_id: adminRole._id,
          industry_id: industry._id,
          menu_id: childMenu._id,
        }
      },
      { upsert: true }
    );
  }

  // Ensure the parent menu has permission
  await SidebarPermission.updateOne(
    { role_id: adminRole._id, industry_id: industry._id, menu_id: parentMenu._id },
    {
      $set: { is_visible: true, order_override: 9.1 },
      $setOnInsert: {
        role_id: adminRole._id,
        industry_id: industry._id,
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
  'order_statuses': [
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'processing',      label: 'Processing' },
    { value: 'shipped',         label: 'Shipped' },
    { value: 'delivered',       label: 'Delivered' },
    { value: 'returned',        label: 'Returned' },
    { value: 'canceled',        label: 'Canceled' },
  ],
  'specialties': [
    { value: 'cardiology',      label: 'Cardiology' },
    { value: 'orthopedics',     label: 'Orthopedics' },
    { value: 'neurology',       label: 'Neurology' },
    { value: 'pediatrics',      label: 'Pediatrics' },
    { value: 'dermatology',     label: 'Dermatology' },
    { value: 'general_medicine',label: 'General Medicine' },
  ],
  'programs': [
    { value: 'btech_cs',        label: 'B.Tech Computer Science' },
    { value: 'mba_marketing',   label: 'MBA Marketing' },
    { value: 'bba_finance',     label: 'BBA Finance' },
    { value: 'msc_data_science',label: 'Data Science MSc' },
    { value: 'aiml_cert',       label: 'AI/ML Certification' },
  ],
  'financial_products': [
    { value: 'home_loan',       label: 'Home Loan' },
    { value: 'business_loan',   label: 'Business Loan' },
    { value: 'health_insurance',label: 'Health Insurance' },
    { value: 'mutual_fund',     label: 'Mutual Fund SIP' },
    { value: 'personal_credit', label: 'Personal Credit' },
  ],
  'service_lines': [
    { value: 'cloud_migration', label: 'Cloud Migration' },
    { value: 'enterprise_dev',   label: 'Enterprise Software Dev' },
    { value: 'aiml_integration',label: 'AI/ML Integration' },
    { value: 'cybersecurity',   label: 'Cybersecurity Audit' },
    { value: 'devops',          label: 'DevOps' },
  ],
  'product_categories': [
    { value: 'machining',       label: 'Industrial Machining' },
    { value: 'auto_components', label: 'Auto Components' },
    { value: 'raw_plastics',    label: 'Raw Plastics' },
    { value: 'electrical',      label: 'Electrical Fittings' },
    { value: 'metal_fabrication',label: 'Heavy Metal Fabrication' },
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

async function seedAnalyticsConfig() {
  const AnalyticsConfig = mongoose.model('AnalyticsConfig');
  const Industry = mongoose.model('Industry');

  // Real Estate (temp0001) - Preserve completely intact
  const reIndustry = await Industry.findOne({ code: 'temp0001' });
  if (reIndustry) {
    const existing = await AnalyticsConfig.findOne({ industry_id: String(reIndustry._id) });
    if (!existing) {
      await AnalyticsConfig.create({
        industry_id: String(reIndustry._id),
        dashboard_key: 'default',
        tabs: [
          {
            id: 0,
            label: 'Contacts Overview',
            widgets: [],
            sections: [
              {
                id: 'contacts_kpis',
                title: 'Key Metrics Overview',
                order: 0,
                is_active: true,
                widgets: [
                  { id: 'totalLeads', type: 'KPI', title: 'Total Leads', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'PeopleIcon', data_key: 'cards.totalLeads' },
                  { id: 'fresh', type: 'KPI', title: 'Fresh', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
                  { id: 'callBack', type: 'KPI', title: 'Call Back', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PhoneCallbackIcon', data_key: 'cards.callBack' },
                  { id: 'interested', type: 'KPI', title: 'Interested', color: '#EAB308', bg: 'rgba(234,179,8,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
                  { id: 'closedWon', type: 'KPI', title: 'Closed Won', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' },
                  { id: 'notInterested', type: 'KPI', title: 'Not Interested', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CancelIcon', data_key: 'cards.notInterested' },
                  { id: 'closedLost', type: 'KPI', title: 'Closed Lost', color: '#F97316', bg: 'rgba(249,115,22,0.06)', icon: 'TrendingDownIcon', data_key: 'cards.closedLost' },
                  { id: 'completedVisits', type: 'KPI', title: 'Completed Visits', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', icon: 'EventAvailableIcon', data_key: 'cards.completedVisits' },
                  { id: 'scheduledVisits', type: 'KPI', title: 'Scheduled Visits', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'EventIcon', data_key: 'cards.scheduledVisits' }
                ]
              },
              {
                id: 'contacts_details',
                title: 'Leads Conversion & Breakdown',
                order: 1,
                is_active: true,
                widgets: [
                  {
                    id: 'contacts_feedback',
                    type: 'TABLE',
                    title: 'Leads Feedback Breakdown',
                    data_key: 'contacts.feedbackSummary',
                    columns: [
                      { key: 'associate', label: 'Associate/Group' },
                      { key: 'total', label: 'Total' },
                      { key: 'fresh', label: 'Fresh' },
                      { key: 'callBack', label: 'Call Back' },
                      { key: 'interested', label: 'Interested' },
                      { key: 'won', label: 'Won' },
                      { key: 'notInterested', label: 'Not Interested' },
                      { key: 'lost', label: 'Lost' },
                      { key: 'completedVisits', label: 'Completed Visits' }
                    ]
                  },
                  {
                    id: 'contacts_callback',
                    type: 'TABLE',
                    title: 'Callback Reasons Summary',
                    data_key: 'contacts.callBackReasons',
                    columns: [
                      { key: 'associate', label: 'Associate/Group' },
                      { key: 'total', label: 'Total Call Backs' }
                    ]
                  },
                  {
                    id: 'contacts_conversion_donut',
                    type: 'CHART',
                    title: 'Leads Conversion Distribution',
                    chart_type: 'donut',
                    data_key: 'contacts.chartData'
                  }
                ]
              }
            ]
          },
          {
            id: 1,
            label: 'Tasks & Meetings',
            widgets: [],
            sections: [
              {
                id: 'tasks_overview',
                title: 'Completed Task Metrics',
                order: 0,
                is_active: true,
                widgets: [
                  {
                    id: 'tasks_completed',
                    type: 'TABLE',
                    title: 'Completed Tasks by Associate',
                    data_key: 'tasks.completedTasks',
                    columns: [
                      { key: 'associate', label: 'Associate/Group' },
                      { key: 'total', label: 'Total Completed' },
                      { key: 'meeting', label: 'Meeting' },
                      { key: 'callBack', label: 'Call Back' },
                      { key: 'siteVisit', label: 'Site Visit' }
                    ]
                  },
                  {
                    id: 'tasks_completed_donut',
                    type: 'CHART',
                    title: 'Completed Tasks Distribution',
                    chart_type: 'donut',
                    data_key: 'tasks.completedChartData'
                  }
                ]
              },
              {
                id: 'tasks_pending_section',
                title: 'Pending Task Metrics',
                order: 1,
                is_active: true,
                widgets: [
                  {
                    id: 'tasks_pending',
                    type: 'TABLE',
                    title: 'Pending Tasks by Associate',
                    data_key: 'tasks.pendingTasks',
                    columns: [
                      { key: 'associate', label: 'Associate/Group' },
                      { key: 'total', label: 'Total Pending' },
                      { key: 'meeting', label: 'Meeting' },
                      { key: 'callBack', label: 'Call Back' },
                      { key: 'siteVisit', label: 'Site Visit' }
                    ]
                  },
                  {
                    id: 'tasks_pending_donut',
                    type: 'CHART',
                    title: 'Pending Tasks Distribution',
                    chart_type: 'donut',
                    data_key: 'tasks.pendingChartData'
                  }
                ]
              }
            ]
          },
          {
            id: 2,
            label: 'Calling Analytics',
            widgets: [],
            sections: [
              {
                id: 'calling_insights',
                title: 'Call Tracking & Durations',
                order: 0,
                is_active: true,
                widgets: [
                  {
                    id: 'call_trends_trend',
                    type: 'CHART',
                    title: 'Calling Trend',
                    chart_type: 'trend',
                    data_key: 'callLogs.callingTrends'
                  },
                  {
                    id: 'call_logs_table',
                    type: 'TABLE',
                    title: 'Call Duration Summary',
                    data_key: 'callLogs.callLogSummary',
                    columns: [
                      { key: 'associate', label: 'Associate/Group' },
                      { key: 'total', label: 'Total Calls' },
                      { key: 'duration0', label: '0 Sec' },
                      { key: 'duration0_30', label: '0-30 Sec' },
                      { key: 'duration31_60', label: '31-60 Sec' },
                      { key: 'duration61_120', label: '61-120 Sec' },
                      { key: 'durationAbove120', label: '>120 Sec' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });
    }
  }

  // Seed temp0002 through temp0007 Industry-Specific Analytics Configurations
  const OTHER_INDUSTRIES = [
    {
      code: 'temp0002',
      name: 'E-commerce',
      tabs: [
        {
          id: 0,
          label: 'Store & Sales Overview',
          sections: [
            {
              id: 'ecom_kpis',
              title: 'Key E-Commerce Metrics',
              order: 0,
              is_active: true,
              widgets: [
                { id: 'totalOrders', type: 'KPI', title: 'Total Orders', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'ShoppingBagIcon', data_key: 'cards.totalLeads' },
                { id: 'cartRecovered', type: 'KPI', title: 'Cart Recovered', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'ShoppingCartIcon', data_key: 'cards.fresh' },
                { id: 'repeatCustomers', type: 'KPI', title: 'Repeat Buyers', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'RepeatIcon', data_key: 'cards.interested' },
                { id: 'grossSales', type: 'KPI', title: 'Gross Sales', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'AttachMoneyIcon', data_key: 'cards.closedWon' },
                { id: 'refundClaims', type: 'KPI', title: 'Refund Claims', color: '#F97316', bg: 'rgba(249,115,22,0.06)', icon: 'AssignmentReturnIcon', data_key: 'cards.notInterested' }
              ]
            },
            {
              id: 'ecom_breakdown',
              title: 'Order Status & Conversion',
              order: 1,
              is_active: true,
              widgets: [
                {
                  id: 'ecom_table',
                  type: 'TABLE',
                  title: 'Order Fulfillment Breakdown',
                  data_key: 'contacts.feedbackSummary',
                  columns: [
                    { key: 'associate', label: 'Store Rep' },
                    { key: 'total', label: 'Total Orders' },
                    { key: 'fresh', label: 'Pending Payment' },
                    { key: 'interested', label: 'Processing' },
                    { key: 'won', label: 'Shipped' },
                    { key: 'lost', label: 'Canceled' }
                  ]
                },
                {
                  id: 'ecom_donut',
                  type: 'CHART',
                  title: 'Fulfillment Status Distribution',
                  chart_type: 'donut',
                  data_key: 'contacts.chartData'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      code: 'temp0003',
      name: 'Healthcare',
      tabs: [
        {
          id: 0,
          label: 'Clinical & Patient Overview',
          sections: [
            {
              id: 'health_kpis',
              title: 'Patient Care Metrics',
              order: 0,
              is_active: true,
              widgets: [
                { id: 'totalPatients', type: 'KPI', title: 'Patient Inquiries', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', icon: 'PeopleIcon', data_key: 'cards.totalLeads' },
                { id: 'newAppointments', type: 'KPI', title: 'New Appointments', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'EventIcon', data_key: 'cards.fresh' },
                { id: 'consultations', type: 'KPI', title: 'Consultations', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'LocalHospitalIcon', data_key: 'cards.interested' },
                { id: 'treatmentPlans', type: 'KPI', title: 'Treatment Plans', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' }
              ]
            },
            {
              id: 'health_breakdown',
              title: 'Specialty & Department Breakdown',
              order: 1,
              is_active: true,
              widgets: [
                {
                  id: 'health_table',
                  type: 'TABLE',
                  title: 'Specialty Consultation Summary',
                  data_key: 'contacts.feedbackSummary',
                  columns: [
                    { key: 'associate', label: 'Medical Rep / Doctor' },
                    { key: 'total', label: 'Total Inquiries' },
                    { key: 'fresh', label: 'Scheduled' },
                    { key: 'interested', label: 'Consulted' },
                    { key: 'won', label: 'In-Treatment' }
                  ]
                },
                {
                  id: 'health_donut',
                  type: 'CHART',
                  title: 'Specialty Inquiry Distribution',
                  chart_type: 'donut',
                  data_key: 'contacts.chartData'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      code: 'temp0004',
      name: 'Education',
      tabs: [
        {
          id: 0,
          label: 'Admissions & Enrollment',
          sections: [
            {
              id: 'edu_kpis',
              title: 'Enrollment Metrics',
              order: 0,
              is_active: true,
              widgets: [
                { id: 'totalApplicants', type: 'KPI', title: 'Total Applicants', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'SchoolIcon', data_key: 'cards.totalLeads' },
                { id: 'counseling', type: 'KPI', title: 'Counseling Scheduled', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'AssignmentIcon', data_key: 'cards.fresh' },
                { id: 'entrancePassed', type: 'KPI', title: 'Entrance Passed', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.interested' },
                { id: 'enrolled', type: 'KPI', title: 'Total Enrolled', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'GradeIcon', data_key: 'cards.closedWon' }
              ]
            },
            {
              id: 'edu_breakdown',
              title: 'Program Application Summary',
              order: 1,
              is_active: true,
              widgets: [
                {
                  id: 'edu_table',
                  type: 'TABLE',
                  title: 'Degree / Program Conversion',
                  data_key: 'contacts.feedbackSummary',
                  columns: [
                    { key: 'associate', label: 'Admissions Counselor' },
                    { key: 'total', label: 'Total Inquiries' },
                    { key: 'fresh', label: 'Counseling' },
                    { key: 'interested', label: 'Test Passed' },
                    { key: 'won', label: 'Enrolled' }
                  ]
                },
                {
                  id: 'edu_donut',
                  type: 'CHART',
                  title: 'Course Admissions Distribution',
                  chart_type: 'donut',
                  data_key: 'contacts.chartData'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      code: 'temp0005',
      name: 'Financial Services',
      tabs: [
        {
          id: 0,
          label: 'Loan & Policy Portfolio',
          sections: [
            {
              id: 'fin_kpis',
              title: 'Portfolio & Application KPIs',
              order: 0,
              is_active: true,
              widgets: [
                { id: 'loanApps', type: 'KPI', title: 'Applications', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'AccountBalanceIcon', data_key: 'cards.totalLeads' },
                { id: 'kycDone', type: 'KPI', title: 'KYC Verified', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'VerifiedUserIcon', data_key: 'cards.fresh' },
                { id: 'sanctioned', type: 'KPI', title: 'Underwriting Passed', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'ThumbUpIcon', data_key: 'cards.interested' },
                { id: 'disbursed', type: 'KPI', title: 'Disbursed', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' }
              ]
            },
            {
              id: 'fin_breakdown',
              title: 'Financial Product Conversion',
              order: 1,
              is_active: true,
              widgets: [
                {
                  id: 'fin_table',
                  type: 'TABLE',
                  title: 'Product Line Performance',
                  data_key: 'contacts.feedbackSummary',
                  columns: [
                    { key: 'associate', label: 'Financial Advisor' },
                    { key: 'total', label: 'Applications' },
                    { key: 'fresh', label: 'KYC Done' },
                    { key: 'interested', label: 'Sanctioned' },
                    { key: 'won', label: 'Disbursed' }
                  ]
                },
                {
                  id: 'fin_donut',
                  type: 'CHART',
                  title: 'Product Line Distribution',
                  chart_type: 'donut',
                  data_key: 'contacts.chartData'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      code: 'temp0006',
      name: 'IT & Tech Services',
      tabs: [
        {
          id: 0,
          label: 'RFP & Proposal Pipeline',
          sections: [
            {
              id: 'it_kpis',
              title: 'Tech Pipeline Metrics',
              order: 0,
              is_active: true,
              widgets: [
                { id: 'activeRfps', type: 'KPI', title: 'RFPs Received', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'ComputerIcon', data_key: 'cards.totalLeads' },
                { id: 'techDiscovery', type: 'KPI', title: 'Tech Discovery', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', icon: 'SearchIcon', data_key: 'cards.fresh' },
                { id: 'proposalsSent', type: 'KPI', title: 'Proposals Sent', color: '#06B6D4', bg: 'rgba(6,182,212,0.06)', icon: 'DescriptionIcon', data_key: 'cards.interested' },
                { id: 'sowSigned', type: 'KPI', title: 'SOW Signed', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.closedWon' }
              ]
            },
            {
              id: 'it_breakdown',
              title: 'Service Line RFP Conversion',
              order: 1,
              is_active: true,
              widgets: [
                {
                  id: 'it_table',
                  type: 'TABLE',
                  title: 'Service Line Conversion',
                  data_key: 'contacts.feedbackSummary',
                  columns: [
                    { key: 'associate', label: 'Tech Lead / BD' },
                    { key: 'total', label: 'Total RFPs' },
                    { key: 'fresh', label: 'Discovery' },
                    { key: 'interested', label: 'Proposal Sent' },
                    { key: 'won', label: 'SOW Signed' }
                  ]
                },
                {
                  id: 'it_donut',
                  type: 'CHART',
                  title: 'Service Line Distribution',
                  chart_type: 'donut',
                  data_key: 'contacts.chartData'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      code: 'temp0007',
      name: 'Manufacturing',
      tabs: [
        {
          id: 0,
          label: 'Dealer & Supply Network',
          sections: [
            {
              id: 'mfg_kpis',
              title: 'Supply Chain Metrics',
              order: 0,
              is_active: true,
              widgets: [
                { id: 'dealerRfqs', type: 'KPI', title: 'Dealer RFQs', color: '#F43F5E', bg: 'rgba(244,63,94,0.06)', icon: 'BuildIcon', data_key: 'cards.totalLeads' },
                { id: 'moqApproved', type: 'KPI', title: 'MOQ Approved', color: '#EC4899', bg: 'rgba(236,72,153,0.06)', icon: 'CheckCircleIcon', data_key: 'cards.fresh' },
                { id: 'productionBatches', type: 'KPI', title: 'In Production', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', icon: 'PrecisionManufacturingIcon', data_key: 'cards.interested' },
                { id: 'shippedOrders', type: 'KPI', title: 'Shipped Orders', color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: 'LocalShippingIcon', data_key: 'cards.closedWon' }
              ]
            },
            {
              id: 'mfg_breakdown',
              title: 'Product Line Order Breakdown',
              order: 1,
              is_active: true,
              widgets: [
                {
                  id: 'mfg_table',
                  type: 'TABLE',
                  title: 'Dealer Category Order Summary',
                  data_key: 'contacts.feedbackSummary',
                  columns: [
                    { key: 'associate', label: 'Dealer Rep' },
                    { key: 'total', label: 'Total RFQs' },
                    { key: 'fresh', label: 'MOQ Approved' },
                    { key: 'interested', label: 'Production' },
                    { key: 'won', label: 'Shipped' }
                  ]
                },
                {
                  id: 'mfg_donut',
                  type: 'CHART',
                  title: 'Product Category Distribution',
                  chart_type: 'donut',
                  data_key: 'contacts.chartData'
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  for (const item of OTHER_INDUSTRIES) {
    const indDoc = await Industry.findOne({ code: item.code });
    if (!indDoc) continue;
    const indIdStr = String(indDoc._id);

    const existing = await AnalyticsConfig.findOne({ industry_id: indIdStr });
    if (!existing || !existing.tabs || existing.tabs.length === 0) {
      if (existing) {
        await AnalyticsConfig.deleteOne({ _id: existing._id });
      }
      await AnalyticsConfig.create({
        industry_id: indIdStr,
        dashboard_key: 'default',
        tabs: item.tabs
      });
      console.log(`[seed] Seeded AnalyticsConfig for ${item.name} (${item.code})`);
    }
  }

  console.log('[seed] Successfully seeded dynamic Analytics configurations across all industry verticals.');
}

async function seedAdminAnalyticsSidebarPermissions() {
  const SidebarMenu = mongoose.model('SidebarMenu');
  const SidebarPermission = mongoose.model('SidebarPermission');
  const Role = mongoose.model('Role');
  const Industry = mongoose.model('Industry');

  // 1. Enforce Master Catalog, Legacy Key Remapping & Order Consolidation
  const CANONICAL_MENUS = [
    { key: 'analytics', name: 'Analytics', route: '/analytics', icon: 'analytics', parentKey: null, order: 10 },
    { key: 'organization', name: 'Organization', route: '/organization/list', icon: 'organization', parentKey: null, order: 20 },
    { key: 'users', name: 'Users', route: '/users', icon: 'users', parentKey: null, order: 30 },
    { key: 'leads', name: 'Lead Section', route: '', icon: 'leads', parentKey: null, order: 40 },
    { key: 'configuration', name: 'Configuration', route: '', icon: 'configuration', parentKey: null, order: 50 },
    { key: 'integrations', name: 'Integrations', route: '', icon: 'integrations', parentKey: null, order: 60 },
    { key: 'uiNavigation', name: 'UI & Navigation', route: '', icon: 'sidebar', parentKey: null, order: 70 },
    { key: 'accessControl', name: 'Access Control', route: '', icon: 'shield', parentKey: null, order: 80 },
    { key: 'invoices', name: 'Invoices', route: '', icon: 'billing', parentKey: null, order: 90 },
    { key: 'support', name: 'Support', route: '', icon: 'support', parentKey: null, order: 100 },
    { key: 'account', name: 'Account & Settings', route: '', icon: 'account', parentKey: null, order: 110 },

    { key: 'leads.contact', name: 'Contacts List', route: '/leads/contacts', icon: 'contact', parentKey: 'leads', order: 41 },
    { key: 'leads.tasks', name: 'Tasks List', route: '/leads/tasks', icon: 'tasks', parentKey: 'leads', order: 42 },
    { key: 'leads.call', name: 'Call Logs List', route: '/leads/call-logs', icon: 'call', parentKey: 'leads', order: 43 },
    { key: 'leads.sorted', name: 'Sorted List', route: '/leads/sorted', icon: 'sort', parentKey: 'leads', order: 44 },

    { key: 'configuration.industries', name: 'Industry', route: '/configuration/industries', icon: 'organization', parentKey: 'configuration', order: 51 },
    { key: 'configuration.projects', name: 'Project', route: '/configuration/projects', icon: 'projects', parentKey: 'configuration', order: 52 },
    { key: 'configuration.resources', name: 'Resources', route: '/configuration/resources', icon: 'resources', parentKey: 'configuration', order: 53 },
    { key: 'configuration.domainSettings', name: 'Domain Settings', route: '/configuration/domain-settings', icon: 'domain', parentKey: 'configuration', order: 54 },

    { key: 'integrations.api', name: 'API Tokens', route: '/integrations/api', icon: 'api', parentKey: 'integrations', order: 61 },
    { key: 'integrations.whatsapp', name: 'WhatsApp API', route: '/integrations/whatsapp', icon: 'whatsapp', parentKey: 'integrations', order: 62 },

    { key: 'uiNavigation.analyticsConfig', name: 'Analytics Layout Builder', route: '/ui-navigation/analytics-config', icon: 'settings', parentKey: 'uiNavigation', order: 71 },
    { key: 'uiNavigation.menus', name: 'Sidebar Menus', route: '/ui-navigation/menus', icon: 'sidebar', parentKey: 'uiNavigation', order: 72 },
    { key: 'uiNavigation.screens', name: 'Screens', route: '/ui-navigation/screens', icon: 'headers', parentKey: 'uiNavigation', order: 73 },
    { key: 'uiNavigation.screenFields', name: 'Screen Fields', route: '/ui-navigation/screen-fields', icon: 'headers', parentKey: 'uiNavigation', order: 74 },

    { key: 'accessControl.roles', name: 'Roles & Permissions', route: '/access-control/roles', icon: 'shield', parentKey: 'accessControl', order: 81 },
    { key: 'accessControl.permissions', name: 'Permission Matrix (Sidebar)', route: '/access-control/permissions', icon: 'shield', parentKey: 'accessControl', order: 82 },
    { key: 'accessControl.screenPermissions', name: 'Permission Fields', route: '/access-control/screen-permissions', icon: 'shield', parentKey: 'accessControl', order: 83 },

    { key: 'invoices.paymentLogs', name: 'Payment Invoice Logs', route: '/invoices/payment-invoices', icon: 'billing', parentKey: 'invoices', order: 91 },
    { key: 'invoices.receiptsHistory', name: 'Receipts & Historical Charges', route: '/invoices/receipts-history', icon: 'subscription', parentKey: 'invoices', order: 92 },

    { key: 'support.news', name: 'News List', route: '/support/news', icon: 'news', parentKey: 'support', order: 101 },
    { key: 'support.faq', name: 'FAQ List', route: '/support/faq', icon: 'faq', parentKey: 'support', order: 102 },

    { key: 'account.licenses', name: 'License Cost', route: '/account/licenses', icon: 'billing', parentKey: 'account', order: 111 },
    { key: 'account.coupons', name: 'Coupons', route: '/account/coupons', icon: 'coupon', parentKey: 'account', order: 112 },
    { key: 'account.password', name: 'Update Password', route: '/account/update-password', icon: 'password', parentKey: 'account', order: 113 },
  ];

  // Build canonical menu documents map by key
  const menuDocMap = new Map();
  for (const item of CANONICAL_MENUS) {
    let parentId = null;
    if (item.parentKey) {
      const parentDoc = menuDocMap.get(item.parentKey);
      if (parentDoc) parentId = parentDoc._id;
    }

    let existingDoc = await SidebarMenu.findOne({ key: item.key, organization_id: null });
    if (!existingDoc) {
      existingDoc = await SidebarMenu.create({
        key: item.key,
        name: item.name,
        route: item.route,
        icon: item.icon,
        module: item.parentKey || item.key,
        parent_id: parentId,
        order: item.order,
        organization_id: null,
        industry_id: null,
        isActive: true,
      });
    } else {
      await SidebarMenu.updateOne(
        { _id: existingDoc._id },
        {
          $set: {
            name: item.name,
            route: item.route,
            icon: item.icon,
            module: item.parentKey || item.key,
            parent_id: parentId,
            order: item.order,
            organization_id: null,
            industry_id: null,
            isActive: true,
          },
        }
      );
      existingDoc = await SidebarMenu.findOne({ _id: existingDoc._id });
    }
    menuDocMap.set(item.key, existingDoc);
  }

  // Ensure default temp0001 industry exists
  let temp0001Ind = await Industry.findOne({ code: 'temp0001' }).exec();
  if (!temp0001Ind) {
    temp0001Ind = await Industry.create({ code: 'temp0001', name: 'Real Estate', isActive: true });
  }

  const allMenus = Array.from(menuDocMap.values());
  if (!allMenus.length) return;

  // 2. Grant FULL sidebar permissions to all superAdmin template roles (excluding Domain Settings)
  const superAdminRoles = await Role.find({ key: 'superAdmin', organization_id: null }).lean().exec();
  for (const r of superAdminRoles) {
    const orgId = null;
    const indId = r.industry_id || temp0001Ind._id;
    for (const menu of allMenus) {
      const isVisible = !(menu.key === 'configuration.domainSettings' || menu.key === 'integrations.domainSettings');
      try {
        await SidebarPermission.updateOne(
          { role_id: r._id, industry_id: indId, menu_id: menu._id, organization_id: orgId },
          {
            $set: {
              is_visible: isVisible,
              role_key: 'superAdmin',
              menu_key: menu.key,
            },
          },
          { upsert: true }
        );
      } catch (e) {
        // ignore duplicate index conflicts
      }
    }
  }

  // 3. Grant standard sidebar permissions to all admin template roles
  const adminRoles = await Role.find({ key: 'admin', organization_id: null }).lean().exec();
  const adminAllowedKeys = new Set();
  const defaultAdminList = DEFAULT_SIDEBAR_CONFIGS.find(cfg => cfg.industryId === 'temp0001')?.roles?.admin || [];
  for (const m of defaultAdminList) {
    adminAllowedKeys.add(m.key);
    if (m.key.includes('.')) {
      adminAllowedKeys.add(m.key.split('.')[0]);
    }
  }

  for (const r of adminRoles) {
    const orgId = null;
    const indId = r.industry_id || temp0001Ind._id;
    for (const menu of allMenus) {
      const isVisible = adminAllowedKeys.has(menu.key);
      try {
        await SidebarPermission.updateOne(
          { role_id: r._id, industry_id: indId, menu_id: menu._id, organization_id: orgId },
          {
            $set: {
              is_visible: isVisible,
              role_key: 'admin',
              menu_key: menu.key,
            },
          },
          { upsert: true }
        );
      } catch (e) {
        // ignore duplicate index conflicts
      }
    }
  }

  const finalMenuCount = await SidebarMenu.countDocuments();
  console.log(`[seed] Master SidebarMenu catalog sanitized: ${finalMenuCount} canonical global menus in DB.`);
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
  seedAnalyticsConfig,
  seedAdminAnalyticsSidebarPermissions,
};
