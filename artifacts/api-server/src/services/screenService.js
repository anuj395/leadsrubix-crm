const screenModel = require('../models/screenModel');
const fieldModel = require('../models/screenFieldModel');
const permissionModel = require('../models/screenPermissionModel');

const SCREEN_TRANSLATIONS = {
  temp0002: {
    contacts: { name: 'Customers', description: 'Customer Contact List' },
    interested: { name: 'Interested Buyer Details', description: 'Dynamic form fields shown when converting a customer to Interested' },
    leadDistribution: { name: 'Order Routing', description: 'Dynamic table headers & form fields configuration for Order Distribution' },
    leadRotation: { name: 'Order Reassignment', description: 'Dynamic table headers & form fields configuration for Order Reassignment' },
    resourceLeadSources: { name: 'Sales Channels', description: 'Marketing source channels for customer inquiries' },
    lost: { name: 'Abandoned Cart Details', description: 'Dynamic form fields shown when order is marked as Abandoned' },
    notInterested: { name: 'Refused Buyer Details', description: 'Dynamic form fields shown when buyer is marked as Refused' },
    configProjects: { name: 'Product Catalog', description: 'Catalog of product catalog items and details.' },
    tasks: { name: 'Customer Follow-ups', description: 'Customer follow-up tasks' }
  },
  temp0003: {
    contacts: { name: 'Patients', description: 'Patient Contact List' },
    interested: { name: 'Interested Patient Details', description: 'Dynamic form fields shown when converting a patient to Interested' },
    leadDistribution: { name: 'Patient Triaging', description: 'Dynamic table headers & form fields configuration for Patient Triaging' },
    leadRotation: { name: 'Patient Transfers', description: 'Dynamic table headers & form fields configuration for Patient Transfers' },
    resourceLeadSources: { name: 'Patient Sources', description: 'Marketing source channels for patient inquiries' },
    lost: { name: 'Not Converted Patient Details', description: 'Dynamic form fields shown when patient status is set to Not Converted' },
    notInterested: { name: 'Not Interested Patient Details', description: 'Dynamic form fields shown when patient is marked as Not Interested' },
    configProjects: { name: 'Clinical Specialties', description: 'Catalog of medical and clinical specialties.' },
    tasks: { name: 'Consultations', description: 'Patient consultation / follow-up tasks' }
  },
  temp0004: {
    contacts: { name: 'Students', description: 'Student Contact List' },
    interested: { name: 'Interested Applicant Details', description: 'Dynamic form fields shown when converting a lead to Interested' },
    leadDistribution: { name: 'Applicant Distribution', description: 'Dynamic table headers & form fields configuration for Applicant Routing' },
    leadRotation: { name: 'Applicant Transfers', description: 'Dynamic table headers & form fields configuration for Counselor Transfers' },
    resourceLeadSources: { name: 'Inquiry Sources', description: 'Marketing source channels for student inquiries' },
    lost: { name: 'Withdrawn Details', description: 'Dynamic form fields shown when applicant is marked as Withdrawn' },
    notInterested: { name: 'Not Interested Student Details', description: 'Dynamic form fields shown when student is marked as Not Interested' },
    configProjects: { name: 'Course Catalog', description: 'Catalog of academic courses and programs.' },
    tasks: { name: 'Counseling Tasks', description: 'Student counseling / follow-up tasks' }
  },
  temp0005: {
    contacts: { name: 'Investors', description: 'Investors List' },
    interested: { name: 'Interested Investor Details', description: 'Dynamic form fields shown when converting a client to Interested' },
    leadDistribution: { name: 'Client Matching', description: 'Dynamic table headers & form fields configuration for Client Matching' },
    leadRotation: { name: 'Advisor Reassignments', description: 'Dynamic table headers & form fields configuration for Advisor Reassignments' },
    resourceLeadSources: { name: 'Lead Sources', description: 'Marketing source channels for investor inquiries' },
    lost: { name: 'Not Converted Investor Details', description: 'Dynamic form fields shown when client is marked as Not Converted' },
    notInterested: { name: 'Not Interested Investor Details', description: 'Dynamic form fields shown when client is marked as Not Interested' },
    configProjects: { name: 'Financial Portfolios', description: 'Catalog of financial portfolios and products.' },
    tasks: { name: 'KYC & Advisory Tasks', description: 'KYC and advisory follow-up tasks' }
  },
  temp0006: {
    contacts: { name: 'Accounts', description: 'Accounts List' },
    interested: { name: 'Interested Account Details', description: 'Dynamic form fields shown when converting a lead to Interested' },
    leadDistribution: { name: 'Ticket Routing', description: 'Dynamic table headers & form fields configuration for Ticket Routing' },
    leadRotation: { name: 'Ticket Reassignments', description: 'Dynamic table headers & form fields configuration for Ticket Reassignments' },
    resourceLeadSources: { name: 'Lead Sources', description: 'Marketing source channels for account inquiries' },
    lost: { name: 'Not Converted Account Details', description: 'Dynamic form fields shown when account is marked as Not Converted' },
    notInterested: { name: 'Not Interested Account Details', description: 'Dynamic form fields shown when account is marked as Not Interested' },
    configProjects: { name: 'SOW Contracts', description: 'Catalog of SOW contracts and technical service lines.' },
    tasks: { name: 'Service Desk Tasks', description: 'Service desk and support follow-up tasks' }
  },
  temp0007: {
    contacts: { name: 'Dealers', description: 'Dealers List' },
    interested: { name: 'Interested Dealer Details', description: 'Dynamic form fields shown when converting a lead to Interested' },
    leadDistribution: { name: 'Dealer Allocations', description: 'Dynamic table headers & form fields configuration for Dealer Allocations' },
    leadRotation: { name: 'Dealer Reallocations', description: 'Dynamic table headers & form fields configuration for Dealer Reallocations' },
    resourceLeadSources: { name: 'Lead Sources', description: 'Marketing source channels for dealer inquiries' },
    lost: { name: 'Not Converted Dealer Details', description: 'Dynamic form fields shown when dealer is marked as Not Converted' },
    notInterested: { name: 'Not Interested Dealer Details', description: 'Dynamic form fields shown when dealer is marked as Not Interested' },
    configProjects: { name: 'Production Runs', description: 'Catalog of production runs and categories.' },
    tasks: { name: 'Quality Checks', description: 'Quality checks and logistics follow-up tasks' }
  }
};

