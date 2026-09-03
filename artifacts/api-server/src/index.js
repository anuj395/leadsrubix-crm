// Environment loader supporting .env.development, .env.production, and .env
const path = require('path');
const fs = require('fs');
const currentEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  path.resolve(__dirname, `../.env.${currentEnv}`),
  path.resolve(__dirname, `../../.env.${currentEnv}`),
  path.resolve(__dirname, `../.env`),
  path.resolve(__dirname, `../../.env`),
];
let loadedEnvPath = null;
for (const f of envFiles) {
  if (fs.existsSync(f)) {
    require('dotenv').config({ path: f });
    loadedEnvPath = f;
    break;
  }
}
console.log(`[env] 🚀 Active NODE_ENV="${process.env.NODE_ENV || 'development'}" | Loaded: ${loadedEnvPath || 'System Environment'}`);
const pgMongoose = require('./db/pgMongoose');
require.cache[require.resolve('mongoose')] = {
  id: require.resolve('mongoose'),
  filename: require.resolve('mongoose'),
  loaded: true,
  exports: pgMongoose,
};

const app = require('./app');
const config = require('./config');
const db = require('./db');

// Register all models before seeding / migrations
require('./models/userModel');
require('./models/industryModel');
require('./models/roleModel');
require('./models/sidebarMenuModel');
require('./models/sidebarPermissionModel');
require('./models/screenModel');
require('./models/screenFieldModel');
require('./models/screenPermissionModel');
require('./models/roleActionPermissionModel');
require('./models/contactModel');
require('./models/organizationModel');
require('./models/accountModel');
require('./models/bookingModel');
require('./models/dealModel');
require('./models/quoteModel');
require('./models/pricingPlanModel');
require('./models/couponModel');
require('./models/faqModel');
require('./models/newsModel');
require('./models/whatsappConfigModel');
require('./models/resourceItemModel');
require('./models/apiTokenModel');
require('./models/apiDataModel');
require('./models/leadDistributionModel');
require('./models/dropdownOptionModel');
require('./models/teamModel');
require('./models/branchModel');
require('./models/designationModel');
require('./models/holidayModel');
require('./models/workingDayModel');
require('./models/workspaceModel');
require('./models/analyticsConfigModel');
require('./models/importLogModel');
require('./models/callLogModel');
require('./models/sidebarModel');
require('./models/taskModel');
require('./models/notificationModel');
require('./models/notificationSettingModel');

const {
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
} = require('./seed');

