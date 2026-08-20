// reset_and_onboard_3_clients.js
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
  console.log('  RESET ALL CLIENT DATA & ONBOARD 3 NEW REAL-WORLD SECTOR CLIENTS        ');
  console.log('========================================================================\n');

  const Organization = mongoose.model('Organization');
  const User = mongoose.model('User');
  const Role = mongoose.model('Role');
  const Contact = mongoose.model('Contact');
  const Task = mongoose.model('Task');
  const SubdomainBlacklist = mongoose.model('SubdomainBlacklist');
  const Industry = mongoose.model('Industry');
  const OrganizationResources = mongoose.model('OrganizationResources');

  // 1. Ensure required industries exist and are active
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

  // 2. PURGE ALL PREVIOUS CLIENTS AND BLACKLISTS
  console.log('[STEP 1] Resetting all previous client accounts...');
  await SubdomainBlacklist.deleteMany({});

  const allOrgs = await Organization.find({}).lean();
  for (const org of allOrgs) {
    const orgId = org.organization_id || org.organizationId || String(org._id);
    await User.deleteMany({
      $or: [{ organizationId: orgId }, { organization_id: orgId }],
      role: { $ne: 'superAdmin' }
    });
    await Role.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
    await Contact.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
    await Task.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
    await OrganizationResources.deleteMany({ $or: [{ organizationId: orgId }, { organization_id: orgId }] });
    await Organization.deleteOne({ _id: org._id });
  }
  console.log('✓ All client organizations, contacts, tasks, and data purged.\n');

  // 3. DEFINE 3 BRAND NEW CLIENTS
  const clientsToOnboard = [
    {
      sector: 'Hospitality & Luxury Resorts',
      industryCode: 'hospitality',
      subdomain: 'aurahorizon',
      name: 'Aura Horizon Luxury Resorts & Spa',
      email: 'admin@aurahorizon.com',
      adminName: 'Kabir Singhania',
      adminRole: 'General Manager',
      address: 'Peshwa Lakefront Promenade, Heritage Wing',
      city: 'Udaipur',
      state: 'Rajasthan',
      country: 'India',
      pincode: '313001',
      contacts: [
        { name: 'Dr. Siddharth Mehta', email: 'siddharth@aiimsdelhi.edu', mobile: '+91 9823145670', company: 'Indian Medical Congress', type: 'Annual Summit Organizer' },
        { name: 'Pooja Agarwal', email: 'pooja.weddings@luxuryevents.in', mobile: '+91 9811234567', company: 'Agarwal Grand Destination Weddings', type: 'Wedding Planner' },
        { name: 'Vikramaditya Oberoi', email: 'v.oberoi@globaltravel.com', mobile: '+91 9988776655', company: 'Global Elite Travel Concierge', type: 'Luxury Travel Partner' },
      ],
      tasks: [
        { type: 'Royal Banquet Menu Tasting & Hall Inspection', status: 'Pending', dueDate: new Date(Date.now() + 86400000) },
        { type: 'Presidential Suite VIP Check-in Protocol Review', status: 'In Progress', dueDate: new Date(Date.now() + 172800000) },
        { type: 'Quarterly Corporate Conference Tariff Negotiation', status: 'Pending', dueDate: new Date(Date.now() + 259200000) },
      ],
      resources: [
        { name: 'The Grand Kohinoor Ballroom (Capacity 800)', category: 'Banquets & Venues', status: 'Available' },
        { name: 'Maharaja Heritage Suite (Lake View)', category: 'Suites & Villas', status: 'Booked' },
        { name: 'Oasis Ayurvedic Wellness Pavilion', category: 'Spa & Wellness', status: 'Available' },
      ]
    },
    {
      sector: 'Real Estate Channel Partner & Advisory',
      industryCode: 'real_estate_channel_partner',
      subdomain: 'skylinecapital',
      name: 'Skyline Capital Realty Partners',
      email: 'rohan@skylinecapitalrealty.com',
      adminName: 'Rohan Varma',
      adminRole: 'Partner & Sales Director',
      address: 'Skyline Tower 1, Golf Course Extension Road',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      pincode: '122002',
      contacts: [
        { name: 'Rajiv Chawla', email: 'rajiv.chawla@finvest.sg', mobile: '+91 9876543210', company: 'Chawla Family Office (Singapore)', type: 'NRI Penthouse Buyer' },
        { name: 'Neha Kapoor', email: 'neha@kapoorestate.com', mobile: '+91 9810198101', company: 'Kapoor Fashion Brands', type: 'Commercial High-Street Retailer' },
        { name: 'Amitabh Sen', email: 'amitabh.sen@seninvestments.in', mobile: '+91 9830098300', company: 'Sen Wealth Management', type: 'Pre-leased Office Investor' },
      ],
      tasks: [
        { type: 'Exclusive Site Visit for 5BHK Penthouse - Golf Estate', status: 'In Progress', dueDate: new Date(Date.now() + 86400000) },
        { type: 'Builder Meeting with DLF Luxury Projects Head', status: 'Pending', dueDate: new Date(Date.now() + 172800000) },
        { type: 'Issuance of Cost Sheet & Expression of Interest (EOI)', status: 'Completed', dueDate: new Date(Date.now() - 86400000) },
      ],
      resources: [
        { name: 'DLF Crest 5BHK Duplex Penthouse (Floor 32)', category: 'Residential Luxury', status: 'Available' },
        { name: 'CyberPark 10,000 sq.ft Grade-A Pre-leased Floor', category: 'Commercial Office', status: 'Available' },
        { name: 'Golf Course Road High Street Retail Corner', category: 'Retail Mandate', status: 'Under Negotiation' },
      ]
    },
    {
      sector: 'IT, Cloud & SaaS Solutions',
      industryCode: 'it_saas',
      subdomain: 'nexiscloud',
      name: 'Nexis Cloud & AI Technologies',
      email: 'ananya@nexiscloud.io',
      adminName: 'Ananya Deshmukh',
      adminRole: 'VP of Business Operations',
      address: 'Nexis Tech Park, Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560103',
      contacts: [
        { name: 'Sameer Kulkarni', email: 'sameer.k@indusbank.com', mobile: '+91 9765432109', company: 'Indus Microfinance Bank', type: 'Chief Information Officer (CIO)' },
        { name: 'Ritu Pillai', email: 'ritu.pillai@healthscale.ai', mobile: '+91 9845098450', company: 'HealthScale Diagnostics AI', type: 'VP of Technology & Cloud' },
        { name: 'Deepak Sharma', email: 'deepak.sharma@payfast.in', mobile: '+91 9819981998', company: 'PayFast Digital Fintech', type: 'Head of Infrastructure & SecOps' },
      ],
      tasks: [
        { type: 'Enterprise Multi-Cloud Migration Architecture POC', status: 'In Progress', dueDate: new Date(Date.now() + 86400000) },
        { type: 'SOC2 & HIPAA Compliance Security Review Call', status: 'Pending', dueDate: new Date(Date.now() + 172800000) },
        { type: 'SaaS License Proposal & Annual Contract Signing', status: 'Completed', dueDate: new Date(Date.now() - 43200000) },
      ],
      resources: [
        { name: 'Dedicated GPU Cluster - H100 LLM Compute', category: 'Cloud Infrastructure', status: 'Active' },
        { name: 'Enterprise API Gateway & Dedicated VPC', category: 'DevOps Stack', status: 'Active' },
        { name: '24x7 Tier-3 Site Reliability Engineering Squad', category: 'Support SLA', status: 'Allocated' },
      ]
    },
  ];

  const createdClients = [];

  for (const client of clientsToOnboard) {
    console.log(`[ONBOARDING] Setting up ${client.sector}: "${client.name}"...`);

    const [firstName, ...restName] = client.adminName.split(' ');
    const lastName = restName.join(' ') || 'Admin';

    // 1. Create Organization via OrganizationService
    const orgResult = await organizationService.create({
      payload: {
        organizationName: client.name,
        name: client.name,
        code: client.subdomain,
        subdomain: client.subdomain,
        industry: client.industryCode,
        industryId: client.industryCode,
        numEmployees: 8,
        firstName: firstName,
        lastName: lastName,
        contactNumber: '+91 9800011223',
        emailId: client.email,
        email: client.email,
        phone: '+91 9800011223',
        address: client.address,
        city: client.city,
        state: client.state,
        country: client.country,
        pincode: client.pincode,
        panNo: 'AAACB1234F',
        gstNo: '27AAACB1234F1Z5',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
      authedUser: { role: 'superAdmin' }
    });

    const newOrg = orgResult;
    const orgId = newOrg.organization_id || newOrg.organizationId || String(newOrg._id);

    const industryDoc = await Industry.findOne({ code: client.industryCode });
    const industryId = industryDoc ? String(industryDoc._id) : client.industryCode;

    // 2. Ensure Admin User Password is set to Password@123
    let adminUser = await User.findOne({ email: client.email });
    if (adminUser) {
      adminUser.password = 'Password@123';
      adminUser.needs_password_change = false;
      await adminUser.save();
    } else {
      adminUser = await User.create({
        firstName,
        lastName,
        name: client.adminName,
        email: client.email,
        password: 'Password@123',
        role: 'admin',
        roleKey: 'admin',
        role_key: 'admin',
        industryId: industryId,
        industry_id: industryId,
        organizationId: orgId,
        organization_id: orgId,
        status: 'ACTIVE',
        isActive: true,
        is_active: true,
        needs_password_change: false,
      });
    }

    // 3. Seed Realistic Sample Contacts / Leads
    for (const c of client.contacts) {
      const [cFirst, ...cRest] = c.name.split(' ');
      await Contact.create({
        firstName: cFirst,
        lastName: cRest.join(' ') || '',
        name: c.name,
        email: c.email,
        mobileNumber: c.mobile,
        companyName: c.company,
        leadType: c.type,
        status: 'Interested',
        organizationId: orgId,
        organization_id: orgId,
        industryId: industryId,
        industry_id: industryId,
        createdBy: String(adminUser._id),
      });
    }

    // 4. Seed Realistic Industry Tasks
    for (const t of client.tasks) {
      await Task.create({
        title: t.type,
        type: t.type,
        status: t.status,
        dueDate: t.dueDate,
        organizationId: orgId,
        organization_id: orgId,
        industryId: industryId,
        assignedTo: String(adminUser._id),
        createdBy: String(adminUser._id),
      });
    }

    // 5. Seed Organization Resources
    await OrganizationResources.create({
      organization_id: orgId,
      industry_id: industryId,
      projects: client.resources.map(r => ({ name: r.name, category: r.category, status: r.status })),
      property_types: ['Standard', 'Premium', 'VIP Executive'],
    });

    createdClients.push({
      sector: client.sector,
      name: client.name,
      subdomain: client.subdomain,
      portalUrl: `http://${client.subdomain}.localhost:22333/login`,
      adminName: client.adminName,
      adminEmail: client.email,
      password: 'Password@123',
    });

    console.log(`✓ Completed setup for ${client.name} (Subdomain: ${client.subdomain})`);
  }

  console.log('\n========================================================================');
  console.log('                  ONBOARDED CLIENT ADMIN CREDENTIALS                     ');
  console.log('========================================================================\n');

  createdClients.forEach((c, idx) => {
    console.log(`${idx + 1}. Sector: ${c.sector}`);
    console.log(`   Organization: ${c.name}`);
    console.log(`   Login Portal: ${c.portalUrl}`);
    console.log(`   Admin Email:  ${c.adminEmail}`);
    console.log(`   Password:     ${c.password}`);
    console.log(`   Admin Person: ${c.adminName}\n`);
  });

  console.log('========================================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during reset and onboarding:', err);
  process.exit(1);
});
