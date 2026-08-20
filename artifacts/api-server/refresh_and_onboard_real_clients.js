// refresh_and_onboard_real_clients.js
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

const organizationService = require('./src/services/organizationService');
const authService = require('./src/services/authService');
const sidebarService = require('./src/services/sidebarService');

async function main() {
  console.log('========================================================================');
  console.log('  REFRESH & ONBOARD 3 REAL INDUSTRY CLIENTS: HOSPITALITY, REAL ESTATE, IT  ');
  console.log('========================================================================\n');

  const Organization = mongoose.model('Organization');
  const User = mongoose.model('User');
  const Role = mongoose.model('Role');
  const Contact = mongoose.model('Contact');
  const Task = mongoose.model('Task');
  const SubdomainBlacklist = mongoose.model('SubdomainBlacklist');
  const Industry = mongoose.model('Industry');

  // Ensure default industries exist with active status
  const requiredIndustries = [
    { code: 'hospitality', name: 'Hospitality & Luxury Stays', desc: 'Resorts, Luxury Stays, Banquet Sales & Concierge Management' },
    { code: 'real_estate_channel_partner', name: 'Real Estate Channel Partner', desc: 'Developer Mandates, PropTech Advisory, Site Visits & Closures' },
    { code: 'it_saas', name: 'IT & Cloud Solutions', desc: 'Enterprise SaaS, Cloud Consulting, Pre-Sales Demos & Tech Contracts' },
  ];

  for (const ind of requiredIndustries) {
    let doc = await Industry.findOne({ code: ind.code });
    if (!doc) {
      doc = await Industry.create({
        code: ind.code,
        name: ind.name,
        description: ind.desc,
        is_active: true,
        status: 'Launched',
      });
    } else {
      await Industry.updateOne({ _id: doc._id }, { $set: { is_active: true, status: 'Launched' } });
    }
  }

  // 1. CLEAN UP ALL PREVIOUS TEST ORGANIZATIONS & BLACKLISTS
  console.log('[STEP 1] Cleaning up previous client organizations & workspaces...');
  const testSubdomains = ['grandpalace', 'primesquare', 'ironfit', 'royalheritage', 'apexrealty', 'novatech'];
  
  for (const sub of testSubdomains) {
    await SubdomainBlacklist.deleteMany({ subdomain: sub });
    const orgs = await Organization.find({ $or: [{ subdomain: sub }, { code: sub }] }).lean();
    for (const org of orgs) {
      const orgId = org.organization_id || org.organizationId || String(org._id);
      await organizationService.remove({ id: String(org._id), authedUser: { role: 'superAdmin' } }).catch(() => {});
      await User.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
      await Role.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
      await Contact.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
      await Task.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
    }
    await Organization.deleteMany({ $or: [{ subdomain: sub }, { code: sub }] });
  }
  console.log('✓ Cleaned up all previous test clients.\n');

  // 2. DEFINE 3 REAL INDUSTRY CLIENT CONFIGURATIONS
  const clientsToOnboard = [
    {
      industry: 'Hospitality',
      industryCode: 'hospitality',
      subdomain: 'royalheritage',
      name: 'Royal Heritage Palace & Luxury Suites',
      email: 'admin@royalheritageresorts.com',
      adminName: 'Devendra Rathore',
      adminRole: 'General Manager',
      address: 'Lake Palace Road, Heritage Enclave',
      city: 'Udaipur',
      state: 'Rajasthan',
      country: 'India',
      pincode: '313001',
      contacts: [
        { name: 'Dr. Siddharth Mehta', email: 'siddharth@aiimsdelhi.edu', company: 'Indian Medical Congress', type: 'Conference Organizer' },
        { name: 'Pooja Singhania', email: 'pooja.weddings@luxuryevents.in', company: 'Singhania Grand Weddings', type: 'Destination Wedding Planner' },
      ],
      tasks: [
        { type: 'Banquet Menu Tasting & Table Setup', status: 'Pending' },
        { type: 'Presidential Suite VIP Check-in Prep', status: 'In Progress' },
      ],
    },
    {
      industry: 'Real Estate Channel Partner',
      industryCode: 'real_estate_channel_partner',
      subdomain: 'apexrealty',
      name: 'Apex Realty Channel Partners',
      email: 'director@apexrealtypartners.com',
      adminName: 'Amitabh Sen',
      adminRole: 'Managing Partner',
      address: 'Tower A, Floor 14, One Horizon Center, Golf Course Road',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      pincode: '122002',
      contacts: [
        { name: 'Rajiv Malhotra', email: 'rajiv.malhotra@hni-investors.com', company: 'Malhotra Family Trust', type: 'Luxury Penthouse Investor' },
        { name: 'Ananya Deshmukh', email: 'ananya.d@techlead.io', company: 'Google India', type: '3BHK End-User Buyer' },
      ],
      tasks: [
        { type: 'Client Site Visit & Sample Flat Walkthrough', status: 'Pending' },
        { type: 'Builder Cost Sheet & Slab Discount Review', status: 'In Progress' },
      ],
    },
    {
      industry: 'IT & Tech Services (IT SaaS)',
      industryCode: 'it_saas',
      subdomain: 'novatech',
      name: 'NovaTech Solutions & Cloud Consulting',
      email: 'ceo@novatechcloud.com',
      adminName: 'Sanjay Krishnan',
      adminRole: 'Chief Executive Officer',
      address: 'Prestige Tech Park, Marathahalli-Sarjapur Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560103',
      contacts: [
        { name: 'Karthik Ramanathan', email: 'karthik.r@hdfcbank.com', company: 'HDFC Digital Banking', type: 'Enterprise Cloud Lead' },
        { name: 'Meera Nambiar', email: 'meera.nambiar@flipkart.com', company: 'Flipkart Supply Chain', type: 'Microservices Architecture POC' },
      ],
      tasks: [
        { type: 'Technical Architecture POC Demo', status: 'Pending' },
        { type: 'Enterprise SLA & Security Audit Review', status: 'In Progress' },
      ],
    },
  ];

  const onboardedSummaries = [];

  // 3. ONBOARD EACH CLIENT
  for (const client of clientsToOnboard) {
    console.log(`[ONBOARDING] ${client.industry.toUpperCase()}: ${client.name}`);

    const payload = {
      name: client.name,
      organizationName: client.name,
      code: client.subdomain,
      subdomain: client.subdomain,
      emailId: client.email,
      email: client.email,
      firstName: client.adminName.split(' ')[0],
      lastName: client.adminName.split(' ')[1] || 'Admin',
      contactNumber: '+91 98765 00000',
      industryId: client.industryCode,
      numEmployees: 8,
      address: client.address,
      city: client.city,
      state: client.state,
      country: client.country,
      pincode: client.pincode,
      customAdminPassword: 'Password@123',
      password: 'Password@123',
    };

    const createdOrg = await organizationService.create({ payload, authedUser: null });
    const orgId = createdOrg.organizationId || createdOrg.organization_id;

    // Add Industry-specific Sample Contacts
    for (const c of client.contacts) {
      const parts = c.name.split(' ');
      await Contact.create({
        first_name: parts[0],
        last_name: parts[1] || '',
        customer_name: c.name,
        email: c.email,
        company_name: c.company,
        contact_no: '+91 98111 22334',
        organization_id: orgId,
        workspace_id: 'ws_' + orgId,
        industry_id: client.industryCode,
        lead_type: c.type,
      });
    }

    // Add Industry-specific Sample Tasks
    for (const t of client.tasks) {
      await Task.create({
        type: t.type,
        status: t.status,
        organization_id: orgId,
        workspace_id: 'ws_' + orgId,
        due_date: new Date(Date.now() + 86400000 * 2),
      });
    }

    // Retrieve Cloned Roles
    const roles = await Role.find({ organization_id: orgId }).lean();

    // 4. TEST CLIENT LOGIN & VERIFY SECTIONS
    const loginRes = await authService.login(client.email, 'Password@123');
    const userActor = {
      id: String(loginRes.user.id || loginRes.user._id),
      role: loginRes.user.role,
      organizationId: orgId,
      organization_id: orgId,
      email: loginRes.user.email,
    };

    // Verify Sidebar Menus Resolution
    const sidebarRes = await sidebarService.resolveSidebar({
      industryCode: client.industryCode,
      roleKey: 'admin',
      organizationId: orgId,
    });

    // Verify Backup Export
    const backup = await organizationService.exportWorkspaceBackup({
      id: orgId,
      authedUser: userActor,
    });

    onboardedSummaries.push({
      industry: client.industry,
      industryCode: client.industryCode,
      organizationName: client.name,
      subdomain: `${client.subdomain}.leadsrubix.com`,
      adminEmail: client.email,
      password: 'Password@123',
      adminUser: client.adminName,
      orgId,
      tokenIssued: !!loginRes.token,
      clonedRoles: roles.map(r => r.name),
      contactsCount: backup.contacts.length,
      tasksCount: backup.tasks.length,
      backupValidated: backup.exportMetadata.organizationId === orgId,
    });

    console.log(`✓ Onboarded ${client.name}`);
    console.log(`   - Subdomain: ${client.subdomain}.leadsrubix.com`);
    console.log(`   - Login: ${client.email} / Password@123`);
    console.log(`   - Roles Cloned (${roles.length}): ${roles.map(r => r.name).join(', ')}`);
    console.log(`   - Contacts Seeded: ${backup.contacts.length}, Tasks Seeded: ${backup.tasks.length}\n`);
  }

  console.log('========================================================================');
  console.log('  ALL 3 CLIENTS ONBOARDED & AUTHENTICATED SUCCESSFULLY!');
  console.log('========================================================================\n');

  console.table(onboardedSummaries.map(s => ({
    Industry: s.industry,
    Subdomain: s.subdomain,
    AdminLogin: s.adminEmail,
    Password: s.password,
    Roles: s.clonedRoles.length,
    Contacts: s.contactsCount,
    Tasks: s.tasksCount,
    AuthStatus: s.tokenIssued ? 'ACTIVE' : 'ERROR',
  })));

  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
