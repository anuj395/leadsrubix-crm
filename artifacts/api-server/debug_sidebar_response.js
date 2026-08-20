// debug_sidebar_response.js
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
require('./src/models/organizationModel');

const authService = require('./src/services/authService');
const sidebarService = require('./src/services/sidebarService');

async function checkClient(email, password, title) {
  console.log(`\n========================================================================`);
  console.log(`CHECKING: ${title} (${email})`);
  console.log(`========================================================================`);

  const loginRes = await authService.login(email, password);
  const user = loginRes.user;
  console.log('User Profile:', {
    name: user.name,
    email: user.email,
    role: user.role,
    industryId: user.industryId,
    organizationId: user.organizationId,
  });

  const sidebarRes = await sidebarService.resolveSidebar({
    industryCode: user.industryId,
    roleKey: user.role,
    organizationId: user.organizationId,
  });

  console.log(`Sidebar API Returned (${sidebarRes.menus.length} items):`);
  console.table(sidebarRes.menus.map(m => ({
    id: String(m._id),
    key: m.key,
    name: m.name,
    route: m.route,
    icon: m.icon,
    parentId: m.parent_id || m.parentId || null,
    module: m.module,
  })));
}

async function main() {
  await checkClient('admin@royalheritageresorts.com', 'Password@123', 'Hospitality Admin');
  await checkClient('director@apexrealtypartners.com', 'Password@123', 'Real Estate Channel Partner Admin');
  await checkClient('ceo@novatechcloud.com', 'Password@123', 'IT SaaS Admin');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