const migrateExistingWorkspaces = async () => {
  const mongoose = require('mongoose');
  const Organization = mongoose.model('Organization');
  const Workspace = mongoose.model('Workspace');
  const User = mongoose.model('User');
  const { cloneWorkspace } = require('./services/workspaceCloner');

  // Drop old unique indexes that conflict with tenant-scoped records
  const drops = [
    { coll: 'roles', index: 'idx_role_industry_key' },
    { coll: 'sidebar_menus', index: 'idx_menu_key' },
    { coll: 'sidebar_permissions', index: 'idx_perm_unique' },
    { coll: 'screens', index: 'idx_screen_key' },
    { coll: 'screen_permissions', index: 'idx_screen_perm_unique' },
    { coll: 'role_action_permissions', index: 'idx_role_action_perm_unique' }
  ];
  for (const item of drops) {
    try {
      await mongoose.connection.collection(item.coll).dropIndex(item.index);
      console.log(`[migration] Dropped old index ${item.index} on ${item.coll}`);
    } catch (e) {
      // index might not exist or collection not initialized yet
    }
  }

  // Ensure new indexes are built (excluding SidebarPermission for now)
  await Promise.all([
    mongoose.model('Role').syncIndexes(),
    mongoose.model('SidebarMenu').syncIndexes(),
    mongoose.model('Screen').syncIndexes(),
    mongoose.model('RoleActionPermission').syncIndexes(),
  ]);

  // 1. Deduplicate SidebarPermission collection
  const SidebarPermission = mongoose.model('SidebarPermission');
  const SidebarMenu = mongoose.model('SidebarMenu');
  const allPerms = await SidebarPermission.find({}).exec();
  const seenPerms = new Set();
  let deletedPermsCount = 0;
  for (const perm of allPerms) {
    const key = `${perm.organization_id || 'null'}:${perm.role_id}:${perm.industry_id}:${perm.menu_id}`;
    if (seenPerms.has(key)) {
      await SidebarPermission.deleteOne({ _id: perm._id }).exec();
      deletedPermsCount++;
    } else {
      seenPerms.add(key);
    }
  }
  if (deletedPermsCount > 0) {
    console.log(`[migration] Cleaned up ${deletedPermsCount} duplicate sidebar permissions from DB.`);
  }

  // Self-heal any quoted _id primary keys in all tables (e.g. from previous ObjectId.toString() JSON.stringify bug)
  if (pgMongoose.pool) {
    try {
      const tablesRes = await pgMongoose.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      for (const row of tablesRes.rows) {
        const tableName = row.table_name;
        try {
          const updateRes = await pgMongoose.pool.query(`
            UPDATE ${tableName} 
            SET _id = TRIM(BOTH '"' FROM _id) 
            WHERE _id LIKE '"%"'
          `);
          if (updateRes.rowCount > 0) {
            console.log(`[migration] Cleaned up ${updateRes.rowCount} quoted _id values in table ${tableName}`);
          }
        } catch (e) {
          // Table may not have _id column, ignore
        }
      }
    } catch (err) {
      console.error('[migration] Failed to self-heal quoted _ids:', err);
    }
  }

  // Now sync indexes for SidebarPermission safely
  await mongoose.model('SidebarPermission').syncIndexes();

  // 2. Self-heal corrupted organization permissions (where menu_id points to global template menu)
  const orgPerms = await SidebarPermission.find({ organization_id: { $ne: null } }).exec();
  let healedPermsCount = 0;
  for (const perm of orgPerms) {
    const menu = await SidebarMenu.findOne({ _id: perm.menu_id }).exec();
    if (menu && !menu.organization_id) {
      // Points to template menu! Find the corresponding cloned menu for this organization
      const clonedMenu = await SidebarMenu.findOne({ key: menu.key, organization_id: perm.organization_id }).exec();
      if (clonedMenu) {
        const existing = await SidebarPermission.findOne({
          organization_id: perm.organization_id,
          role_id: perm.role_id,
          industry_id: perm.industry_id,
          menu_id: clonedMenu._id
        }).exec();
        if (existing) {
          await SidebarPermission.deleteOne({ _id: perm._id }).exec();
        } else {
          await SidebarPermission.updateOne(
            { _id: perm._id },
            { $set: { menu_id: clonedMenu._id } }
          ).exec();
          healedPermsCount++;
        }
      }
    }
  }
  if (healedPermsCount > 0) {
    console.log(`[migration] Successfully self-healed ${healedPermsCount} organization sidebar permissions.`);
  }

  // 3. Remove Domain Settings visibility from all superAdmin roles (both template and cloned roles)
  const Role = mongoose.model('Role');
  const superAdminRoles = await Role.find({ key: 'superAdmin' }).exec();
  const superAdminRoleIds = superAdminRoles.map(r => r._id);
  if (superAdminRoleIds.length > 0) {
    const domainMenus = await SidebarMenu.find({
      key: { $in: ['configuration.domainSettings', 'integrations.domainSettings'] }
    }).exec();
    const domainMenuIds = domainMenus.map(m => m._id);
    if (domainMenuIds.length > 0) {
      const updateRes = await SidebarPermission.updateMany(
        {
          role_id: { $in: superAdminRoleIds },
          menu_id: { $in: domainMenuIds }
        },
        { $set: { is_visible: false } }
      ).exec();
      if (updateRes.modifiedCount > 0) {
        console.log(`[migration] Successfully disabled Domain Settings menu visibility for ${updateRes.modifiedCount} superAdmin permissions.`);
      }
    }
  }

  // 4. Swap Domain Settings from Integrations to Configuration for all Admin roles
  const adminRoles = await Role.find({ key: 'admin' }).exec();
  const adminRoleIds = adminRoles.map(r => r._id);
  if (adminRoleIds.length > 0) {
    const configDomainMenu = await SidebarMenu.findOne({ key: 'configuration.domainSettings', organization_id: null }).exec();
    const integrationDomainMenu = await SidebarMenu.findOne({ key: 'integrations.domainSettings', organization_id: null }).exec();

    if (configDomainMenu && integrationDomainMenu) {
      let swappedCount = 0;
      const Industry = mongoose.model('Industry');
      const defaultInd = await Industry.findOne({ code: 'temp0001' }).exec();
      const defaultIndId = defaultInd ? defaultInd._id : null;

      for (const roleDoc of adminRoles) {
        const roleId = roleDoc._id;
        const orgId = roleDoc.organization_id || null;
        
        let orgConfigMenu = null;
        let orgIntegrationMenu = null;
        if (orgId) {
          orgConfigMenu = await SidebarMenu.findOne({ key: 'configuration.domainSettings', organization_id: orgId }).exec();
          orgIntegrationMenu = await SidebarMenu.findOne({ key: 'integrations.domainSettings', organization_id: orgId }).exec();
        }
        const activeConfigMenu = orgConfigMenu || configDomainMenu;
        const activeIntegrationMenu = orgIntegrationMenu || integrationDomainMenu;

        const intPerm = await SidebarPermission.findOne({ role_id: roleId, menu_id: activeIntegrationMenu._id }).exec();
        if (intPerm && intPerm.is_visible) {
          await SidebarPermission.updateOne({ _id: intPerm._id }, { $set: { is_visible: false } });
          swappedCount++;
        }

        const configPerm = await SidebarPermission.findOne({ role_id: roleId, menu_id: activeConfigMenu._id }).exec();
        if (configPerm) {
          if (!configPerm.is_visible) {
            await SidebarPermission.updateOne({ _id: configPerm._id }, { $set: { is_visible: true } });
            swappedCount++;
          }
        } else {
          await SidebarPermission.create({
            role_id: roleId,
            industry_id: roleDoc.industry_id || roleDoc.industryId || defaultIndId,
            menu_id: activeConfigMenu._id,
            organization_id: orgId,
            workspace_id: roleDoc.workspace_id || null,
            is_visible: true
          });
          swappedCount++;
        }
      }
      if (swappedCount > 0) {
        console.log(`[migration] Successfully swapped Domain Settings visibility from Integrations to Configuration for ${adminRoleIds.length} Admin roles.`);
      }
    }
  }

  // 5. Self-heal any existing integrations.whatsapp SidebarMenu routes in the database
  const whatsappUpdateRes = await SidebarMenu.updateMany(
    { key: 'integrations.whatsapp' },
    { $set: { route: '/integrations/whatsapp' } }
  ).exec();
  if (whatsappUpdateRes.modifiedCount > 0) {
    console.log(`[migration] Successfully self-healed ${whatsappUpdateRes.modifiedCount} integrations.whatsapp menu routes to /integrations/whatsapp.`);
  }

  // 6. Self-heal any existing SidebarMenu routes in the database to align with correct section-based modules
  const routeUpdates = [
    { key: 'uiNavigation.analyticsConfig', route: '/ui-navigation/analytics-config' },
    { key: 'uiNavigation.menus', route: '/ui-navigation/menus' },
    { key: 'uiNavigation.screens', route: '/ui-navigation/screens' },
    { key: 'uiNavigation.screenFields', route: '/ui-navigation/screen-fields' },
    { key: 'accessControl.roles', route: '/access-control/roles' },
    { key: 'accessControl.permissions', route: '/access-control/permissions' },
    { key: 'accessControl.screenPermissions', route: '/access-control/screen-permissions' },
    { key: 'invoices.paymentLogs', route: '/invoices/payment-invoices' },
    { key: 'invoices.receiptsHistory', route: '/invoices/receipts-history' }
  ];

  let routeHealedCount = 0;
  for (const item of routeUpdates) {
    const res = await SidebarMenu.updateMany(
      { key: item.key },
      { $set: { route: item.route } }
    ).exec();
    routeHealedCount += res.modifiedCount;
  }
  if (routeHealedCount > 0) {
    console.log(`[migration] Successfully self-healed ${routeHealedCount} sidebar menu routes to match correct module sections.`);
  }

  // 6b. Self-heal cloned menus name overrides to match latest industry overrides
  try {
    const { INDUSTRY_MENU_OVERRIDES } = require('./seed');
    const Industry = mongoose.model('Industry');
    const allOrgs = await Organization.find({}).exec();
    let nameUpdatedCount = 0;
    for (const org of allOrgs) {
      let indDoc = null;
      const orgIndustryId = org.industry_id || org.industryId;
      if (orgIndustryId) {
        if (mongoose.Types.ObjectId.isValid(orgIndustryId)) {
          indDoc = await Industry.findById(orgIndustryId).exec();
        } else {
          indDoc = await Industry.findOne({ code: orgIndustryId }).exec();
        }
      }
      if (!indDoc) continue;
      const overrides = INDUSTRY_MENU_OVERRIDES[indDoc.code];
      if (!overrides) continue;

      for (const [menuKey, overName] of Object.entries(overrides)) {
        const res = await SidebarMenu.updateMany(
          { organization_id: org.id || org._id, key: menuKey },
          { $set: { name: overName } }
        ).exec();
        nameUpdatedCount += res.modifiedCount;
      }
    }
    if (nameUpdatedCount > 0) {
      console.log(`[migration] Successfully updated ${nameUpdatedCount} cloned sidebar menu names to match latest industry overrides.`);
    }
  } catch (e) {
    console.error('[migration] Failed to self-heal cloned menu names:', e);
  }

  // 6c. Self-heal cloned menus parent_id hierarchy mapping in the database
  try {
    const allClonedMenus = await SidebarMenu.find({ organization_id: { $ne: null } }).exec();
    let parentHealedCount = 0;
    for (const m of allClonedMenus) {
      if (m.key.includes('.')) {
        const parts = m.key.split('.');
        const parentKey = parts[0];
        let parentMenu = await SidebarMenu.findOne({
          organization_id: m.organization_id,
          key: parentKey
        }).exec();
        if (!parentMenu) {
          parentMenu = await SidebarMenu.findOne({
            organization_id: null,
            industry_id: null,
            key: parentKey
          }).exec();
        }
        if (parentMenu && String(m.parent_id) !== String(parentMenu._id)) {
          m.parent_id = parentMenu._id;
          await m.save();
          parentHealedCount++;
        }
      }
    }
    if (parentHealedCount > 0) {
      console.log(`[migration] Successfully self-healed ${parentHealedCount} cloned sidebar menu parent_id hierarchies.`);
    }
  } catch (e) {
    console.error('[migration] Failed to self-heal cloned menu parent_ids:', e);
  }

  const organizations = await Organization.find({}).exec();
  for (const org of organizations) {
    const orgId = org.organizationId || org.organization_id;
    if (!orgId) continue;

    let ws = await Workspace.findOne({ organization_id: orgId }).exec();
    if (!ws) {
      console.log(`[migration] Creating workspace for existing organization: ${orgId}`);
      const workspaceId = 'ws_' + orgId;
      ws = await Workspace.create({
        workspace_id: workspaceId,
        organization_id: orgId,
        industry_id: org.industryId || org.industry_id || 'basic_crm',
        status: 'ACTIVE',
        created_by: 'MIGRATION',
      });

      await User.updateMany(
        { organization_id: orgId },
        { $set: { workspace_id: workspaceId } }
      ).exec();

      try {
        await cloneWorkspace(orgId, workspaceId, org.industryId || org.industry_id || 'basic_crm');
        console.log(`[migration] Successfully cloned workspace templates for: ${orgId}`);
      } catch (err) {
        console.error(`[migration] Failed to clone workspace templates for org: ${orgId}:`, err.message);
      }
    } else {
      const roleCount = await mongoose.model('Role').countDocuments({ organization_id: orgId });
      if (roleCount === 0) {
        console.log(`[migration] Self-healing workspace configuration for: ${orgId}`);
        try {
          await cloneWorkspace(orgId, ws.workspace_id, org.industryId || org.industry_id || 'basic_crm');
          console.log(`[migration] Successfully self-healed workspace templates for: ${orgId}`);
        } catch (err) {
          console.error(`[migration] Failed to clone workspace templates for org: ${orgId}:`, err.message);
        }
      }
    }
  }
};

