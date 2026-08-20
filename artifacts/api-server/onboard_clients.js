// onboard_clients.js
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const pgMongoose = require('./src/db/pgMongoose');
require.cache[require.resolve('mongoose')] = {
  id: require.resolve('mongoose'),
  filename: require.resolve('mongoose'),
  loaded: true,
  exports: pgMongoose,
};

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
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

const organizationService = require('./src/services/organizationService');
const authService = require('./src/services/authService');

async function main() {
  console.log('--- Starting Onboarding of 2 New Client Workspaces ---');

  const clientsToOnboard = [
    {
      name: 'Grand Palace Resorts & Luxury Suites',
      code: 'grandpalace',
      industryId: 'hospitality',
      firstName: 'Vikramaditya',
      lastName: 'Oberoi',
      email: 'admin@grandpalaceresorts.com',
      password: 'Password@123',
      contactNumber: '+91 98201 11223',
      numEmployees: 8,
      address: 'Udaivilas Lakefront Road, Haridas Ji Ki Magri',
      city: 'Udaipur',
      state: 'Rajasthan',
      country: 'India',
      pincode: '313001',
      subdomain: 'grandpalace',
      cname: 'crm.grandpalaceresorts.com',
      verticalName: 'Hospitality & Luxury Stays',
    },
    {
      name: 'PrimeSquare Realty Partners',
      code: 'primesquare',
      industryId: 'real_estate_channel_partner',
      firstName: 'Sameer',
      lastName: 'Mehra',
      email: 'director@primesquarerealty.com',
      password: 'Password@123',
      contactNumber: '+91 98110 44556',
      numEmployees: 10,
      address: 'Tower B, 14th Floor, DLF Cyber City, Sector 24',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      pincode: '122002',
      subdomain: 'primesquare',
      cname: 'portal.primesquarerealty.com',
      verticalName: 'Real Estate Channel Partner',
    }
  ];

  const results = [];

  for (const client of clientsToOnboard) {
    console.log(`\n======================================================`);
    console.log(`Onboarding: ${client.name} (${client.verticalName})`);
    console.log(`======================================================`);

    // Clean up existing if duplicate test
    const User = mongoose.model('User');
    const Organization = mongoose.model('Organization');
    const Workspace = mongoose.model('Workspace');
    const Role = mongoose.model('Role');

    await User.deleteMany({ email: client.email.toLowerCase() });
    await Organization.deleteMany({ emailId: client.email.toLowerCase() });
    await Organization.deleteMany({ code: client.code });

    // Call organizationService.create
    const payload = {
      name: client.name,
      organizationName: client.name,
      code: client.code,
      emailId: client.email,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      contactNumber: client.contactNumber,
      industryId: client.industryId,
      numEmployees: client.numEmployees,
      customAdminPassword: client.password,
      password: client.password,
      address: client.address,
      city: client.city,
      state: client.state,
      country: client.country,
      pincode: client.pincode,
      subdomain: client.subdomain,
      cname: client.cname,
    };

    const createdOrg = await organizationService.create({
      payload,
      authedUser: null, // Guest/Public Signup mode
    });

    const orgId = createdOrg.organizationId || createdOrg.organization_id;
    console.log(`✓ Organization Created: ${client.name} [ID: ${orgId}]`);

    // Verify workspace
    const workspace = await Workspace.findOne({ organization_id: orgId });
    console.log(`✓ Workspace Provisioned: ${workspace?.workspace_id}`);

    // Verify Roles cloned
    const clonedRoles = await Role.find({ organization_id: orgId }).lean();
    console.log(`✓ Roles Cloned for Workspace (${clonedRoles.length} roles):`);
    clonedRoles.forEach(r => console.log(`   - [${r.key}]: ${r.name} (${r.description})`));

    // Test Login via authService
    const loginRes = await authService.login(client.email, client.password);

    console.log(`✓ Authentication Successful! Token generated.`);
    console.log(`   - User ID: ${loginRes.user?.id || loginRes.user?._id}`);
    console.log(`   - Resolved Role: ${loginRes.user?.role}`);
    console.log(`   - Organization ID: ${loginRes.user?.organizationId}`);
    console.log(`   - Industry ID: ${loginRes.user?.industryId}`);

    results.push({
      clientName: client.name,
      vertical: client.verticalName,
      industryCode: client.industryId,
      subdomainUrl: `https://${client.subdomain}.leadsrubix.com`,
      customCname: client.cname,
      adminName: `${client.firstName} ${client.lastName}`,
      adminEmail: client.email,
      adminPassword: client.password,
      organizationId: orgId,
      workspaceId: workspace?.workspace_id,
      roles: clonedRoles.map(r => `${r.name} (${r.key})`),
    });
  }

  console.log('\n======================================================');
  console.log('SUMMARY OF ONBOARDED CLIENT WORKSPACES:');
  console.log('======================================================');
  console.log(JSON.stringify(results, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('[onboard_clients FATAL]:', err);
  process.exit(1);
});
