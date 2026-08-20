const mongoose = require('mongoose');

exports.cloneWorkspace = async (organizationId, workspaceId, industryId) => {
  const Role = mongoose.model('Role');
  const SidebarMenu = mongoose.model('SidebarMenu');
  const SidebarPermission = mongoose.model('SidebarPermission');
  const Screen = mongoose.model('Screen');
  const ScreenField = mongoose.model('ScreenField');
  const ScreenPermission = mongoose.model('ScreenPermission');
  const Industry = mongoose.model('Industry');

  // 1. Resolve Industry ID (code string or ObjectId)
  let industryDoc = null;
  if (mongoose.Types.ObjectId.isValid(industryId)) {
    industryDoc = await Industry.findById(industryId);
  } else if (industryId) {
    industryDoc = await Industry.findOne({ code: String(industryId).toLowerCase().trim() });
  }

  const indCodeLower = String(industryId || '').toLowerCase().trim();
  const isAutoSector = indCodeLower.includes('auto') || indCodeLower.includes('dealership');
  const isHospitality = indCodeLower.includes('hospitality') || indCodeLower.includes('hotel') || indCodeLower.includes('resort');
  const isRealEstateCP = indCodeLower.includes('channel_partner') || indCodeLower.includes('broker') || indCodeLower.includes('real_estate_cp');

  if (!industryDoc) {
    if (isAutoSector) {
      industryDoc = await Industry.create({
        code: 'auto_sales_service_3s',
        name: 'Auto Sales & Service Dealership (3S/4S Outlet)',
        description: 'Unified Automobile Sales (Test Drives & CPQ) and Workshop Service (Job Cards & Spares)',
        is_active: true,
        status: 'Launched'
      });
    } else if (isHospitality) {
      industryDoc = await Industry.create({
        code: 'hospitality',
        name: 'Hospitality & Luxury Stays',
        description: 'Hotel Rooms, Resorts, Banquet Sales & Guest Reservations Management',
        is_active: true,
        status: 'Launched'
      });
    } else if (isRealEstateCP) {
      industryDoc = await Industry.create({
        code: 'real_estate_channel_partner',
        name: 'Real Estate Channel Partner',
        description: 'Developer Mandates, PropTech Advisory, Site Visits & Unit Closures Management',
        is_active: true,
        status: 'Launched'
      });
    } else {
      industryDoc = await Industry.findOne({ code: 'basic_crm' }) || await Industry.create({
        code: 'basic_crm',
        name: 'Universal Basic CRM',
        description: 'Standard Lead & Contact Management Workflow',
        is_active: true,
        status: 'Launched'
      });
    }
  }
  const industryDbId = industryDoc._id;

  // 2. Clone Roles
  let templateRoles = await Role.find({ industry_id: industryDbId, organization_id: null }).lean();
  if (!templateRoles || templateRoles.length === 0) {
    if (industryDoc.template_roles && Array.isArray(industryDoc.template_roles) && industryDoc.template_roles.length > 0) {
      templateRoles = industryDoc.template_roles;
    } else if (industryDoc.templateRoles && Array.isArray(industryDoc.templateRoles) && industryDoc.templateRoles.length > 0) {
      templateRoles = industryDoc.templateRoles;
    } else if (isHospitality || industryDoc.code === 'hospitality') {
      templateRoles = [
        { key: 'admin', name: 'General Manager / Hotel Admin', description: 'Full Workspace Admin & Operational Control', is_active: true },
        { key: 'front_desk', name: 'Front Desk Executive', description: 'Guest Check-ins, Reservations & Inquiries', is_active: true },
        { key: 'banquet_sales', name: 'Banquet & Events Sales Manager', description: 'Event Packages, Corporate Bookings & Tariff Quotes', is_active: true },
        { key: 'guest_relations', name: 'Guest Relations Officer', description: 'VIP Concierge, Feedback & Hospitality Experience', is_active: true },
      ];
    } else if (isRealEstateCP || industryDoc.code === 'real_estate_channel_partner') {
      templateRoles = [
        { key: 'admin', name: 'Channel Partner Director', description: 'Agency Principal & Full Workspace Control', is_active: true },
        { key: 'team_leader', name: 'Sales Team Leader', description: 'Team Pipeline, Site Visit Allocation & Targets', is_active: true },
        { key: 'relationship_manager', name: 'Relationship Manager', description: 'Buyer Advisory, Property Visits & Closure Assistance', is_active: true },
        { key: 'sourcing_manager', name: 'Developer Sourcing Manager', description: 'Builder Mandates, Inventory Tie-ups & Commission Payouts', is_active: true },
      ];
    } else if (industryDoc.code === 'it_saas' || industryDoc.code === 'temp0006') {
      templateRoles = [
        { key: 'admin', name: 'CTO / SaaS Managing Director', description: 'Executive Workspace Control & Tech Delivery Oversight', is_active: true },
        { key: 'account_executive', name: 'Enterprise Account Executive', description: 'B2B Software Deals, Discovery Calls & Quotas', is_active: true },
        { key: 'solutions_architect', name: 'Solutions Architect', description: 'Technical Pre-Sales, Architecture POCs & Demos', is_active: true },
        { key: 'customer_success', name: 'Customer Success Manager', description: 'Client Onboarding, Account Retention & Renewals', is_active: true },
      ];
    } else if (industryDoc.code === 'real_estate' || industryDoc.code === 'temp0001') {
      templateRoles = [
        { key: 'admin', name: 'Managing Broker / Real Estate Principal', description: 'Full Brokerage & Property Advisory Control', is_active: true },
        { key: 'sales_agent', name: 'Property Sales Consultant', description: 'Buyer Inquiries, Inventory Pitch & Unit Bookings', is_active: true },
        { key: 'listing_agent', name: 'Developer Listing Agent', description: 'Property Mandates, Project Catalogs & Builder Meets', is_active: true },
        { key: 'closing_manager', name: 'Documentation & Closure Manager', description: 'Buyer Agreements, Payment Plans & Registrations', is_active: true },
      ];
    } else if (isAutoSector || industryDoc.code === 'auto_sales_service_3s') {
      templateRoles = [
        { key: 'admin', name: 'Dealer Principal', description: 'Full Dealership 3S/4S Workspace Admin Control', is_active: true },
        { key: 'sales', name: 'Sales Advisor', description: 'New Car Sales, Test Drives & Inquiries', is_active: true },
        { key: 'manager', name: 'Workshop Service Manager', description: 'Service Job Cards, Spares & Maintenance', is_active: true },
      ];
    } else {
      templateRoles = await Role.find({ organization_id: null }).lean();
    }
  }
  if (!templateRoles || templateRoles.length === 0) {
    templateRoles = [
      { key: 'admin', name: 'Administrator', description: 'Full Workspace Admin Control', is_active: true },
      { key: 'sales', name: 'Sales Executive', description: 'Lead Management & Sales Activities', is_active: true },
      { key: 'manager', name: 'Operations Manager', description: 'Team & Operations Management', is_active: true },
    ];
  }

  const roleIdMap = {};
  for (const tRole of templateRoles) {
    const created = await Role.create({
      industry_id: industryDbId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      key: tRole.key,
      name: tRole.name,
      description: tRole.description || '',
      is_active: tRole.is_active !== false,
    });
    if (tRole._id) {
      roleIdMap[String(tRole._id)] = String(created._id);
    }
  }

  // 3. Clone Sidebar Menus (preserving parent-child hierarchy)
  const templateMenus = await SidebarMenu.find({ organization_id: null }).lean();
  const menuIdMap = {};

  // Step 3a: Clone top-level menus (parent_id is null)
  const topLevelMenus = templateMenus.filter(m => !m.parent_id);
  for (const m of topLevelMenus) {
    const created = await SidebarMenu.create({
      key: m.key,
      name: m.name,
      icon: m.icon,
      route: m.route,
      parent_id: null,
      organization_id: organizationId,
      workspace_id: workspaceId,
      order: m.order,
      module: m.module,
      is_active: m.is_active,
    });
    menuIdMap[String(m._id)] = String(created._id);
  }

  // Step 3b: Clone child menus
  const childMenus = templateMenus.filter(m => m.parent_id);
  for (const m of childMenus) {
    const oldParentIdStr = String(m.parent_id);
    const newParentId = menuIdMap[oldParentIdStr] ? new mongoose.Types.ObjectId(menuIdMap[oldParentIdStr]) : null;
    const created = await SidebarMenu.create({
      key: m.key,
      name: m.name,
      icon: m.icon,
      route: m.route,
      parent_id: newParentId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      order: m.order,
      module: m.module,
      is_active: m.is_active,
    });
    menuIdMap[String(m._id)] = String(created._id);
  }

  // 4. Clone Sidebar Permissions
  const templateSidebarPerms = await SidebarPermission.find({
    industry_id: industryDbId,
    organization_id: null
  }).lean();

  for (const p of templateSidebarPerms) {
    const newRoleId = roleIdMap[String(p.role_id)];
    const newMenuId = menuIdMap[String(p.menu_id)];
    if (newRoleId && newMenuId) {
      await SidebarPermission.create({
        role_id: new mongoose.Types.ObjectId(newRoleId),
        industry_id: industryDbId,
        menu_id: new mongoose.Types.ObjectId(newMenuId),
        organization_id: organizationId,
        workspace_id: workspaceId,
        is_visible: p.is_visible,
        order_override: p.order_override,
      });
    }
  }

  // 5. Clone Screens
  const templateScreens = await Screen.find({ organization_id: null }).lean();
  const screenIdMap = {};
  for (const s of templateScreens) {
    const created = await Screen.create({
      key: s.key,
      name: s.name,
      organization_id: organizationId,
      workspace_id: workspaceId,
      description: s.description,
      order: s.order,
      is_active: s.is_active,
    });
    screenIdMap[String(s._id)] = String(created._id);
  }

  // 6. Clone Screen Fields
  const templateFields = await ScreenField.find({ organization_id: null }).lean();
  const fieldIdMap = {};
  for (const f of templateFields) {
    const newScreenId = screenIdMap[String(f.screen_id)];
    if (newScreenId) {
      const created = await ScreenField.create({
        screen_id: new mongoose.Types.ObjectId(newScreenId),
        organization_id: organizationId,
        workspace_id: workspaceId,
        field_key: f.field_key,
        label: f.label,
        type: f.type,
        options: f.options,
        dropdown_source: f.dropdown_source,
        dropdown_api: f.dropdown_api,
        is_table_visible: f.is_table_visible,
        is_form_visible: f.is_form_visible,
        is_required: f.is_required,
        sortable: f.sortable,
        order: f.order,
        is_active: f.is_active,
        default_value: f.default_value,
      });
      fieldIdMap[String(f._id)] = String(created._id);
    }
  }

  // 7. Clone Screen Permissions
  const templateScreenPerms = await ScreenPermission.find({
    industry_id: industryDbId,
    organization_id: null
  }).lean();

  for (const p of templateScreenPerms) {
    const newScreenId = screenIdMap[String(p.screen_id)];
    const newRoleId = roleIdMap[String(p.role_id)];
    const newFieldId = fieldIdMap[String(p.field_id)];
    if (newScreenId && newRoleId && newFieldId) {
      await ScreenPermission.create({
        screen_id: new mongoose.Types.ObjectId(newScreenId),
        role_id: new mongoose.Types.ObjectId(newRoleId),
        industry_id: industryDbId,
        field_id: new mongoose.Types.ObjectId(newFieldId),
        organization_id: organizationId,
        workspace_id: workspaceId,
        is_enabled: p.is_enabled,
      });
    }
  }
};