const PORT = (process.env.PORT && process.env.PORT !== '5000') ? process.env.PORT : 8080;

(async () => {
  await db.connect();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  try {
    await seedUsers();
  } catch (err) {
    console.error('[seed] failed to seed users:', err.message || err);
  }

  try {
    await migrateAndSeedSidebar();
  } catch (err) {
    console.error('[seed] failed to migrate/seed sidebar:', err.message || err);
  }

  try {
    await fixIntegrationsSidebar();
  } catch (err) {
    console.error('[seed] failed to fix integrations sidebar routes:', err.message || err);
  }

  try {
    await seedLeadDistributionSidebar();
  } catch (err) {
    console.error('[seed] failed to seed lead distribution sidebar:', err.message || err);
  }

  try {
    const { startSubscriptionCron } = require('./cron/subscriptionCron');
    startSubscriptionCron();
  } catch (err) {
    console.error('[subscriptionCron] failed to start subscription cron:', err.message || err);
  }

  try {
    await seedIndustries();
  } catch (err) {
    console.error('[seed] failed to seed industries:', err.message || err);
  }

  try {
    await seedScreens();
  } catch (err) {
    console.error('[seed] failed to seed screens:', err.message || err);
  }

  try {
    await seedDropdownOptions();
  } catch (err) {
    console.error('[seed] failed to seed dropdown options:', err.message || err);
  }

  try {
    await seedAnalyticsConfig();
  } catch (err) {
    console.error('[seed] failed to seed analytics configurations:', err.message || err);
  }

  try {
    await seedAdminAnalyticsSidebarPermissions();
  } catch (err) {
    console.error('[seed] failed to seed admin analytics sidebar permissions:', err.message || err);
  }

  try {
    await migrateExistingWorkspaces();
  } catch (err) {
    console.error('[migration] failed to migrate existing workspaces:', err.stack || err);
  }

  try {
    const { startSubscriptionCron } = require('./cron/subscriptionCron');
    startSubscriptionCron();
  } catch (err) {
    console.error('[cron] failed to start subscription cron:', err.message || err);
  }

  try {
    const { startLeadRotationCron } = require('./services/leadRotationService');
    startLeadRotationCron();
  } catch (err) {
    console.error('[cron] failed to start lead rotation cron:', err.message || err);
  }
})();
