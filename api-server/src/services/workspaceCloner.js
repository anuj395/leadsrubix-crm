const mongoose = require('mongoose');

exports.cloneWorkspace = async (organizationId, workspaceId, industryId) => {
  const Role = mongoose.model('Role');
  const SidebarMenu = mongoose.model('SidebarMenu');
  const SidebarPermission = mongoose.model('SidebarPermission');
  const Screen = mongoose.model('Screen');
  const ScreenField = mongoose.model('ScreenField');
  const ScreenPermission = mongoose.model('ScreenPermission');
  const Industry = mongoose.model('Industry');

  // 1. Resolve Industry ID (it could be a code string or ObjectId)
  let industryDoc = null;
  if (mongoose.Types.ObjectId.isValid(industryId)) {
    industryDoc = await Industry.findById(industryId);
  } else {
    industryDoc = await Industry.findOne({ code: industryId });
  }
  if (!industryDoc) {
    throw new Error(`Industry template not found for: ${industryId}`);
  }
  const industryDbId = industryDoc._id;

  // 2. Clone Roles
  const templateRoles = await Role.find({ industry_id: industryDbId, organization_id: null }).lean();
  const roleIdMap = {};
  for (const tRole of templateRoles) {
    const created = await Role.create({
      industry_id: industryDbId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      key: tRole.key,
      name: tRole.name,
      description: tRole.description,
      is_active: tRole.is_active,
    });
    roleIdMap[String(tRole._id)] = String(created._id);
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
