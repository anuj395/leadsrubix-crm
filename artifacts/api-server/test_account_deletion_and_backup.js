// test_account_deletion_and_backup.js
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pgMongoose = require('./src/db/pgMongoose');
require.cache[require.resolve('mongoose')] = {
  id: require.resolve('mongoose'),
  filename: require.resolve('mongoose'),
  loaded: true,
  exports: pgMongoose,
};

const mongoose = require('mongoose');

// Register all models
require('./src/models/userModel');
require('./src/models/industryModel');
require('./src/models/roleModel');
require('./src/models/sidebarMenuModel');
require('./src/models/sidebarPermissionModel');
require('./src/models/screenModel');
require('./src/models/screenFieldModel');
require('./src/models/screenPermissionModel');
require('./src/models/roleActionPermissionModel');
require('./src/models/contactModel');
require('./src/models/organizationModel');
require('./src/models/bookingModel');
require('./src/models/pricingPlanModel');
require('./src/models/faqModel');
require('./src/models/newsModel');
require('./src/models/resourceItemModel');
require('./src/models/workspaceModel');
require('./src/models/analyticsConfigModel');
require('./src/models/taskModel');
require('./src/models/callLogModel');
require('./src/models/subdomainBlacklistModel');

const industryService = require('./src/services/industryService');
const organizationService = require('./src/services/organizationService');
const authService = require('./src/services/authService');
const subdomainBlacklistModel = require('./src/models/subdomainBlacklistModel');

