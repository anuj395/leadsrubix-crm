const mongoose = require('mongoose');

async function checkSuperAdminSidebar() {
  await mongoose.connect('mongodb://localhost:27017/leadsrubix-migrate-crm');

  require('./models/roleModel');
  require('./models/sidebarMenuModel');
  require('./models/sidebarPermissionModel');
  require('./models/industryModel');

  const sidebarService = require('./services/sidebarService');

  // Resolve for superAdmin
  const superAdminRes = await sidebarService.resolveSidebar({
    industryCode: 'temp0001',
    roleKey: 'superAdmin',
    organizationId: null
  });

  console.log('=== SUPER ADMIN RESOLVED MENUS ===');
  const superAdminParents = superAdminRes.menus.filter(m => !m.parent_id);
  superAdminParents.forEach((p, i) => {
    console.log(`${i+1}. Key: ${p.key.padEnd(20)} | Name: ${p.name.padEnd(25)} | Order: ${p.order}`);
  });

  // Resolve for admin
  const adminRes = await sidebarService.resolveSidebar({
    industryCode: 'temp0001',
    roleKey: 'admin',
    organizationId: null
  });

  console.log('\n=== ADMIN RESOLVED MENUS ===');
  const adminParents = adminRes.menus.filter(m => !m.parent_id);
  adminParents.forEach((p, i) => {
    console.log(`${i+1}. Key: ${p.key.padEnd(20)} | Name: ${p.name.padEnd(25)} | Order: ${p.order}`);
  });

  await mongoose.disconnect();
}

checkSuperAdminSidebar();
