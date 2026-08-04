// src/index.js
// Entry point for the application. Loads config, creates server. Enforce secure tenant, industry, teams and branches option matching.
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
require('./models/bookingModel');
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
    { coll: 'screen_permissions', index: 'idx_screen_perm_unique' }
  ];
  for (const item of drops) {
    try {
      await mongoose.connection.collection(item.coll).dropIndex(item.index);
      console.log(`[migration] Dropped old index ${item.index} on ${item.coll}`);
    } catch (e) {
      // index might not exist or collection not initialized yet
    }
  }

  // Ensure new indexes are built
  await Promise.all([
    mongoose.model('Role').syncIndexes(),
    mongoose.model('SidebarMenu').syncIndexes(),
    mongoose.model('SidebarPermission').syncIndexes(),
    mongoose.model('Screen').syncIndexes(),
    mongoose.model('ScreenPermission').syncIndexes()
  ]);

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
        industry_id: org.industryId || org.industry_id || 'temp0001',
        status: 'ACTIVE',
        created_by: 'MIGRATION',
      });

      await User.updateMany(
        { organization_id: orgId },
        { $set: { workspace_id: workspaceId } }
      ).exec();

      try {
        await cloneWorkspace(orgId, workspaceId, org.industryId || org.industry_id || 'temp0001');
        console.log(`[migration] Successfully cloned workspace templates for: ${orgId}`);
      } catch (err) {
        console.error(`[migration] Failed to clone workspace templates for org: ${orgId}:`, err.message);
      }
    } else {
      const roleCount = await mongoose.model('Role').countDocuments({ organization_id: orgId });
      if (roleCount === 0) {
        console.log(`[migration] Self-healing workspace configuration for: ${orgId}`);
        try {
          await cloneWorkspace(orgId, ws.workspace_id, org.industryId || org.industry_id || 'temp0001');
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
    console.error('[migration] failed to migrate existing workspaces:', err.message || err);
  }
})();
