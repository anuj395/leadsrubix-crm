// src/services/sidebarService.js
// New normalized sidebar resolver — composes a user's menus from the
// industries / roles / sidebar_menus / sidebar_permissions collections.
const industryModel = require('../models/industryModel');
const roleModel = require('../models/roleModel');
const menuModel = require('../models/sidebarMenuModel');
const permModel = require('../models/sidebarPermissionModel');

/**
 * Resolves the sidebar for a (industry_code, role_key) pair.
 * Returns { industryId, industry_code, role, menus } where `menus` is a
 * flat array; each item carries `parent_id` so the client can build a tree.
 */
async function resolveSidebar({ industryCode, roleKey, industry_code, role_key, organizationId, workspaceId }) {
  const mongoose = require('mongoose');
  const code = industryCode || industry_code;
  const key = roleKey || role_key;
  if (!code || !key) {
    return { industryCode: code, roleKey: key, menus: [] };
  }

  const targetOrgId = (organizationId && String(organizationId).trim() !== '') ? organizationId : null;

  const industry = await industryModel.findByCode(code);
  if (!industry || industry.isActive === false) {
    return { industryCode: code, roleKey: key, menus: [] };
  }

  const RoleModel = mongoose.model('Role');
  let role = null;
  if (targetOrgId) {
    role = await RoleModel.findOne({
      $or: [
        { organization_id: targetOrgId },
        { organizationId: targetOrgId }
      ],
      industry_id: industry._id,
      key: key
    }).exec();
  }

  if (!role) {
    role = await RoleModel.findOne({
      organization_id: null,
      industry_id: industry._id,
      key: key
    }).exec();
  }

  if (!role || role.is_active === false) {
    return {
      industryId: String(industry._id),
      industryCode: code,
      roleKey: key,
      menus: [],
    };
  }

  const SidebarPermissionModel = mongoose.model('SidebarPermission');
  let perms = [];
  if (targetOrgId) {
    perms = await SidebarPermissionModel.find({
      organization_id: targetOrgId,
      role_id: role._id,
      industry_id: industry._id,
      is_visible: true
    }).lean().exec();
  }

  if (!perms.length) {
    perms = await SidebarPermissionModel.find({
      organization_id: null,
      role_id: role._id,
      industry_id: industry._id,
      is_visible: true
    }).lean().exec();
  }

  if (!perms.length) {
    return {
      industryId: String(industry._id),
      industry_code: code,
      role: key,
      menus: [],
    };
  }

  const SidebarMenuModel = mongoose.model('SidebarMenu');
  let menus = await SidebarMenuModel.find({
    $or: [
      { organization_id: targetOrgId },
      { organization_id: null }
    ],
    _id: { $in: perms.map((p) => p.menu_id) }
  }).lean().exec();

  const menuById = new Map(
    menus.filter((m) => m.is_active !== false).map((m) => [String(m._id), m]),
  );

  const includedIds = new Set([...menuById.keys()]);
  const parentIdsToFetch = [];
  for (const m of menuById.values()) {
    const pId = m.parent_id;
    if (pId && !includedIds.has(String(pId))) {
      parentIdsToFetch.push(pId);
      includedIds.add(String(pId));
    }
  }
  if (parentIdsToFetch.length) {
    const parents = await SidebarMenuModel.find({
      $or: [
        { organization_id: organizationId },
        { organization_id: null }
      ],
      _id: { $in: parentIdsToFetch }
    }).lean().exec();
    for (const p of parents) {
      if (p.is_active !== false) menuById.set(String(p._id), p);
    }
  }

  const permByMenu = new Map(perms.map((p) => [String(p.menu_id), p]));

  const rawItems = [...menuById.values()]
    .map((m) => {
      const perm = permByMenu.get(String(m._id));
      const orderOverride = perm ? perm.order_override : undefined;
      const order =
        typeof orderOverride === 'number'
          ? orderOverride
          : typeof m.order === 'number'
            ? m.order
            : 0;
      return {
        _id: String(m._id),
        key: m.key,
        name: m.name,
        icon: m.icon || '',
        route: m.route || '',
        parent_id: m.parent_id ? String(m.parent_id) : null,
        parentId: m.parent_id ? String(m.parent_id) : null,
        order,
        module: m.module || '',
        organization_id: m.organization_id || null
      };
    })
    .sort((a, b) => a.order - b.order);

  // Deduplicate by menu key to guarantee zero duplicate sidebar items
  const itemsMap = new Map();
  for (const item of rawItems) {
    if (item.key === 'configuration.analyticsConfig' && rawItems.some((i) => i.key === 'analytics.config')) {
      continue;
    }
    if (item.key === 'account.subscriptionDetails' && rawItems.some((i) => i.key === 'account.subscription')) {
      continue;
    }

    const existing = itemsMap.get(item.key);
    if (!existing) {
      itemsMap.set(item.key, item);
    } else if (item.organization_id && !existing.organization_id) {
      itemsMap.set(item.key, item);
    }
  }

  const items = Array.from(itemsMap.values());

  return {
    industryId: String(industry._id),
    industryCode: code,
    industry_code: code,
    roleKey: key,
    role: key,
    menus: items,
  };
}