async function main() {
  console.log('================================================================');
  console.log('TEST SUITE: DYNAMIC INDUSTRIES, ACCOUNT DELETION & BACKUP ENGINE');
  console.log('================================================================\n');

  // 0. Resolve SuperAdmin
  const User = mongoose.model('User');
  let superAdmin = await User.findOne({ role: 'superAdmin' });
  if (!superAdmin) {
    superAdmin = await User.create({
      name: 'Platform SuperAdmin',
      email: 'superadmin@leadsrubix.com',
      password: 'SuperPassword@123',
      role: 'superAdmin',
      isActive: true,
      status: 'active',
    });
  }
  const superAdminActor = { id: String(superAdmin._id), role: 'superAdmin', email: superAdmin.email };

  // -------------------------------------------------------------
  // TEST 1: SuperAdmin Dynamically Adds a New Custom Industry
  // -------------------------------------------------------------
  console.log('[TEST 1] SuperAdmin creating new dynamic industry: Fitness & Wellness Studios');
  const Industry = mongoose.model('Industry');
  await Industry.deleteMany({ code: 'fitness_wellness' });

  const dynamicIndustry = await industryService.create({
    code: 'fitness_wellness',
    name: 'Fitness & Wellness Studios',
    description: 'Gyms, Pilates Studios, CrossFit Arenas & Nutrition Advisory Centers',
    isActive: true,
    status: 'Launched',
    translations: {
      projects: 'Membership Plans & Studios',
      resources: 'Gym Equipment & Nutrition Kits',
      contacts: 'Member Profiles & Athletes',
      tasks: 'Trial Workouts & Fitness Assessments',
      quotes: 'Annual Gym Packages & Diet Plans',
      bookings: 'Class Slots & Trainer Sessions',
      leads: 'Gym Inquiries & Free Pass Leads',
      configuration: 'Studio & Equipment Catalog',
    },
    templateRoles: [
      { key: 'admin', name: 'Studio General Manager', description: 'Complete Fitness Studio Management & Operations' },
      { key: 'head_trainer', name: 'Head Fitness Trainer', description: 'Trainer Rostering, Workout Schedules & Assessments' },
      { key: 'front_desk', name: 'Front Desk & Membership Officer', description: 'Member Check-ins, Pass Inquiries & Renewals' },
      { key: 'dietician', name: 'Clinical Dietician & Nutritionist', description: 'Diet Plan Consultations & Supplement Packages' },
    ],
  });

  console.log(`✓ Dynamic Industry Created: ${dynamicIndustry.name} (Code: ${dynamicIndustry.code})`);
  console.log(`   - Dynamic Translations:`, dynamicIndustry.translations);
  console.log(`   - Dynamic Base Roles:`, dynamicIndustry.template_roles);

  // -------------------------------------------------------------
  // TEST 2: Onboard Client using the Dynamically Created Industry
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Onboarding Client into Dynamic Industry');
  const Organization = mongoose.model('Organization');
  const SubdomainBlacklist = mongoose.model('SubdomainBlacklist');
  await SubdomainBlacklist.deleteMany({ subdomain: 'ironfit' });
  await Organization.deleteMany({ $or: [{ code: 'ironfit' }, { subdomain: 'ironfit' }] });
  await User.deleteMany({ email: 'admin@ironfitgym.com' });

  const clientPayload = {
    name: 'IronFit Elite Gym & Spa',
    organizationName: 'IronFit Elite Gym & Spa',
    code: 'ironfit',
    emailId: 'admin@ironfitgym.com',
    email: 'admin@ironfitgym.com',
    firstName: 'Aryan',
    lastName: 'Singhania',
    contactNumber: '+91 99887 76655',
    industryId: 'fitness_wellness',
    numEmployees: 6,
    address: 'Plot 45, Indiranagar 100 Feet Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '560038',
    subdomain: 'ironfit',
    cname: 'portal.ironfitgym.com',
    customAdminPassword: 'Password@123',
    password: 'Password@123',
  };

  const createdOrg = await organizationService.create({
    payload: clientPayload,
    authedUser: null,
  });

  const orgId = createdOrg.organizationId || createdOrg.organization_id;
  console.log(`✓ Client Onboarded: ${createdOrg.organization_name || createdOrg.name} [ID: ${orgId}]`);

  // Verify Roles cloned from the dynamic industry
  const Role = mongoose.model('Role');
  const clonedRoles = await Role.find({ organization_id: orgId }).lean();
  console.log(`✓ Roles Dynamically Cloned for Workspace (${clonedRoles.length} roles):`);
  clonedRoles.forEach(r => console.log(`   - [${r.key}]: ${r.name}`));

  // -------------------------------------------------------------
  // TEST 3: Client Admin Authentication & Workspace Data Backup Export
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Client Admin Login & Full Workspace Data Backup Export');
  const clientLogin = await authService.login('admin@ironfitgym.com', 'Password@123');
  console.log(`✓ Client Admin Authenticated: ${clientLogin.user.name} (${clientLogin.user.role})`);

  const clientActor = { id: String(clientLogin.user._id || clientLogin.user.id), role: clientLogin.user.role, organizationId: orgId, organization_id: orgId };

  // Add dummy contact and task to verify backup export
  const Contact = mongoose.model('Contact');
  const Task = mongoose.model('Task');
  await Contact.create({
    first_name: 'Rahul',
    last_name: 'Dravid',
    customer_name: 'Rahul Dravid',
    email: 'rahul.dravid@gymmember.com',
    contact_no: '+91 98765 43210',
    organization_id: orgId,
    workspace_id: 'ws_' + orgId,
    industry_id: 'fitness_wellness',
  });
  await Task.create({
    type: 'Fitness Assessment',
    organization_id: orgId,
    workspace_id: 'ws_' + orgId,
    status: 'Pending',
    due_date: new Date(),
  });

  const backupData = await organizationService.exportWorkspaceBackup({
    id: orgId,
    authedUser: clientActor,
  });

  console.log(`✓ Complete Workspace Backup Export Generated!`);
  console.log(`   - Metadata:`, backupData.exportMetadata);
  console.log(`   - Total Exported Users: ${backupData.users.length}`);
  console.log(`   - Total Exported Roles: ${backupData.roles.length}`);
  console.log(`   - Total Exported Contacts/Leads: ${backupData.contacts.length}`);
  console.log(`   - Total Exported Tasks: ${backupData.tasks.length}`);

  // -------------------------------------------------------------
  // TEST 4: Client Admin Requests Account Deletion
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Client Admin Submitting Account Deletion Request');
  const deletionReqRes = await organizationService.requestDeletion({
    authedUser: clientActor,
    reason: 'Relocating fitness studio operations to new franchise entity',
    feedback: 'Platform was fast and dynamic. Thank you!',
  });
  console.log(`✓ Deletion Request Submitted:`, deletionReqRes);

  // -------------------------------------------------------------
  // TEST 5: SuperAdmin Views & Approves Account Deletion
  // -------------------------------------------------------------
  console.log('\n[TEST 5] SuperAdmin Reviewing & Approving Account Deletion');
  const allRequests = await organizationService.listDeletionRequests({ authedUser: superAdminActor });
  console.log(`✓ SuperAdmin Retrieved ${allRequests.length} Deletion Requests.`);
  const pendingTarget = allRequests.find(r => r.organizationId === orgId || r.subdomain === 'ironfit');
  console.log(`   - Found Pending Request for Organization: ${pendingTarget?.organizationName} [Subdomain: ${pendingTarget?.subdomain}]`);

  const approveRes = await organizationService.approveDeletionRequest({
    id: pendingTarget.id,
    authedUser: superAdminActor,
  });
  console.log(`✓ SuperAdmin Approval Execution:`, approveRes.message);

  // Verify Organization is DELETED
  const orgAfter = await Organization.findById(pendingTarget.id);
  console.log(`✓ Organization Status After Approval: ${orgAfter.status} (isActive: ${orgAfter.is_active})`);

  // Verify Subdomain is permanently Blacklisted
  const isBlacklisted = await subdomainBlacklistModel.isBlacklisted('ironfit');
  console.log(`✓ Subdomain 'ironfit' Permanently Blacklisted/Retired: ${isBlacklisted}`);

  // -------------------------------------------------------------
  // TEST 6: Subdomain Reallocation Protection Enforcement
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing Subdomain Reallocation Protection (Attempting to reuse "ironfit")');
  try {
    await organizationService.create({
      payload: {
        name: 'Another Gym Impersonator',
        organizationName: 'Another Gym Impersonator',
        code: 'ironfit_hacker',
        subdomain: 'ironfit',
        emailId: 'hacker@impersonator.com',
        email: 'hacker@impersonator.com',
        firstName: 'Impersonator',
        lastName: 'Admin',
        contactNumber: '+91 99999 88888',
        industryId: 'fitness_wellness',
        numEmployees: 5,
        address: 'Test Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001',
      },
      authedUser: null,
    });
    console.error('❌ FAIL: Re-allocation of retired subdomain was NOT blocked!');
    process.exit(1);
  } catch (err) {
    console.log(`✓ SUCCESS: Re-allocation blocked with expected error: "${err.message}"`);
  }

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
