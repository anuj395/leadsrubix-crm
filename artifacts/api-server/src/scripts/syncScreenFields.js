// src/scripts/syncScreenFields.js
// Migration script to immediately synchronize screen fields in the database
// according to the latest SCREEN_DEFAULTS in seed.js.

const path = require('path');
const fs = require('fs');

const currentEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  path.resolve(__dirname, `../../.env.${currentEnv}`),
  path.resolve(__dirname, `../.env.${currentEnv}`),
  path.resolve(__dirname, `../../.env`),
  path.resolve(__dirname, `../.env`),
];
for (const f of envFiles) {
  if (fs.existsSync(f)) {
    require('dotenv').config({ path: f });
    break;
  }
}

const pgMongoose = require('../db/pgMongoose');
require.cache[require.resolve('mongoose')] = {
  id: require.resolve('mongoose'),
  filename: require.resolve('mongoose'),
  loaded: true,
  exports: pgMongoose,
};

const { connect, disconnect, mongoose } = require('../db');

// Register all models before seeding / migrations
require('../models/userModel');
require('../models/industryModel');
require('../models/roleModel');
require('../models/sidebarMenuModel');
require('../models/sidebarPermissionModel');
require('../models/screenModel');
require('../models/screenFieldModel');
require('../models/screenPermissionModel');
require('../models/roleActionPermissionModel');
require('../models/contactModel');
require('../models/organizationModel');
require('../models/accountModel');
require('../models/bookingModel');
require('../models/dealModel');
require('../models/quoteModel');
require('../models/pricingPlanModel');
require('../models/couponModel');
require('../models/faqModel');
require('../models/newsModel');
require('../models/whatsappConfigModel');
require('../models/resourceItemModel');
require('../models/apiTokenModel');
require('../models/apiDataModel');
require('../models/leadDistributionModel');
require('../models/dropdownOptionModel');
require('../models/teamModel');
require('../models/branchModel');
require('../models/designationModel');
require('../models/holidayModel');
require('../models/workingDayModel');
require('../models/workspaceModel');
require('../models/analyticsConfigModel');
require('../models/importLogModel');
require('../models/callLogModel');
require('../models/sidebarModel');
require('../models/taskModel');
require('../models/notificationModel');
require('../models/notificationSettingModel');
require('../models/pushTemplateModel');
require('../models/pushLogModel');
require('../models/pushQuotaModel');
require('../models/emailLogModel');
require('../models/emailSuppressionModel');

const { seedScreens } = require('../seed');

async function run() {
  console.log('[syncScreenFields] 🔄 Starting Screen Fields synchronization...');
  await connect();

  try {
    await seedScreens();
    console.log('[syncScreenFields] ✅ Successfully synchronized all Screen Fields!');

    const Screen = mongoose.model('Screen');
    const ScreenField = mongoose.model('ScreenField');

    const tasksScreen = await Screen.findOne({ key: 'tasks' }).lean().exec();
    if (tasksScreen) {
      const taskFields = await ScreenField.find({ screen_id: tasksScreen._id }).sort({ order: 1 }).lean().exec();
      console.log(`\n--- Tasks Screen Fields (${taskFields.length} total) ---`);
      taskFields.forEach((f) => {
        console.log(`  • ${f.field_key.padEnd(20)} | FormVis: ${String(f.is_form_visible).padEnd(5)} | TableVis: ${String(f.is_table_visible).padEnd(5)} | Type: ${f.type.padEnd(8)} | Req: ${f.is_required}`);
      });
    }
  } catch (err) {
    console.error('[syncScreenFields] ❌ Failed to sync screen fields:', err);
    process.exit(1);
  } finally {
    await disconnect();
    process.exit(0);
  }
}

void run();