exports.resolveSidebar = resolveSidebar;

// ── Legacy compatibility helpers ─────────────────────────────────────────────

/**
 * Legacy: returns the list of menus for (industry_code, role_key) in the same
 * flat shape the existing frontend expects from POST /sidebar/user.
 */
exports.getRoleMenus = async (industry_code, role_key, organizationId) => {
  if (!industry_code || !role_key) {
    const err = new Error('industryId and role are required');
    err.status = 400;
    throw err;
  }
  const result = await resolveSidebar({ industry_code, role_key, organizationId });
  return result.menus;
};

/**
 * Legacy: returns full sidebar grouped by role for an industry, mimicking
 * the old sidebar_configs document shape.
 */
exports.getByIndustry = async (industry_code) => {
  if (!industry_code) {
    const err = new Error('industryId is required');
    err.status = 400;
    throw err;
  }
  const industry = await industryModel.findByCode(industry_code);
  if (!industry) return null;

  const [roles, menus, perms] = await Promise.all([
    roleModel.list({ industryId: industry._id }),
    menuModel.list(),
    permModel.list({ industryId: industry._id, visibleOnly: true }),
  ]);

  const menuById = new Map(menus.map((m) => [String(m._id), m]));
  const rolesObj = {};
  for (const r of roles) rolesObj[r.key] = [];

  const grouped = new Map();
  for (const p of perms) {
    const key = String(p.roleId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(p);
  }

  for (const r of roles) {
    const list = grouped.get(String(r._id)) || [];
    list.sort((a, b) => {
      const aMenu = menuById.get(String(a.menuId || a.menu_id));
      const bMenu = menuById.get(String(b.menuId || b.menu_id));
      const aOrd = a.orderOverride !== undefined ? a.orderOverride : a.order_override;
      const bOrd = b.orderOverride !== undefined ? b.orderOverride : b.order_override;
      const aOrder =
        typeof aOrd === 'number'
          ? aOrd
          : aMenu?.order ?? 0;
      const bOrder =
        typeof bOrd === 'number'
          ? bOrd
          : bMenu?.order ?? 0;
      return aOrder - bOrder;
    });
    rolesObj[r.key] = list
      .map((p) => menuById.get(String(p.menuId || p.menu_id)))
      .filter((m) => m && m.isActive !== false)
      .map((m) => ({
        key: m.key,
        name: m.name,
        route: m.route || '',
        icon: m.icon || '',
        module: m.module || '',
      }));
  }

  return {
    industryId: industry.code,
    is_ready_to_launch: !!industry.isActive,
    roles: rolesObj,
  };
};

/**
 * Legacy upsert — accepts {industryId (= code), role, menus[]} and writes
 * to the new normalized tables. Used by the old SidebarConfig page until it
 * migrates to the new permission-matrix UI.
 */
exports.upsertRole = async ({ industryId, role, menus }) => {
  if (!industryId || !role) {
    const err = new Error('industryId and role are required');
    err.status = 400;
    throw err;
  }
  const arr = Array.isArray(menus) ? menus : [];

  // upsert industry by code
  let industry = await industryModel.findByCode(industryId);
  if (!industry) {
    industry = await industryModel.create({
      code: industryId,
      name: industryId,
    });
  }

  // upsert role within that industry
  let roleDoc = await roleModel.findByIndustryAndKey(industry._id, role);
  if (!roleDoc) {
    roleDoc = await roleModel.create({
      industryId: industry._id,
      key: role,
      name: role,
    });
  }

  // upsert menus (master catalog) and collect ids
  const menuIds = [];
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!m || !m.key || !m.name) continue;
    const isChild = String(m.key).includes('.');
    const moduleKey = (m.module || (isChild ? m.key.split('.')[0] : m.key)).toLowerCase();

    let parentId = null;
    if (isChild) {
      const parent = await menuModel.upsertByKey(moduleKey, {
        name: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1),
        icon: moduleKey,
        module: moduleKey,
      });
      parentId = parent._id;
    }

    const menu = await menuModel.upsertByKey(m.key, {
      name: m.name,
      icon: m.icon || '',
      route: m.route || '',
      parent_id: parentId,
      module: moduleKey,
      order: i,
    });
    menuIds.push(menu._id);
  }

  // bulk-set permissions for this role+industry
  await permModel.bulkSetForRoleIndustry({
    roleId: roleDoc._id,
    industryId: industry._id,
    menu_ids: menuIds,
  });

  // return legacy-shaped doc
  const full = await exports.getByIndustry(industry.code);
  return {
    industryId: industry.code,
    roles: full?.roles || {},
    is_ready_to_launch: !!industry.isActive,
    created: false,
    fullDocument: full,
  };
};