exports.translateScreen = (s, indCode) => {
  if (!s || !indCode) return s;
  const sObj = s.toObject ? s.toObject() : s;
  const sKey = sObj.key;
  const dict = SCREEN_TRANSLATIONS[String(indCode).toLowerCase().trim()] || {};
  if (dict[sKey]) {
    return {
      ...sObj,
      name: dict[sKey].name,
      description: dict[sKey].description
    };
  }
  return sObj;
};

exports.list = async (opts) => {
  const screens = await screenModel.list(opts);
  if (!opts || !opts.industryCode) return screens;

  const mongoose = require('mongoose');
  const Industry = mongoose.model('Industry');
  let industry = null;
  const indCodeOrId = opts.industryCode;
  if (mongoose.Types.ObjectId.isValid(indCodeOrId)) {
    industry = await Industry.findById(indCodeOrId).lean().exec();
  } else {
    industry = await Industry.findOne({ code: indCodeOrId }).lean().exec();
  }
  const indCode = String(industry?.code || '').toLowerCase().trim();

  const ALL_INDUSTRY_SCREENS = {
    temp0001: ['resourcePropertyStages', 'resourcePropertySubTypes', 'resourcePropertyTypes', 'resourceBudgets']
  };

  const excludes = [];
  Object.keys(ALL_INDUSTRY_SCREENS).forEach((key) => {
    if (key !== indCode) {
      excludes.push(...ALL_INDUSTRY_SCREENS[key]);
    }
  });

  const filtered = screens.filter((s) => {
    const sObj = s.toObject ? s.toObject() : s;
    const sKey = sObj.key;
    return !excludes.includes(sKey);
  });

  return filtered.map((s) => exports.translateScreen(s, indCode));
};

exports.get = async (id, authedUser) => {
  const doc = await screenModel.findById(id);
  if (!doc) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }
  if (authedUser) {
    const mongoose = require('mongoose');
    const Industry = mongoose.model('Industry');
    const indId = authedUser.industryId || authedUser.industry_id;
    let industry = null;
    if (mongoose.Types.ObjectId.isValid(indId)) {
      industry = await Industry.findById(indId).lean().exec();
    } else {
      industry = await Industry.findOne({ code: indId }).lean().exec();
    }
    return exports.translateScreen(doc, industry?.code);
  }
  return doc;
};

