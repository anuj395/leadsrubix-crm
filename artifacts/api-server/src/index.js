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
require('./models/leadDistributionModel');
require('./models/dropdownOptionModel');
require('./models/teamModel');
require('./models/branchModel');
require('./models/designationModel');
require('./models/holidayModel');
require('./models/workingDayModel');


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
} = require('./seed');

const PORT = config.port || 3001;

(async () => {
  await db.connect();

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

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();