exports.create = async (payload, authedUser) => {
  if (!payload?.key || !payload?.name) {
    const err = new Error('key and name are required');
    err.status = 400;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  let orgId = payload.organizationId || payload.organization_id;
  let wsId = payload.workspaceId || payload.workspace_id;
  let indId = payload.industryId || payload.industry_id;

  const mongoose = require('mongoose');
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    if (!userOrgId) {
      const err = new Error('Forbidden: You must belong to an organization to create screens');
      err.status = 403;
      throw err;
    }
    orgId = userOrgId;
    wsId = authedUser?.workspaceId || authedUser?.workspace_id;
    indId = authedUser?.industryId || authedUser?.industry_id;
  } else if (orgId) {
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({
      $or: [{ organization_id: orgId }, { organizationId: orgId }]
    }).lean().exec();
    if (org) {
      wsId = 'ws_' + orgId;
      indId = org.industryId || org.industry_id;
    }
  }

  const dup = await screenModel.findByKey(payload.key, orgId || undefined);
  if (dup && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
    const err = new Error('Screen with this key already exists');
    err.status = 409;
    throw err;
  }

  return screenModel.create({
    ...payload,
    organization_id: orgId || null,
    workspace_id: wsId || null,
    industry_id: indId || null
  });
};

exports.update = async (id, patch, authedUser) => {
  const current = await screenModel.findById(id);
  if (!current) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const screenOrgId = current.organization_id || current.organizationId;
    if (!userOrgId || String(screenOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only update screens belonging to your organization');
      err.status = 403;
      throw err;
    }
    if (patch.organizationId) delete patch.organizationId;
    if (patch.organization_id) delete patch.organization_id;
  }

  if (patch?.key) {
    const orgId = current.organization_id || current.organizationId || null;
    const dup = await screenModel.findByKey(patch.key, orgId || undefined);
    if (dup && String(dup._id) !== String(id) && String(dup.organization_id || dup.organizationId || '') === String(orgId || '')) {
      const err = new Error('Screen with this key already exists');
      err.status = 409;
      throw err;
    }
  }

  const doc = await screenModel.update(id, patch || {});
  if (!doc) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }
  return doc;
};

// Cascade: deleting a screen wipes all of its fields and any permission rows
// referencing the screen (which transitively covers the deleted fields).
exports.remove = async (id, authedUser) => {
  const doc = await screenModel.findById(id);
  if (!doc) {
    const err = new Error('Screen not found');
    err.status = 404;
    throw err;
  }

  const isSuperAdmin = authedUser?.role === 'superAdmin';
  if (!isSuperAdmin) {
    const userOrgId = authedUser?.organizationId || authedUser?.organization_id;
    const screenOrgId = doc.organization_id || doc.organizationId;
    if (!userOrgId || String(screenOrgId) !== String(userOrgId)) {
      const err = new Error('Forbidden: You can only delete screens belonging to your organization');
      err.status = 403;
      throw err;
    }
  }

  await permissionModel.removeByScreen(id);
  await fieldModel.removeByScreen(id);
  try {
    const roleActionPermissionModel = require('../models/roleActionPermissionModel');
    if (typeof roleActionPermissionModel.removeByScreen === 'function') {
      await roleActionPermissionModel.removeByScreen(id);
    }
  } catch { /* model not loaded — nothing to cascade */ }

  try {
    const sidebarMenuModel = require('../models/sidebarMenuModel');
    const sidebarPermissionModel = require('../models/sidebarPermissionModel');
    const orgId = doc.organization_id || doc.organizationId || null;
    
    const matchingMenus = await sidebarMenuModel.SidebarMenu.find({
      key: doc.key,
      organization_id: orgId
    }).exec();

    for (const menu of matchingMenus) {
      await sidebarPermissionModel.removeByMenu(menu._id);
      await sidebarMenuModel.SidebarMenu.updateMany(
        { parent_id: menu._id },
        { $set: { parent_id: null } }
      ).exec();
      await sidebarMenuModel.remove(menu._id);
    }
  } catch (err) {
    console.error('Error cascading sidebar menu cleanup on screen deletion:', err);
  }

  await screenModel.remove(id);
  return doc;
};
